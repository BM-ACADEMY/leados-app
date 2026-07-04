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
    await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE");
    console.log('Added is_forwarded column');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
main();
