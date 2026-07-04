const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

(async () => {
  try {
    const leadRes = await pool.query(`
      SELECT l.*, c.phone_number_id, c.wa_access_token
      FROM leads l
      JOIN clients c ON l.client_id = c.id
      WHERE l.id = 8
    `);
    
    if (!leadRes.rows.length) {
      console.log('Lead not found');
      return;
    }
    const lead = leadRes.rows[0];
    console.log('Lead:', lead.phone);
    console.log('Phone number ID:', lead.phone_number_id);
    
    try {
      const waRes = await axios.post(
        `https://graph.facebook.com/v18.0/${lead.phone_number_id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: lead.phone.replace(/\D/g, ''),
          type: 'text',
          text: { body: 'Test message' }
        },
        { headers: { Authorization: `Bearer ${lead.wa_access_token}`, 'Content-Type': 'application/json' } }
      );
      console.log('WA success:', waRes.data);
    } catch (e) {
      console.error('WA API Error:', e.response?.data || e.message);
    }
  } catch (e) {
    console.error('DB Error:', e);
  } finally {
    pool.end();
  }
})();
