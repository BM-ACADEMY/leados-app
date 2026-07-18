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
    // 1. Get the template ID for the common welcome message
    const tempRes = await pool.query("SELECT id FROM templates WHERE name = 'common_welcome_message' LIMIT 1");
    if (!tempRes.rows.length) throw new Error("Template 'common_welcome_message' not found!");
    const templateId = tempRes.rows[0].id;

    // 2. Insert or update the test lead with phone 8807226257
    const leadRes = await pool.query(`
      INSERT INTO leads (name, phone, client_id, status, source) 
      VALUES ('Test User', '8807226257', 1, 'NEW', 'csv_n8n_test')
      ON CONFLICT (phone, client_id) DO UPDATE SET source = 'csv_n8n_test'
      RETURNING id
    `);
    
    // Clear the frequency cap in case we tested recently
    await pool.query("DELETE FROM campaign_logs WHERE lead_id = $1", [leadRes.rows[0].id]);

    // 3. Create the campaign targeting ONLY this test lead
    const campRes = await pool.query(`
      INSERT INTO campaigns (name, status, scheduled_at, created_at, client_id, template_id, target_status)
      VALUES ('Live WhatsApp Test', 'scheduled', NOW(), NOW(), 1, $1, 'csv_n8n_test')
      RETURNING id, name
    `, [templateId]);

    console.log('✅ Successfully setup live WhatsApp test!');
    console.log('Campaign Details:', campRes.rows[0]);
    console.log('\nYou can now click "Test Workflow" in n8n. It will pick up this campaign and send a real WhatsApp to 8807226257!');
  } catch (err) {
    console.error('❌ Error setup test:', err);
  } finally {
    pool.end();
  }
}

run();
