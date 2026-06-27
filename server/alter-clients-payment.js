const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    
    // Add payment_status
    console.log('Adding payment_status column to thedal_clients...');
    await pool.query(`
      ALTER TABLE thedal_clients 
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'active'
    `);

    // Add razorpay_order_id
    console.log('Adding razorpay_order_id column to thedal_clients...');
    await pool.query(`
      ALTER TABLE thedal_clients 
      ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255)
    `);

    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

runMigration();
