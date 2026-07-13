const pool = require('./db/connection');

async function runMigration() {
  console.log('Running migration: adding ga4_property_id to mafiya_gmb_clients...');
  try {
    await pool.query(`
      ALTER TABLE mafiya_gmb_clients
      ADD COLUMN IF NOT EXISTS ga4_property_id VARCHAR(255);
    `);
    console.log('✅ Migration successful: ga4_property_id added.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    pool.end();
  }
}

runMigration();
