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
  console.log('Running database migration for GMB keyword rankings tracking...');
  try {
    // 1. Create table gmb_keywords
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gmb_keywords (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        keyword VARCHAR(255) NOT NULL,
        rank INTEGER,
        previous_rank INTEGER,
        pack_status VARCHAR(20) DEFAULT 'Not in Pack' CHECK (pack_status IN ('In Pack', 'Near Pack', 'Not in Pack')),
        checked_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created table gmb_keywords');

    // 2. Create table gmb_keyword_history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gmb_keyword_history (
        id SERIAL PRIMARY KEY,
        keyword_id INTEGER NOT NULL REFERENCES gmb_keywords(id) ON DELETE CASCADE,
        rank INTEGER,
        checked_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created table gmb_keyword_history');
    
    // Add indices
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gmb_keywords_client ON gmb_keywords(client_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gmb_keyword_history_keyword ON gmb_keyword_history(keyword_id);`);
    console.log('✅ Created indices');

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
