const { Pool } = require('pg');
const pool = new Pool({
  user: 'leados_user', host: 'leados-api.abmgroups.org', database: 'leados_db', password: 'LeadOS_DB@2026', port: 5432
});
pool.query("SELECT id, direction, content, msg_type, status FROM messages ORDER BY id DESC LIMIT 5").then(res => {
  console.log(res.rows);
  process.exit(0);
});
