// src/cron/job.js
const cron = require('node-cron');
const parser = require('cron-parser');
const { getConfig, getUserConf } = require('../config');
const { importProviderTransactions } = require('../engine/importer');
const EdenredService = require('../edenred/service');
const CoverflexService = require('../coverflex/service');
const TicketRestaurantService = require('../ticketrestaurant/service');
const logger = require('../logger');

async function start() {
  const config = getConfig();
  const conf = getUserConf('default', config);

  const cronExp = config.cron;
  const interval = parser.parseExpression(cronExp);
  logger.log('Defined cron is:', cronExp);
  logger.log('Next run:', interval.next().toISOString());

  cron.schedule(cronExp, async () => {
    if (config.ed.enabled) {
      logger.log('Importing My Edenred');
      try {
        await importProviderTransactions({
          config,
          providerLabel: 'ed',
          providerServiceFactory: EdenredService,
          conf
        });
      } catch (e) {
        logger.error(e);
      }
    }
    if (config.cf.enabled) {
      logger.log('Importing Coverflex');
      try {
        await importProviderTransactions({
          config,
          providerLabel: 'cf',
          providerServiceFactory: CoverflexService,
          conf
        });
      } catch (e) {
        logger.error(e);
      }
    }
    if (config.tr && config.tr.enabled) {
      logger.log('Importing TicketRestaurant');
      try {
        await importProviderTransactions({
          config,
          providerLabel: 'tr',
          providerServiceFactory: TicketRestaurantService,
          conf
        });
      } catch (e) {
        logger.error(e);
      }
    }
    logger.log('Next run:', interval.next().toISOString());
  });
}

module.exports = start;