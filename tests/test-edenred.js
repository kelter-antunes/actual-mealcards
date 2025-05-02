// test-edenred.js
const fs = require('fs').promises;
const path = require('path');
const { getConfig } = require('../src/config');
const EdenredClient = require('../src/edenred/client');

(async () => {
  try {
    const config = getConfig();

    // Grab the first Edenred account in the mapping for test (key is card GUID)
    const accountMap = config.ed.accounts || {};
    const ACCOUNT_ID = Object.keys(accountMap)[0] || '';
    if (!ACCOUNT_ID) throw new Error('No Edenred account mapping found in config');

    const USERNAME = config.ed.username;
    const PIN = config.ed.pin;
    const importFrom = config.ed.importFrom || '1970-01-01';

    const client = new EdenredClient({
      username: USERNAME,
      pin: PIN,
      version: config.ed.version
    });

    console.log(`Fetching Edenred transactions for account ${ACCOUNT_ID} from ${importFrom} ...`);
    const txs = await client.getTransactions(ACCOUNT_ID, importFrom);

    const tempDir = path.join(__dirname, 'temp_edenred');
    await fs.mkdir(tempDir, { recursive: true });
    const outPath = path.join(tempDir, 'transactions.json');

    await fs.writeFile(outPath, JSON.stringify(txs, null, 2), 'utf8');
    console.log(`Extracted ${txs.length} transactions, saved to: ${outPath}`);
    if(txs.length > 0) {
      console.log('First transaction sample:');
      console.log(JSON.stringify(txs[0], null, 2));
    }
  } catch (err) {
    console.error('ERROR', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
})();