const pool = require('./db/connection');

async function migrate() {
  console.log('Running migration: adding latitude/longitude to mafiya_gmb_clients...');
  try {
    await pool.query(`
      ALTER TABLE mafiya_gmb_clients
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    `);
    console.log('✅ Migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
