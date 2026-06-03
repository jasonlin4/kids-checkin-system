const { Pool } = require('pg');

const DB_URL = (process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim();

if (!DB_URL) {
  throw new Error('POSTGRES_URL or DATABASE_URL is required for Vercel API');
}

const pool = new Pool({
  connectionString: DB_URL,
  max: 5
});

module.exports = {
  pool
};
