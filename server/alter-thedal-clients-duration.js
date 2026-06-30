const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function alterTable() {
  console.log('Altering thedal_clients table...');
  try {
    await pool.query(`
      ALTER TABLE thedal_clients
      ADD COLUMN IF NOT EXISTS subscription_duration VARCHAR(50) DEFAULT '1 Month'
    `);
    
    console.log('✅ Alter table successful');
  } catch (error) {
    console.error('❌ Alter table failed:', error);
  } finally {
    pool.end();
  }
}

alterTable();
