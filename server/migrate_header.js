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
    console.log('Adding header_format column...');
    await pool.query(`
      ALTER TABLE templates 
      ADD COLUMN IF NOT EXISTS header_format VARCHAR(20) DEFAULT 'TEXT'
    `);
    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
