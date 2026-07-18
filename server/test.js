const db = require('./db/connection.js');
db.query("SELECT tgname FROM pg_trigger WHERE tgrelid = 'content_queue'::regclass")
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
