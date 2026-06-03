const { sendJson } = require('./http');

const createRoute = (method, handler) => async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== method) {
    return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    return await handler(req, res);
  } catch (err) {
    console.error('Unhandled error:', err.message);
    return sendJson(res, 500, { ok: false, error: 'UNHANDLED_ERROR' });
  }
};

module.exports = {
  createRoute
};
