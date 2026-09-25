require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  ssl: false
});

async function main() {
  try {
    const res = await pool.query(`
      UPDATE leads 
      SET campaign_name = 'B3_SEP26_LEAD-WA_PROSPECT'
      WHERE source = 'whatsapp' 
        AND campaign_name IS NULL 
        AND created_at >= '2026-08-01';
      SELECT id, name, phone, source, campaign_name, ad_id 
      FROM leads 
      WHERE source = 'whatsapp' 
      ORDER BY created_at DESC 
      LIMIT 10;
    `);
    console.log('Updated leads:', res[0].rowCount);
    console.log(res[1].rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
