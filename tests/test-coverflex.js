// test-coverflex.js
const fs = require('fs').promises;
const path = require('path');
const { getConfig } = require('../src/config');
const CoverflexClient = require('../src/coverflex/client');

(async () => {
  try {
    const config = getConfig();

    // Grab the first Coverflex account in the mapping for test (key is pocket_id)
    const accountMap = config.cf.accounts || {};
    const ACCOUNT_ID = Object.keys(accountMap)[0] || '';
    if (!ACCOUNT_ID) throw new Error('No Coverflex account mapping found in config');

    const USERNAME = config.cf.username;
    const PASSWORD = config.cf.password;
    const TOKEN = config.cf.userAgentToken;
    const importFrom = config.cf.importFrom || '1970-01-01';

    const client = new CoverflexClient({
      username: USERNAME,
      password: PASSWORD,
      userAgentToken: TOKEN
    });

    console.log(`Fetching Coverflex transactions for pocket_id ${ACCOUNT_ID} from ${importFrom} ...`);
    const txs = await client.getTransactions(ACCOUNT_ID, importFrom);

    const tempDir = path.join(__dirname, 'temp_coverflex');
    await fs.mkdir(tempDir, { recursive: true });
    const outPath = path.join(tempDir, 'transactions.json');

    await fs.writeFile(outPath, JSON.stringify(txs, null, 2), 'utf8');
    console.log(`Extracted ${txs.length} transactions, saved to: ${outPath}`);
    if (txs.length > 0) {
      console.log('First transaction sample:');
      console.log(JSON.stringify(txs[0], null, 2));
    }
  } catch (err) {
    console.error('ERROR', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
})();