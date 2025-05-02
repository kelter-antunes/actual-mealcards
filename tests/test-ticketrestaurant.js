// test-ticketrestaurant.js
const fs = require('fs').promises;
const path = require('path');
const { getConfig } = require('../src/config');
const TicketRestaurantClient = require('../src/ticketrestaurant/client');

(async () => {
  try {
    const config = getConfig();

    // Grab the first TR account/card in the mapping for test (key is card number)
    const accountMap = config.tr.accounts || {};
    const CARD_NUMBER = Object.keys(accountMap)[0] || '';
    if (!CARD_NUMBER) throw new Error('No TicketRestaurant account mapping found in config');

    const PASSWORD = config.tr.password;
    const importFrom = config.tr.importFrom || '1970-01-01';
    const importTo = config.tr.importTo || (new Date()).toISOString().slice(0, 10);

    const client = new TicketRestaurantClient({
      cardNumber: CARD_NUMBER,
      password: PASSWORD
    });

    console.log(`Fetching Ticket Restaurant transactions for card ${CARD_NUMBER} from ${importFrom} to ${importTo} ...`);
    const txs = await client.getTransactions(importFrom, importTo);

    const tempDir = path.join(__dirname, 'temp_ticketrestaurant');
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