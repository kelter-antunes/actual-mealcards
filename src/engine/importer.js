// src/engine/importer.js
const { initializeActual, importTransactions, finalize } = require('../actual/index');
const logger = require('../logger');

async function importProviderTransactions({ config, providerLabel, providerServiceFactory, conf }) {
  let actual;
  try {
    actual = await initializeActual(config, conf);
  } catch (e) {
    logger.error(`Failed to initialize Actual: ${e.message}`);
    if (process.env.DEBUG && e.stack) logger.debug(e.stack);
    throw e;
  }
  const service = providerServiceFactory(config);
  const mapping = config[providerLabel].accounts;

  for (const [providerAccount, actualAccount] of Object.entries(mapping)) {
    logger.info(logger.highlight(`Importing ${providerLabel} transactions for account: ${providerAccount}`));
    try {
      const txs = await service.fetchAccountTransactions(providerAccount);
      if (txs.length === 0) {
        logger.warn('No imported transactions.');
        continue;
      }
      await importTransactions(actual, actualAccount, txs);
      logger.success(`Imported ${txs.length} transactions.`);
    } catch (e) {
      logger.error(e.message);
      if (process.env.DEBUG && e.stack) logger.debug(e.stack);
      // On any error, shutdown actual and throw up
      if (actual) await finalize(actual).catch(() => {});
      throw e;
    }
  }
  await finalize(actual);
}

module.exports = { importProviderTransactions };