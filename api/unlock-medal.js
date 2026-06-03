const { createRoute } = require('./_lib/create-route');
const { handleUnlockMedal } = require('./_lib/handlers');

module.exports = createRoute('POST', handleUnlockMedal);
