// src/actual/index.js
const actual = require('@actual-app/api');
const fs = require('fs').promises;
const path = require('path');

async function initializeActual(config, conf) {
  const tmpDir = path.join('./temp_data_actual', conf.get('user'));
  await fs.mkdir(tmpDir, { recursive: true });
  await actual.init({
    serverURL: config.actual.serverUrl,
    password: config.actual.serverPassword,
    dataDir: tmpDir
  });
  let fileOpts = {};
  if (config.actual.filePassword) fileOpts.password = config.actual.filePassword;
  await actual.downloadBudget(conf.get('budget_id'), fileOpts);
  return actual;
}

async function importTransactions(actualInstance, accountId, txs) {
  const ret = await actualInstance.importTransactions(accountId, txs);
  return ret;
}

async function finalize(actualInstance) {
  await actualInstance.sync();
  await actualInstance.shutdown();
}

module.exports = { initializeActual, importTransactions, finalize };