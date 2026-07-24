const db = require('./db/connection');
db.query("SELECT count(*) FROM leads WHERE source='facebook'").then(r => {
  console.log(r.rows);
  process.exit(0);
});
