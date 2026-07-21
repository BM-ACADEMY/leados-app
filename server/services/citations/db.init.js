const pool = require('../../db/connection');

async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS citation_scans (
        id SERIAL PRIMARY KEY,
        "businessId" INTEGER REFERENCES mafiya_gmb_clients(id) ON DELETE CASCADE,
        score INTEGER,
        "lastScan" TIMESTAMP DEFAULT NOW(),
        "totalDirectories" INTEGER,
        matched INTEGER,
        mismatched INTEGER,
        missing INTEGER
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS citation_results (
        id SERIAL PRIMARY KEY,
        "scanId" INTEGER REFERENCES citation_scans(id) ON DELETE CASCADE,
        directory VARCHAR(255),
        "listingUrl" TEXT,
        "businessName" VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        website VARCHAR(500),
        status VARCHAR(50), -- Match, Mismatch, Missing, Pending
        confidence INTEGER,
        "checkedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      ALTER TABLE mafiya_gmb_clients ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
    `).catch(err => console.error('[DB Init] failed to alter mafiya_gmb_clients:', err));

    console.log('✅ Mafiya Citation tables checked/created successfully.');
  } catch (err) {
    console.error('❌ Failed to ensure Mafiya citation tables:', err);
  }
}

module.exports = { ensureTables };
