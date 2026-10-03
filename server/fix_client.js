const { Pool } = require('pg');
const pool = new Pool({ host: 'leados-api.abmgroups.org', port: 5432, database: 'leados_db', user: 'leados_user', password: 'LeadOS_DB@2026' });
pool.query("UPDATE clients SET phone_number_id = NULL, wa_access_token = NULL WHERE id = 24").then(res => { console.log('Updated ABM Groups to use fallback token'); pool.end(); }).catch(console.error);
