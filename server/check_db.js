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
    const res = await pool.query('SELECT id, direction, content, wa_msg_id, reply_to_wa_id FROM messages ORDER BY id DESC LIMIT 5');
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
main();
