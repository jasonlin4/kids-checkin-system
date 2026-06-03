const { createRoute } = require('./_lib/create-route');
const { handleStats } = require('./_lib/handlers');

module.exports = createRoute('GET', handleStats);
