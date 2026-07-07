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
  console.log('🔧 Creating mafiya_gmb_tokens table...\n');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mafiya_gmb_tokens (
      id            SERIAL PRIMARY KEY,
      client_id     INTEGER REFERENCES mafiya_gmb_clients(id) ON DELETE CASCADE,
      access_token  TEXT NOT NULL,
      refresh_token TEXT,
      expires_at    TIMESTAMP,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table: mafiya_gmb_tokens created');

  console.log('\n✅ Migration complete!\n');
  await pool.end();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
