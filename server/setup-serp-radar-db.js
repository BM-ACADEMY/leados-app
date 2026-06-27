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
  try {
    console.log('Creating Serp Radar tables...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS serp_radar_history (
        id SERIAL PRIMARY KEY,
        keyword VARCHAR(255) NOT NULL,
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        competitors_json JSONB NOT NULL,
        features_json JSONB NOT NULL,
        volatility_score NUMERIC(4,2)
      );
    `);

    console.log('Tables created successfully.');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    pool.end();
  }
}

setup();
