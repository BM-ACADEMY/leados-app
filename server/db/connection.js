const pg = require('pg');
require('dotenv').config();

// OID 1114 is for TIMESTAMP (without time zone).
// Parse it as UTC (appending 'Z') to prevent timezone shifting issues when serving to the client.
pg.types.setTypeParser(1114, function(stringValue) {
  return new Date(stringValue.replace(' ', 'T') + 'Z');
});

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

pool.on('error', (err) => console.error('Alliance DB error:', err));

module.exports = pool;
