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
    const res = await pool.query("SELECT id, content FROM messages WHERE wa_msg_id = 'wamid.HBgMOTE4ODA3MjI2MjU3FQIAERgSODhDNDIwQUQwRTU0MkIzMEE2AA=='");
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
main();
