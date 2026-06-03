const { createRoute } = require('./_lib/create-route');
const { handleSaveExchange } = require('./_lib/handlers');

module.exports = createRoute('POST', handleSaveExchange);
