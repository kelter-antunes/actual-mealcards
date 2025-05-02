// index-cron.js
const startCron = require('./src/cron/job');
const logger = require('./src/logger');

(async () => {
  try {
    await startCron();
  } catch (err) {
    logger.error('Cron process terminated unexpectedly:', err.message);
    if (process.env.DEBUG && err.stack) logger.debug(err.stack);
    process.exit(1);
  }
})();