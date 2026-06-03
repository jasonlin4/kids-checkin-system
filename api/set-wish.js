const { createRoute } = require('./_lib/create-route');
const { handleSetWish } = require('./_lib/handlers');

module.exports = createRoute('POST', handleSetWish);
