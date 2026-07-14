const { Pool } = require('pg');
const pool = new Pool({ user: 'leados_user', host: 'leados-api.abmgroups.org', database: 'leados_db', password: 'LeadOS_DB@2026', port: 5432 });
pool.query("SELECT id, phone_number_id, wa_access_token FROM clients").then(res => { console.log(res.rows); process.exit(0); });
