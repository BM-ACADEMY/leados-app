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
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'messages'");
    console.log('COLUMNS:', res.rows.map(r => r.column_name));
    await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_wa_id VARCHAR(255)");
    console.log('Added reply_to_wa_id successfully');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
main();
