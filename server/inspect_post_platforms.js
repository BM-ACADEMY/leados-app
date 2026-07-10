require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT id, brand_name, platforms, selected_channels
      FROM content_queue
      WHERE brand_name = 'BM Academy' OR brand_id = 'bm_academy'
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    console.log("Content queue items platforms:", JSON.stringify(res.rows, null, 2));

    const accountsRes = await pool.query(`
      SELECT brand_name, platform, account_name, is_active
      FROM brand_social_accounts;
    `);
    console.log("Connected accounts:", JSON.stringify(accountsRes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
