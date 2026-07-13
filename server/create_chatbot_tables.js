const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chatbot_flows (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        is_published BOOLEAN DEFAULT false,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created chatbot_flows table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chatbot_flowsteps (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES chatbot_flows(id) ON DELETE CASCADE,
        step_id VARCHAR(255) NOT NULL,
        question TEXT NOT NULL,
        options JSONB DEFAULT '[]',
        next_step VARCHAR(255),
        capture_mapping VARCHAR(255),
        capture_type VARCHAR(100),
        is_entry_point BOOLEAN DEFAULT false,
        tags_on_reach JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(flow_id, step_id)
      );
    `);
    console.log('Created chatbot_flowsteps table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chatbot_userprogresses (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        flow_id INTEGER REFERENCES chatbot_flows(id) ON DELETE CASCADE,
        current_step VARCHAR(255),
        selected_options JSONB DEFAULT '[]',
        follow_up_history JSONB DEFAULT '[]',
        completed BOOLEAN DEFAULT false,
        last_step_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(lead_id, flow_id)
      );
    `);
    console.log('Created chatbot_userprogresses table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chatbot_knowledgebase (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES chatbot_flows(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        embedding JSONB,
        tags JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created chatbot_knowledgebase table');

    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createTables();
