const pool = require('./db/connection');

async function runMigration() {
  console.log('Running Content OS Drive Ingestion migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add columns to content_queue
    const addCols = [
      { name: 'description', type: 'TEXT' },
      { name: 'hashtags', type: 'TEXT' },
      { name: 'thumbnail_options', type: 'JSONB DEFAULT \'[]\'::jsonb' },
      { name: 'key_moments', type: 'JSONB DEFAULT \'[]\'::jsonb' },
      { name: 'drive_file_id', type: 'VARCHAR(255) UNIQUE' }
    ];

    for (const col of addCols) {
      const { rows } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'content_queue' AND column_name = $1
      `, [col.name]);

      if (rows.length === 0) {
        console.log(`Adding column "${col.name}" to content_queue...`);
        await client.query(`ALTER TABLE content_queue ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`Column "${col.name}" already exists in content_queue.`);
      }
    }

    // Create brand_drive_monitors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS brand_drive_monitors (
        id SERIAL PRIMARY KEY,
        brand_name VARCHAR(150) NOT NULL UNIQUE CHECK (brand_name IN ('BM Academy', 'BM TechX', 'Namma Pondy Properties', 'Dada''s Kitchen', 'ABM Groups')),
        folder_id VARCHAR(255) NOT NULL,
        last_checked_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Table "brand_drive_monitors" checked/created.');

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
