const pool = require('./db/connection');

async function runMigration() {
  console.log('Running migration: add DELETED status to content_queue and publish_queue...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Drop existing CHECK constraints on content_queue.status
    const { rows: cqConstraints } = await client.query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'content_queue'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) LIKE '%status%'
    `);
    for (const c of cqConstraints) {
      console.log(`Dropping content_queue status constraint ${c.conname}...`);
      await client.query(`ALTER TABLE content_queue DROP CONSTRAINT IF EXISTS "${c.conname}"`);
    }

    // 2. Re-add content_queue status constraint with 'DELETED' and 'deleted' included
    console.log('Adding updated CHECK constraint for content_queue.status...');
    await client.query(`
      ALTER TABLE content_queue
      ADD CONSTRAINT content_queue_status_check
      CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'publishing',
        'published', 'failed', 'processing', 'partial', 'deleted_from_drive', 'deleted',
        'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHING',
        'PUBLISHED', 'FAILED', 'PARTIAL', 'DELETED_FROM_DRIVE', 'DELETED'
      ))
    `);

    // 3. Drop existing CHECK constraints on publish_queue.status
    const { rows: pqConstraints } = await client.query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'publish_queue'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) LIKE '%status%'
    `);
    for (const c of pqConstraints) {
      console.log(`Dropping publish_queue status constraint ${c.conname}...`);
      await client.query(`ALTER TABLE publish_queue DROP CONSTRAINT IF EXISTS "${c.conname}"`);
    }

    // 4. Re-add publish_queue status constraint with 'deleted' included
    console.log('Adding updated CHECK constraint for publish_queue.status...');
    await client.query(`
      ALTER TABLE publish_queue
      ADD CONSTRAINT publish_queue_status_check
      CHECK (status IN ('pending', 'publishing', 'success', 'failed', 'deleted'))
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully! ✅');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed: ❌', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
