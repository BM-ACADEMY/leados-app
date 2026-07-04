const pool = require("./db/connection");

async function check() {
  try {
    const post = await pool.query("SELECT * FROM content_queue WHERE id = 157");
    console.log("Post 157 all fields:", JSON.stringify(post.rows[0], null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

check();
