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
    console.log('Creating Gap Hunter V2 tables...');

    // 1. Gap Hunter Scans (History)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gap_hunter_scans (
        id SERIAL PRIMARY KEY,
        client_domain VARCHAR(255) NOT NULL,
        competitor_domain VARCHAR(255) NOT NULL,
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        results_json JSONB NOT NULL
      );
    `);

    // 2. Mock Tracked Keywords (For deduplication logic)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS thedal_tracked_keywords (
        id SERIAL PRIMARY KEY,
        client_domain VARCHAR(255) NOT NULL,
        keyword VARCHAR(255) NOT NULL,
        tracked_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert some mock tracked keywords to prove the deduplication logic works
    await pool.query(`
      INSERT INTO thedal_tracked_keywords (client_domain, keyword)
      VALUES 
      ('myclient.com', 'affordable local SEO'),
      ('myclient.com', 'b2b lead generation services')
      ON CONFLICT DO NOTHING;
    `);

    console.log('Gap Hunter V2 tables created successfully.');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    pool.end();
  }
}

setup();
