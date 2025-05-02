#!/usr/bin/env node

// index.js
const runCli = require('./src/cli/index');
const logger = require('./src/logger');

(async () => {
  try {
    await runCli();
  } catch (err) {
    logger.error(err.message);
    if (process.env.DEBUG && err.stack) logger.debug(err.stack);
    process.exit(1);
  }
})();