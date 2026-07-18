require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'leados',
});

async function run() {
  try {
    const res = await pool.query(`
      INSERT INTO campaigns (name, status, scheduled_at, created_at, client_id)
      VALUES ('Test Marketing Campaign', 'scheduled', NOW(), NOW(), 1)
      RETURNING id, name
    `);
    console.log('✅ Successfully created a test campaign!');
    console.log('Campaign Details:', res.rows[0]);
    console.log('\nYou can now click "Test Workflow" in n8n. It will pick up this campaign!');
  } catch (err) {
    console.error('❌ Error creating campaign:', err);
  } finally {
    pool.end();
  }
}

run();
