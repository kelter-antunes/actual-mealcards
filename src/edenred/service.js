// src/edenred/service.js
const EdenredClient = require('./client');

function EdenredService(config) {
  const client = new EdenredClient({
    username: config.ed.username,
    pin: config.ed.pin,
    version: config.ed.version
  });

  return {
    async fetchAccountTransactions(accountId) {
      return await client.getTransactions(accountId, config.ed.importFrom);
    }
  }
}

module.exports = EdenredService;