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
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb
    `);
    console.log('✅ reactions column added (or already exists)');
  } catch(e) {
    console.error('❌', e.message);
  } finally {
    process.exit(0);
  }
}
main();
