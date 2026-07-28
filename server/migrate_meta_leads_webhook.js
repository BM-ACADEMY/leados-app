const pool = require('./db/connection');

async function migrate() {
  console.log('🚀 Starting Meta Leads Webhook Database Migration...');
  try {
    // 1. Add leadgen_id to leads table
    console.log('Adding leadgen_id to leads table...');
    await pool.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS leadgen_id VARCHAR(100) UNIQUE
    `);
    console.log('✅ Added leadgen_id.');

    // 2. Alter constraints on phone column to allow same phone for different clients
    console.log('Updating phone constraints on leads table...');
    // Finding the constraint name for phone. Usually it's leads_phone_key
    // Drop the unique constraint if it exists.
    try {
      await pool.query(`ALTER TABLE leads DROP CONSTRAINT leads_phone_key`);
    } catch (e) {
      console.log('Constraint leads_phone_key might not exist or already dropped.');
    }
    
    // Add unique constraint on (phone, client_id)
    try {
      await pool.query(`
        ALTER TABLE leads 
        ADD CONSTRAINT leads_phone_client_id_key UNIQUE (phone, client_id)
      `);
      console.log('✅ Added composite unique constraint on (phone, client_id).');
    } catch (e) {
      console.log('Composite constraint might already exist or conflicting data exists: ' + e.message);
    }

    // 3. Create failed_webhooks table
    console.log('Creating failed_webhooks table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS failed_webhooks (
        id SERIAL PRIMARY KEY,
        page_id VARCHAR(100),
        leadgen_id VARCHAR(100),
        payload JSONB,
        error_message TEXT,
        status VARCHAR(20) DEFAULT 'failed',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created failed_webhooks table.');

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
