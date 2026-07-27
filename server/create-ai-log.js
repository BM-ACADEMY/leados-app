const pool = require('./db/connection');

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mafiya_ai_suggestions_log (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES mafiya_gmb_clients(id) ON DELETE CASCADE,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Successfully created mafiya_ai_suggestions_log table.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
