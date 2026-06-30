// server/migrate_service_account.js
const pool = require('./db/connection');

async function runMigration() {
  console.log('Running Service Account Folder Monitors migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Enable pgcrypto if it isn't already enabled (required for gen_random_uuid() in some PG versions)
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // Drop old table brand_drive_monitors if it exists
    await client.query('DROP TABLE IF EXISTS brand_drive_monitors');

    // Create the new table drive_folder_monitors
    await client.query(`
      CREATE TABLE IF NOT EXISTS drive_folder_monitors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_slug VARCHAR(100) UNIQUE NOT NULL,
        folder_id TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_checked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Table "drive_folder_monitors" checked/created.');

    await client.query('COMMIT');
    console.log('Migration completed successfully! ✅');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed: ❌', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
