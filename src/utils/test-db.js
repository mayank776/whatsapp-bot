const { Pool } = require('pg');
const logger = require('./logger');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Connection failed:', err);
  } else {
    logger.info('Connection successful! Time:', res.rows[0]);
  }
  pool.end();
});
