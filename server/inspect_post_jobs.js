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
    const postRes = await pool.query("SELECT * FROM content_queue WHERE id = 220");
    console.log("=== CONTENT QUEUE ===");
    console.log(JSON.stringify(postRes.rows, null, 2));

    const queueRes = await pool.query("SELECT * FROM publish_queue WHERE content_id = 220");
    console.log("\n=== PUBLISH QUEUE ===");
    console.log(JSON.stringify(queueRes.rows, null, 2));

    const logsRes = await pool.query("SELECT * FROM publishing_logs WHERE content_id = 220 ORDER BY published_at DESC");
    console.log("\n=== PUBLISHING LOGS ===");
    console.log(JSON.stringify(logsRes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
