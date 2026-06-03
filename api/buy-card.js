const { createRoute } = require('./_lib/create-route');
const { handleBuyCard } = require('./_lib/handlers');

module.exports = createRoute('POST', handleBuyCard);
