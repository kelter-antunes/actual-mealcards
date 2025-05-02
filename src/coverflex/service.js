// src/coverflex/service.js
const CoverflexClient = require('./client');

function CoverflexService(config) {
  const client = new CoverflexClient({
    username: config.cf.username,
    password: config.cf.password,
    userAgentToken: config.cf.userAgentToken
  });

  return {
    async fetchAccountTransactions(accountId) {
      return await client.getTransactions(accountId, config.cf.importFrom);
    }
  }
}

module.exports = CoverflexService;