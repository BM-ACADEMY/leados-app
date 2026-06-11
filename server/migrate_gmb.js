const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function runMigration() {
  console.log('Running database migration for GMB OAuth & Client Metadata fields...');
  try {
    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100),
      ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS gmb_url TEXT,
      ADD COLUMN IF NOT EXISTS google_email VARCHAR(150),
      ADD COLUMN IF NOT EXISTS oauth_status VARCHAR(50) DEFAULT 'Not Connected',
      ADD COLUMN IF NOT EXISTS oauth_connected_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS access_token TEXT,
      ADD COLUMN IF NOT EXISTS refresh_token TEXT;
    `);
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
