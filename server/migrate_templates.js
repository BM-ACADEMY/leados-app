const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function migrate() {
  try {
    console.log('Running migration to add template columns...');
    await pool.query(`
      ALTER TABLE templates 
      ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS header TEXT,
      ADD COLUMN IF NOT EXISTS footer TEXT,
      ADD COLUMN IF NOT EXISTS buttons JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
