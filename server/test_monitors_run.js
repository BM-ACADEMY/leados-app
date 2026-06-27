// server/test_monitors_run.js
require('dotenv').config();
const pool = require('./db/connection');
const { checkNewDriveVideos } = require('./controllers/contentController');

async function testMonitors() {
  console.log("🚀 Starting Google Drive Ingestion Poller manual test...");
  
  try {
    // 1. Run the poller
    await checkNewDriveVideos();
    console.log("✨ Poller run completed.");

    // 2. Fetch the latest items from the queue
    console.log("\n📊 Querying latest 3 items in the content queue:");
    const { rows } = await pool.query(`
      SELECT id, brand_name, file_name, status, drive_file_id, created_at
      FROM content_queue
      ORDER BY created_at DESC
      LIMIT 3
    `);

    if (rows.length === 0) {
      console.log("No items found in the content_queue table.");
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
  } catch (err) {
    console.error("❌ Error running poller check:", err);
  } finally {
    // 3. Clean up pool
    await pool.end();
    console.log("\n👋 Database connection closed.");
  }
}

testMonitors();
