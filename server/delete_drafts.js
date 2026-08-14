const pool = require('./db/connection');

async function run() {
  try {
    const res = await pool.query("DELETE FROM mafiya_gmb_posts WHERE status = 'scheduled' OR status = 'draft'");
    console.log(`Deleted ${res.rowCount} posts.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
