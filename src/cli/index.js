// src/cli/index.js
const meow = require('meow');
const { getConfig, getUserConf, ConfigError } = require('../config');
const { importProviderTransactions } = require('../engine/importer');
const EdenredService = require('../edenred/service');
const CoverflexService = require('../coverflex/service');
const TicketRestaurantService = require('../ticketrestaurant/service');
const logger = require('../logger');

const cli = meow(
  `
Usage
  $ mealcards <command> <flags>

Commands & Options
  import-myedenred    Sync MyEdenred accounts to Actual Budget
  import-coverflex    Sync Coverflex accounts to Actual Budget
  import-ticketrestaurant   Sync TicketRestaurant/UNiCRE accounts to Actual Budget
  config              Print the location of config file

Examples
  $ mealcards import-myedenred
`,
  { flags: { user: { type: 'string' } } }
);

async function run() {
  try {
    const command = cli.input[0];
    if (!command) {
      logger.warn('Try "mealcards --help"');
      process.exit();
    }

    const config = getConfig();
    const conf = getUserConf(cli.flags.user || "default", config);

    if (command === "config") {
      logger.info(`Config for this app is located at: ${conf.path}`);
      process.exit();
    } else if (command === "import-myedenred") {
      logger.info(logger.highlight("Importing MyEdenred..."));
      try {
        await importProviderTransactions({
          config, providerLabel: "ed", providerServiceFactory: EdenredService, conf
        });
        logger.success('MyEdenred import finished.');
      } catch (err) {
        logger.error('Error importing MyEdenred:', err.message);
        if (process.env.DEBUG && err.stack) logger.debug(err.stack);
        process.exit(1); // stop immediately
      }
    } else if (command === "import-coverflex") {
      logger.info(logger.highlight("Importing Coverflex..."));
      try {
        await importProviderTransactions({
          config, providerLabel: "cf", providerServiceFactory: CoverflexService, conf
        });
        logger.success('Coverflex import finished.');
      } catch (err) {
        logger.error('Error importing Coverflex:', err.message);
        if (process.env.DEBUG && err.stack) logger.debug(err.stack);
        process.exit(1); // stop immediately
      }
    } else if (command === "import-ticketrestaurant") {
      logger.info(logger.highlight("Importing TicketRestaurant..."));
      try {
        await importProviderTransactions({
          config, providerLabel: "tr", providerServiceFactory: TicketRestaurantService, conf
        });
        logger.success('TicketRestaurant import finished.');
      } catch (err) {
        logger.error('Error importing TicketRestaurant:', err.message);
        if (process.env.DEBUG && err.stack) logger.debug(err.stack);
        process.exit(1); // stop immediately
      }
    } else {
      logger.warn('Unknown command');
    }
    process.exit();
  } catch (err) {
    if (err instanceof ConfigError) {
      logger.error(logger.highlight('Configuration Problem!'));
      logger.error(err.message);
      logger.warn('Check your .env file or environment variables.');
      process.exit(1);
    }
    throw err;
  }
}

module.exports = run;