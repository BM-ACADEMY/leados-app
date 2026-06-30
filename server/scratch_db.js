const pool = require('./db/connection');
pool.query("SELECT id, selected_accounts, status FROM content_queue WHERE drive_file_id = '1XqCqYUS4O89qUW580pK0uzSwt-zCOEku'", (err, res) => {
  if (err) {
    console.error(err);
  } else {
    res.rows.forEach(row => {
      console.log(`Row ID: ${row.id}`);
      console.log(`Status: ${row.status}`);
      console.log(`Type: ${typeof row.selected_accounts}`);
      console.log(`Value:`, row.selected_accounts);
    });
  }
  process.exit(0);
});
