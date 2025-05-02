// src/ticketrestaurant/client.js

const fetch = require('node-fetch');
const crypto = require('crypto');
const { URLSearchParams } = require('url');
const { JSDOM } = require('jsdom');

class TicketRestaurantClient {
  constructor({ cardNumber, password }) {
    this.cardNumber = cardNumber;
    this.password = password;
    this.cookies = '';
  }

  /**
   * Fetch function with current session cookies
   */
  async fetchWithCookies(url, opts = {}) {
    let headers = { ...(opts.headers || {}) };
    if (this.cookies) {
      headers['Cookie'] = this.cookies;
    }
    const res = await fetch(url, { ...opts, headers });
    // Save cookies if present
    if (res.headers.raw()['set-cookie']) {
      // Accumulate session cookies for future requests
      this.cookies = res.headers
        .raw()['set-cookie']
        .map(entry => entry.split(';')[0])
        .join('; ');
    }
    return res;
  }

  /**
   * POST to login endpoint and save session cookie
   */
  async login() {
    const url = 'https://hbcartaoticket.unicre.pt/';
    // The login page expects POST to "/" with form params in body:
    // User=4442267004868496&Password=0000000
    const bodyData = new URLSearchParams({
      'User': this.cardNumber,
      'Password': this.password,
    }).toString();
    const res = await fetch(url, {
      method: 'POST',
      body: bodyData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; TicketRestaurantBot/1.0)'
      },
      redirect: 'manual'
    });
    // saves the ASP.NET session cookie
    if (!res.headers.get('set-cookie')) {
      throw new Error('Login failed: no session cookie set');
    }
    this.cookies = res.headers
      .raw()['set-cookie']
      .map(entry => entry.split(';')[0])
      .join('; ');
    if (!this.cookies.includes('ASP.NET_SessionId')) {
      throw new Error('Login failed: missing ASP.NET_SessionId');
    }
    // Optional: verify login was successful e.g. by status code or Location header
    if (res.status >= 300 && res.status < 400 && res.headers.get('location') === '/HomePrivate/Index') {
      // Successful login: will redirect to dashboard.
      return true;
    } else if (res.status === 200) {
      throw new Error('Login failed: invalid credentials.');
    }
    // Else assume ok.
    return true;
  }

  /**
   * Fetch the HTML for transactions
   */
  async fetchTransactionsPage(dateFrom, dateTo) {
    // Needs an authenticated session (cookie set)
    const url = `https://hbcartaoticket.unicre.pt/HomePrivate/PartialTransactionsList?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const res = await this.fetchWithCookies(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TicketRestaurantBot/1.0)',
        'Accept': 'text/html'
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to retrieve transaction list (${res.status})`);
    }
    const html = await res.text();
    return html;
  }

  /**
   * Convert DD/MM/YYYY to YYYY-MM-DD
   */
  _convertDateFormat(dateStr) {
    // Accepts DD/MM/YYYY or DD-MM-YYYY
    if (!dateStr) return "";
    const match = dateStr.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (!match) return dateStr;
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  /**
   * Parse HTML content into transactions
   */
  parseTransactions(html) {
    // Use jsdom to parse HTML (as Node.js has no DOM)
    const dom = new JSDOM(html);
    const { document } = dom.window;
    const rows = document.querySelectorAll("div.row.table-content");
    const txs = [];

    for (const row of rows) {
      const columns = row.querySelectorAll('div');
      if (columns.length < 4) continue;

      // --- Date ---
      const dateLabel = columns[0].querySelector('label[date]');
      // --- Description ---
      const descLabel = columns[1].querySelector('label');
      // --- Credit (deposit, colorBlue/amount, might be "-") ---
      // Use .amount or .colorBlue; label[amount]
      let creditLabel = columns[2].querySelector('label.amount, label.colorBlue, label[amount]');
      // --- Debit (spending, colorRed, might be "-") ---
      let debitLabel = columns[3].querySelector('label.colorRed');

      // Defensive fallback to get text even if classnames are not exact
      if (!creditLabel) creditLabel = columns[2].querySelector('label');
      if (!debitLabel) debitLabel = columns[3].querySelector('label');

      if (!dateLabel || !descLabel) continue;

      let originalDate = dateLabel.textContent.trim(); // raw, like "27/04/2025" or "27-04-2025"
      let date = this._convertDateFormat(originalDate);

      let description = descLabel.textContent.replace(/\s+/g, ' ').trim();

      // Both amounts could be "-" (meaning not used for this row)
      let creditText = creditLabel ? creditLabel.textContent.trim() : "";
      let debitText  = debitLabel  ? debitLabel.textContent.trim()  : "";

      // If both are "-" or empty, skip
      if ((creditText === "-" || !creditText) && (debitText === "-" || !debitText)) {
        continue;
      }

      let type = null; // 'deposit' or 'debit'
      let amount = 0;

      // The logic:
      // If creditText (colorBlue) is not "-", it's a deposit/topup (credit)
      // Else if debitText (colorRed) is not "-", it's a spending (debit)
      // Only one side should have value per row
      if (creditText && creditText !== "-") {
        type = "deposit";
        amount = creditText;
      } else if (debitText && debitText !== "-") {
        type = "debit";
        amount = debitText;
      } else {
        continue; // Defensive
      }

      // Parse "NN,NN €" → amount in cents (int)
      amount = String(amount).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
      let amountNum = Number(amount);

      // Safety: some sites write "-173,20 €" as deposit: if negative, treat as negative even if credit
      if (Number.isNaN(amountNum)) continue;
      let amountCents = Math.round(Math.abs(amountNum * 100));
      if (type === "debit" || (type === "deposit" && amountNum < 0)) amountCents = -amountCents;

      // Build stable imported_id
      const hashInput = `${date}|${description}|${amountCents}`;
      const imported_id = crypto.createHash('sha256').update(hashInput).digest('hex');

      txs.push({
        date,
        amount: amountCents,
        notes: description,
        imported_payee: description,
        payee_name: description,
        imported_id,
        cleared: true
      });
    }
    return txs;
  }

  /**
   * Top-level main retriever.
   * @param {string} importFrom "YYYY-MM-DD"
   * @param {string} importTo "YYYY-MM-DD" (optional, default today)
   */
  async getTransactions(importFrom, importTo) {
    if (!importTo) importTo = (new Date()).toISOString().slice(0, 10);
    await this.login();
    const html = await this.fetchTransactionsPage(importFrom, importTo);
    const txs = this.parseTransactions(html);

    // Defensive: filter by date range
    // (as dates in the system are always YYYY-MM-DD, after normalization)
    return txs.filter(tx => {
      return (!importFrom || tx.date >= importFrom) &&
             (!importTo || tx.date <= importTo);
    });
  }
}

module.exports = TicketRestaurantClient;