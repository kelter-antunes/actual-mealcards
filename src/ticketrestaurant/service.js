// src/ticketrestaurant/service.js
const TicketRestaurantClient = require('./client');

function TicketRestaurantService(config) {
  const client = new TicketRestaurantClient({
    cardNumber: config.tr.cardNumber,
    password: config.tr.password
  });

  return {
    async fetchAccountTransactions(accountId) {
      // accountId should be the card number. We ignore it here, as only 1 card per login.
      return await client.getTransactions(config.tr.importFrom, config.tr.importTo);
    }
  }
}

module.exports = TicketRestaurantService;