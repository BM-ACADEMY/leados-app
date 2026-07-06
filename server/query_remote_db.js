const pool = require("./db/connection");

async function check() {
  console.log("Host:", pool.options.host);
  console.log("Database:", pool.options.database);
  console.log("User:", pool.options.user);
  console.log("Port:", pool.options.port);
  try {
    const res = await pool.query("SELECT COUNT(*) FROM content_queue");
    console.log("Count in content_queue:", res.rows[0].count);
    
    const sample = await pool.query("SELECT id, brand_name, status, file_name FROM content_queue LIMIT 5");
    console.log("Sample rows:", sample.rows);
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

check();
