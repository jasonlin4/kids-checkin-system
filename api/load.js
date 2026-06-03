const { createRoute } = require('./_lib/create-route');
const { handleLoad } = require('./_lib/handlers');

module.exports = createRoute('GET', handleLoad);
