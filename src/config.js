// src/config.js
const Conf = require('conf');
const dotenv = require('dotenv');
const { error, printConfigVar } = require('./logger');
dotenv.config();

const bool = (val) => String(val).toLowerCase() === 'true';

class ConfigError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "ConfigError";
  }
}

function required(varName, value) {
  // Always printConfigVar, but this will safely mask with new logger
  printConfigVar(varName, value);
  if (!value) throw new ConfigError(`Missing environment variable: ${varName}`);
}

function getEdenredMappings() {
  const main = { [process.env.EDENRED_ACCOUNT]: process.env.EDENRED_ACTUAL_ACCOUNT };
  let idx = 1, found = false;
  while (process.env[`EDENRED_ACCOUNT_${idx}`] && process.env[`EDENRED_ACTUAL_ACCOUNT_${idx}`]) {
    found = true;
    main[process.env[`EDENRED_ACCOUNT_${idx}`]] = process.env[`EDENRED_ACTUAL_ACCOUNT_${idx}`];
    idx++;
  }
  return found ? main : main;
}

function getCoverflexMappings() {
  const main = { [process.env.COVERFLEX_ACCOUNT]: process.env.COVERFLEX_ACTUAL_ACCOUNT };
  let idx = 1, found = false;
  while (process.env[`COVERFLEX_ACCOUNT_${idx}`] && process.env[`COVERFLEX_ACTUAL_ACCOUNT_${idx}`]) {
    found = true;
    main[process.env[`COVERFLEX_ACCOUNT_${idx}`]] = process.env[`COVERFLEX_ACTUAL_ACCOUNT_${idx}`];
    idx++;
  }
  return found ? main : main;
}

function getTicketRestaurantMappings() {
  const main = { [process.env.TICKETRESTAURANT_CARD]: process.env.TICKETRESTAURANT_ACTUAL_ACCOUNT };
  let idx = 1, found = false;
  while (process.env[`TICKETRESTAURANT_CARD_${idx}`] && process.env[`TICKETRESTAURANT_ACTUAL_ACCOUNT_${idx}`]) {
    found = true;
    main[process.env[`TICKETRESTAURANT_CARD_${idx}`]] = process.env[`TICKETRESTAURANT_ACTUAL_ACCOUNT_${idx}`];
    idx++;
  }
  return found ? main : main;
}

function getConfig() {
  [
    'APP_PORT', 'APP_URL',
    'ACTUAL_SERVER_URL', 'ACTUAL_SERVER_PASSWORD', 'ACTUAL_SYNC_ID'
  ].forEach(v => required(v, process.env[v]));

  if (
    !bool(process.env.ENABLE_COVERFLEX) &&
    !bool(process.env.ENABLE_EDENRED) &&
    !bool(process.env.ENABLE_TICKETRESTAURANT)
  ) {
    throw new ConfigError("All meal cards importers are disabled. Set ENABLE_EDENRED or ENABLE_COVERFLEX or ENABLE_TICKETRESTAURANT to true.");
  }

  const config = {
    ed: {
      enabled: bool(process.env.ENABLE_EDENRED),
      username: process.env.EDENRED_USERNAME,
      pin: process.env.EDENRED_PIN,
      version: process.env.EDENRED_VERSION || '4.1.0',
      accounts: getEdenredMappings(),
      importFrom: process.env.EDENRED_IMPORT_FROM || "1970-01-01"
    },
    cf: {
      enabled: bool(process.env.ENABLE_COVERFLEX),
      username: process.env.COVERFLEX_USERNAME,
      password: process.env.COVERFLEX_PASSWORD,
      userAgentToken: process.env.COVERFLEX_USER_AGENT_TOKEN,
      accounts: getCoverflexMappings(),
      importFrom: process.env.COVERFLEX_IMPORT_FROM || "1970-01-01"
    },
    tr: {
      enabled: bool(process.env.ENABLE_TICKETRESTAURANT),
      cardNumber: process.env.TICKETRESTAURANT_CARD,
      password: process.env.TICKETRESTAURANT_PASSWORD,
      accounts: getTicketRestaurantMappings(),
      importFrom: process.env.TICKETRESTAURANT_IMPORT_FROM || "1970-01-01",
      importTo: process.env.TICKETRESTAURANT_IMPORT_TO // optional
    },
    actual: {
      serverUrl: process.env.ACTUAL_SERVER_URL,
      serverPassword: process.env.ACTUAL_SERVER_PASSWORD,
      filePassword: process.env.ACTUAL_FILE_PASSWORD,
      syncId: process.env.ACTUAL_SYNC_ID
    },
    cron: process.env.CRON_EXPRESSION || "0 */4 * * *",
    appPort: +(process.env.APP_PORT || 3000),
    appUrl: process.env.APP_URL || "http://localhost"
  };

  if (config.ed.enabled) {
    ['username', 'pin'].forEach(k => required('EDENRED_' + k.toUpperCase(), config.ed[k]));
  }
  if (config.cf.enabled) {
    ['username', 'password', 'userAgentToken'].forEach(k => required('COVERFLEX_' + k.toUpperCase(), config.cf[k]));
  }
  if (config.tr.enabled) {
    ['cardNumber', 'password'].forEach(k => required('TICKETRESTAURANT_' + k.replace(/([A-Z])/g, '_$1').toUpperCase(), config.tr[k]));
  }
  return config;
}

function getUserConf(username = 'default', config) {
  const conf = new Conf({ configName: username });
  conf.set('user', username);
  conf.set('budget_id', config.actual.syncId);
  return conf;
}

module.exports = { getConfig, getUserConf, ConfigError };