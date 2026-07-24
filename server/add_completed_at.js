require('dotenv').config();
const pool = require('./db/connection');

(async () => {
  try {
    await pool.query(`
      ALTER TABLE sales_tasks 
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
    `);
    console.log("Successfully added completed_at column to sales_tasks table");
  } catch (err) {
    console.error("Error adding column:", err);
  } finally {
    await pool.end();
  }
})();
