const pool = require('./db/connection');

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mafiya_geogrid_scans_log (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES mafiya_gmb_clients(id) ON DELETE CASCADE,
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Successfully created mafiya_geogrid_scans_log table.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
