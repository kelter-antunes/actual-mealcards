// src/edenred/client.js
const fetch = require('node-fetch'); // Ensure node-fetch ^2 if <18
const crypto = require('crypto');

class EdenredClient {
  constructor({ username, pin, version }) {
    this.username = username;
    this.pin = pin;
    this.version = version || '4.1.0';
  }
  async authenticate() {
    const res = await fetch(
      `https://www.myedenred.pt/edenred-customer/v2/authenticate/pin?appVersion=${this.version}&appType=IOS&channel=MOBILE`,
      {
        method: 'POST',
        body: JSON.stringify({
          userId: this.username,
          password: this.pin,
          appType: "IOS",
          appVersion: this.version
        }),
        headers: {
          'Content-type': 'application/json',
          'User-Agent': 'EdenRED/3748 CFNetwork/1496.0.7 Darwin/23.5.0'
        }
      });
    const data = await res.json();
    if (!data?.data?.token) throw new Error(data?.message || 'Edenred auth failed');
    return data.data.token;
  }

  async getAllTransactions(token, accountId) {
    const url = `https://www.myedenred.pt/edenred-customer/v2/protected/card/${accountId}/accountmovement?appVersion=1.0&appType=PORTAL&channel=WEB`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': token }
    });
    const json = await res.json();
    if (!json?.data?.movementList) return [];
    return json.data.movementList;
  }

  async getTransactions(accountId, importFrom) {
    const token = await this.authenticate();
    const allTxs = await this.getAllTransactions(token, accountId);
    return allTxs
      .filter(tx => tx.transactionDate?.split('T')[0] >= importFrom)
      .map(tx => ({
        date: tx.transactionDate.split('T')[0],
        amount: Math.trunc(tx.amount * 100),
        payee_name: tx.transactionName,
        imported_payee: tx.transactionName,
        imported_id: crypto.createHash('sha256').update(`${tx.transactionName}${tx.transactionDate}${tx.amount}`).digest('hex'),
        cleared: true
      }));
  }
}

module.exports = EdenredClient;