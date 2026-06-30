const pool = require('./db/connection');
async function run() {
  try {
    const resQueue = await pool.query(
      "SELECT id, brand_name, platforms, status, error_message, updated_at, video_url, public_video_url FROM content_queue WHERE id >= 70 ORDER BY id DESC"
    );
    console.log("Content queue:", JSON.stringify(resQueue.rows, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
