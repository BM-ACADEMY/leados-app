const db = require('./db/connection');
db.query("DELETE FROM leads WHERE source='facebook'").then(() => {
  console.log("Deleted facebook leads");
  process.exit(0);
});
