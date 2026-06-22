const { Pool } = require('pg');

const pool = new Pool({
  host: 'leados-api.abmgroups.org',
  user: 'leados_user',
  password: 'LeadOS_DB@2026',
  database: 'leados_db',
  port: 5432
});

async function run() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads'");
    console.log('Columns in leads table:', res.rows);
  } catch (e) {
    console.error('Error querying columns:', e.message);
  } finally {
    await pool.end();
  }
}

run();
