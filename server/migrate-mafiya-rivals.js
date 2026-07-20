const pool = require('./db/connection');

async function runMigration() {
  console.log('Running migration: creating mafiya_rivals and mafiya_rival_metrics tables...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mafiya_rivals (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES mafiya_gmb_clients(id) ON DELETE CASCADE,
        competitor_name VARCHAR(255) NOT NULL,
        place_id VARCHAR(255),
        gbp_url TEXT,
        city VARCHAR(255),
        keyword VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ mafiya_rivals table created.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mafiya_rival_metrics (
        id SERIAL PRIMARY KEY,
        rival_id INTEGER REFERENCES mafiya_rivals(id) ON DELETE CASCADE,
        their_rank INTEGER,
        our_rank INTEGER,
        their_reviews INTEGER,
        our_reviews INTEGER,
        their_rating DECIMAL(3,2),
        our_rating DECIMAL(3,2),
        status VARCHAR(50),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ mafiya_rival_metrics table created.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    pool.end();
  }
}

runMigration();
