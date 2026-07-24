const db = require('./db/connection');
db.query("SELECT c.name as brand, count(l.id) FROM leads l LEFT JOIN clients c ON l.client_id = c.id WHERE l.source = 'facebook' GROUP BY c.name").then(r => {
  console.log(r.rows);
  process.exit(0);
});
