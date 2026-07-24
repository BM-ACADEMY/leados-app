const db = require('./db/connection');
db.query("SELECT * FROM leads WHERE source='facebook' ORDER BY id DESC LIMIT 1").then(r=>{
  console.log(r.rows);
  process.exit(0);
});
