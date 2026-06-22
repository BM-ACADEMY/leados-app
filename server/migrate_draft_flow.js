// server/migrate_draft_flow.js
const pool = require('./db/connection');

async function runMigration() {
  console.log('Running Content OS Draft Flow migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if brand_id column exists, if not add it
    const { rows: brandIdCol } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'content_queue' AND column_name = 'brand_id'
    `);
    if (brandIdCol.length === 0) {
      console.log('Adding column "brand_id" to content_queue...');
      await client.query('ALTER TABLE content_queue ADD COLUMN brand_id VARCHAR(150)');
    } else {
      console.log('Column "brand_id" already exists in content_queue.');
    }

    // 2. Check if video_name column exists, if not add it
    const { rows: videoNameCol } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'content_queue' AND column_name = 'video_name'
    `);
    if (videoNameCol.length === 0) {
      console.log('Adding column "video_name" to content_queue...');
      await client.query('ALTER TABLE content_queue ADD COLUMN video_name VARCHAR(255)');
    } else {
      console.log('Column "video_name" already exists in content_queue.');
    }

    // 3. Drop existing CHECK constraints on status specifically
    const { rows: constraints } = await client.query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'content_queue' 
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) LIKE '%status%'
    `);
    
    for (const c of constraints) {
      console.log(`Dropping status constraint ${c.conname}...`);
      await client.query(`ALTER TABLE content_queue DROP CONSTRAINT IF EXISTS "${c.conname}"`);
    }

    // 4. Add the new status CHECK constraint
    console.log('Adding updated CHECK constraint for status...');
    await client.query(`
      ALTER TABLE content_queue 
      ADD CONSTRAINT content_queue_status_check 
      CHECK (status IN (
        'processing', 'pending_approval', 'approved', 'publishing', 'published', 'rejected', 'failed',
        'PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED', 'FAILED'
      ))
    `);

    // 5. Update any existing null values or legacy status defaults (optional but good practice)
    // Currently, let's leave existing rows intact.

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
