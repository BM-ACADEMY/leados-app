require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});

async function run() {
  try {
    // 1. Get client_id for Bm Academy
    const { rows: clients } = await pool.query("SELECT id FROM clients WHERE name ILIKE '%bm academy%' OR name ILIKE '%bm-academy%' LIMIT 1");
    if (!clients.length) throw new Error("BM Academy client not found");
    const clientId = clients[0].id;

    // 2. Delete existing lead if any
    await pool.query("DELETE FROM leads WHERE phone = '917339017112'");
    console.log("Deleted existing test lead (if any).");

    // 3. Insert the lead
    const { rows: leads } = await pool.query(`
      INSERT INTO leads (name, phone, interest, source, client_id, status, flow_step, score, created_at)
      VALUES ('snega', '917339017112', 'Web developement', 'Instagram DM', $1, 'new', 'welcome', 10, NOW())
      RETURNING id, phone;
    `, [clientId]);
    
    console.log("Lead inserted successfully:", leads[0]);
    
    // 4. Trigger the n8n webhook just like the server would do
    const axios = require('axios');
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("N8N_WEBHOOK_URL not found in .env");

    console.log("Triggering n8n webhook at", webhookUrl);
    await axios.post(webhookUrl, {
      lead_id: leads[0].id,
      phone: leads[0].phone,
      message: 'Hi',
      phone_number_id: '1063493870189640',
      wa_access_token: process.env.META_PAGE_ACCESS_TOKEN,
      gemini_api_key: process.env.GEMINI_API_KEY
    });
    console.log("Webhook triggered successfully!");
    
  } catch(e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
}

run();
