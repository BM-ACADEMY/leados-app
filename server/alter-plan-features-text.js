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
  console.log('🔄 Adding text_value to thedal_plan_features...');
  try {
    await pool.query(`
      ALTER TABLE thedal_plan_features ADD COLUMN IF NOT EXISTS text_value VARCHAR(255);
    `);
    console.log('✅ Successfully added text_value!');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    await pool.end();
  }
}

run();
