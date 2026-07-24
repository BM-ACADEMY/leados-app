require('dotenv').config();
const pool = require('./db/connection');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_tasks (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id),
        task_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Successfully created sales_tasks table");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    await pool.end();
  }
})();
