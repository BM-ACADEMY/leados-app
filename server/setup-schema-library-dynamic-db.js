const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_entity_links (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schema_deployments (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES schema_templates(id) ON DELETE CASCADE,
        client_url VARCHAR(255) NOT NULL,
        deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Seed default entities if table is empty
    const { rows } = await pool.query('SELECT COUNT(*) FROM schema_entity_links');
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO schema_entity_links (type, url) VALUES
        ('Wikipedia', 'https://en.wikipedia.org/wiki/Example_Company'),
        ('LinkedIn', 'https://linkedin.com/company/example')
      `);
    }

    console.log('Dynamic tables created successfully!');
  } catch (err) {
    console.error('Failed to create dynamic tables', err);
  } finally {
    pool.end();
  }
}

run();
