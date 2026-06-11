const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function run() {
  const { rows } = await pool.query('SELECT * FROM clients WHERE id = 53');
  console.log('Client 53 details:', JSON.stringify(rows[0], null, 2));
  await pool.end();
}

run().catch(console.error);
