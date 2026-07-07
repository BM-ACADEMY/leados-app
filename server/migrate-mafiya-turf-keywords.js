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
  console.log('🔧 Creating mafiya_turf_keywords table...\n');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mafiya_turf_keywords (
      id            SERIAL PRIMARY KEY,
      client_id     INTEGER REFERENCES mafiya_gmb_clients(id) ON DELETE CASCADE,
      keyword       TEXT NOT NULL,
      initial_rank  INTEGER DEFAULT 100,
      current_rank  INTEGER,
      previous_rank INTEGER,
      pack_status   VARCHAR(50) DEFAULT 'Not in Pack',
      last_checked  TIMESTAMP,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table: mafiya_turf_keywords created');

  console.log('\n✅ Migration complete!\n');
  await pool.end();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
