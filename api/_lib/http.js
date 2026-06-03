const sendJson = (res, status, data) => {
  res.status(status).json(data);
};

const sendDbError = (res, err) => {
  console.error('DB error:', err.message);
  if (err.code === '42P01' || err.code === '42703') {
    return sendJson(res, 500, { ok: false, error: 'DB_SCHEMA_NOT_READY' });
  }
  return sendJson(res, 500, { ok: false, error: 'DB_ERROR' });
};

module.exports = {
  sendJson,
  sendDbError
};
