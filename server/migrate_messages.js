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
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
        type VARCHAR(20) DEFAULT 'text',
        content TEXT,
        wa_message_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'sent',
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Successfully created messages table!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
