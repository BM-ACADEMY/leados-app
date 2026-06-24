const pool = require('./db/connection');

async function runMigration() {
  console.log('Running Content OS Publish Queue migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add selected_channels column to content_queue if it doesn't exist
    const { rows: selectedChannelsCol } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'content_queue' AND column_name = 'selected_channels'
    `);
    if (selectedChannelsCol.length === 0) {
      console.log('Adding column "selected_channels" to content_queue...');
      await client.query('ALTER TABLE content_queue ADD COLUMN selected_channels JSONB DEFAULT \'[]\'::jsonb');
    } else {
      console.log('Column "selected_channels" already exists in content_queue.');
    }

    // 2. Drop existing CHECK constraints on status specifically
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

    // 3. Add the updated status CHECK constraint
    console.log('Adding updated CHECK constraint for status...');
    await client.query(`
      ALTER TABLE content_queue 
      ADD CONSTRAINT content_queue_status_check 
      CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'publishing', 'published', 'failed', 'processing', 'partial', 'deleted_from_drive',
        'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'PARTIAL', 'DELETED_FROM_DRIVE'
      ))
    `);

    // 4. Create the publish_queue table
    console.log('Creating "publish_queue" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS publish_queue (
        id SERIAL PRIMARY KEY,
        content_id INTEGER NOT NULL REFERENCES content_queue(id) ON DELETE CASCADE,
        brand_name VARCHAR(150) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'success', 'failed')),
        post_id VARCHAR(255),
        error_message TEXT,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_content_channel UNIQUE (content_id, channel)
      )
    `);
    console.log('Table "publish_queue" verified/created.');

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
