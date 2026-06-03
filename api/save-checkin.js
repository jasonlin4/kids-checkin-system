const { createRoute } = require('./_lib/create-route');
const { handleSaveCheckin } = require('./_lib/handlers');

module.exports = createRoute('POST', handleSaveCheckin);
