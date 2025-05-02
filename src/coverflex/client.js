// src/coverflex/client.js
const fetch = require('node-fetch');

class CoverflexClient {
  constructor({ username, password, userAgentToken }) {
    this.username = username;
    this.password = password;
    this.userAgentToken = userAgentToken;
  }

  async authenticate() {
    const res = await fetch('https://menhir-api.coverflex.com/api/employee/sessions', {
      method: 'POST',
      body: JSON.stringify({
        email: this.username,
        password: this.password,
        user_agent_token: this.userAgentToken
      }),
      headers: { 'Content-type': 'application/json' }
    });
    const data = await res.json();
    if (!data.token) throw new Error('Coverflex authentication failed');
    return data.token;
  }

  async getAllTransactions(token, accountId) {
    const res = await fetch(
      `https://menhir-api.coverflex.com/api/employee/movements?pocket_id=${accountId}&pagination=no`,
      {
        headers: { 'Authorization': 'Bearer ' + token }
      }
    );
    const data = await res.json();
    return data?.movements?.list || [];
  }

  async getTransactions(accountId, importFrom) {
    const token = await this.authenticate();
    const allTxs = await this.getAllTransactions(token, accountId);
    return allTxs
      .filter(tx => tx.executed_at.split('T')[0] >= importFrom)
      .map(tx => {
        let amt = tx.amount.amount;
        if (tx.is_debit) amt *= -1;
        // Standardize description
        let description = tx.description;
        if (
          typeof tx.description === 'string' &&
          tx.description.toUpperCase().includes('COVERFLEX TOPUP')
        ) {
          description = 'COVERFLEX TOPUP';
        }
        return {
          date: tx.executed_at.split("T")[0],
          amount: amt,
          notes: description,
          payee_name: tx.merchant_name,
          imported_payee: tx.merchant_name,
          imported_id: tx.id,
          cleared: tx.status === "confirmed"
        }
      });
  }
}

module.exports = CoverflexClient;