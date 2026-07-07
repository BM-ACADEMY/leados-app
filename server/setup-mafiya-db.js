const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function setup() {
  console.log('🔧 Mafiya OS Database Setup Starting...\n');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mafiya_gmb_clients (
      id              SERIAL PRIMARY KEY,
      business_name   VARCHAR(255) NOT NULL,
      business_category VARCHAR(100),
      custom_category VARCHAR(255),
      contact_person  VARCHAR(255) NOT NULL,
      phone_number    VARCHAR(20) NOT NULL,
      website_url     VARCHAR(500),
      gmb_url         TEXT,
      gmb_email       VARCHAR(255),
      gmb_verified    BOOLEAN DEFAULT false,
      status          VARCHAR(20) DEFAULT 'active',
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table: mafiya_gmb_clients created');

  console.log('\n✅ Mafiya OS Database setup complete!\n');
  await pool.end();
}

setup().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
