const { Pool } = require('pg');
const pool = new Pool({ host: 'leados-api.abmgroups.org', port: 5432, database: 'leados_db', user: 'leados_user', password: 'LeadOS_DB@2026' });
pool.query("SELECT id, name, phone_number_id FROM clients").then(res => { console.log(res.rows); pool.end(); }).catch(console.error);
