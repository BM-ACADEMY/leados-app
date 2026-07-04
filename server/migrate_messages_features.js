const pool = require('./db/connection');

async function migrate() {
  console.log('Running migration...');
  try {
    // Add is_deleted to messages
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS media_url TEXT
    `);
    console.log('✅ Added is_deleted and media_url to messages');

    // Add unread_count to conversations if not exists
    await pool.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0
    `);
    console.log('✅ Ensured unread_count on conversations');

    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
