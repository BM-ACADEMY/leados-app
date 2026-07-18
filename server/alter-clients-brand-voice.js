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
  try {
    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS brand_tag TEXT,
      ADD COLUMN IF NOT EXISTS brand_voice TEXT,
      ADD COLUMN IF NOT EXISTS industry TEXT,
      ADD COLUMN IF NOT EXISTS target_audience TEXT
    `);
    console.log('✅ Added brand_tag, brand_voice, industry, target_audience columns to clients table');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
