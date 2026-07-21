const pool = require('./db/connection');

async function run() {
  try {
    console.log('Adding samples column to templates table...');
    await pool.query(`
      ALTER TABLE templates 
      ADD COLUMN IF NOT EXISTS samples JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Successfully added samples column.');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    pool.end();
  }
}

run();
