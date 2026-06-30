const { Pool } = require('pg');
const pool = new Pool({
  host: 'leados-api.abmgroups.org',
  user: 'leados_user',
  password: 'LeadOS_DB@2026',
  database: 'leados_db',
  port: 5432
});

const axios = require('axios');
async function run() {
  try {
    const res = await pool.query(
      "SELECT id, brand_name, status, platforms FROM content_queue ORDER BY id DESC LIMIT 10"
    );
    console.log("AVAILABLE CONTENT QUEUE ITEMS:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
run();
