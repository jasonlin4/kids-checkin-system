const { createRoute } = require('./_lib/create-route');
const { handleUseCard } = require('./_lib/handlers');

module.exports = createRoute('POST', handleUseCard);
