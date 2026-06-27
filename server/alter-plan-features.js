const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function recreateFeaturesTable() {
  console.log('🔄 Rebuilding thedal_plan_features table...');
  try {
    await pool.query('DROP TABLE IF EXISTS thedal_plan_features CASCADE');
    
    await pool.query(`
      CREATE TABLE thedal_plan_features (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER REFERENCES thedal_plans(id) ON DELETE CASCADE,
        feature_key VARCHAR(100) NOT NULL,
        feature_name VARCHAR(255) NOT NULL,
        limit_value INTEGER NOT NULL DEFAULT -1, -- -1 means unlimited, 0 means no access
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Successfully rebuilt thedal_plan_features with limit_value column!');
  } catch (err) {
    console.error('❌ Failed to rebuild table:', err);
  } finally {
    await pool.end();
  }
}

recreateFeaturesTable();
