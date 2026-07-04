const pool = require("./db/connection");

async function check() {
  try {
    const post = await pool.query("SELECT id, brand_name, status, error_message, updated_at FROM content_queue WHERE id = 157");
    console.log("Post 157 details:", post.rows[0]);

    const jobs = await pool.query("SELECT * FROM publish_queue WHERE content_id = 157");
    console.log("Publish jobs for 157:", jobs.rows);

    const logs = await pool.query("SELECT * FROM publishing_logs WHERE content_id = 157 ORDER BY published_at DESC LIMIT 5");
    console.log("Publishing logs for 157:", logs.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

check();
