require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});

async function main() {
  try {
    await pool.query(`ALTER TABLE messages ADD COLUMN pinned_until TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;`);
    console.log('Added pinned_until column to messages table.');
  } catch (err) {
    console.log('Column might already exist:', err.message);
  }
  pool.end();
}
main();
