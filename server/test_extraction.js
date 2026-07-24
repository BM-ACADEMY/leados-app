require('dotenv').config();
const axios = require('axios');
const pool = require('./db/connection');

(async () => {
  try {
    await pool.query(`DELETE FROM leads WHERE phone = '+999999999'`);

    // 1. Create a dummy lead
    const leadRes = await pool.query(`INSERT INTO leads (name, phone) VALUES ('Old Name', '+999999999') RETURNING id`);
    const lead_id = leadRes.rows[0].id;
    console.log("Created dummy lead:", lead_id);

    // 2. Call /ai/response simulating the user providing a name and time
    const response = await axios.post('http://localhost:3600/api/ai/response', {
      message: "Actually my name is Alice and I want to book a call for tomorrow at 2 PM",
      intent: "BOOK_CALL",
      brand: "BM Academy",
      lead_id: lead_id,
      chat_history: []
    });
    
    console.log("AI Reply returned to n8n:", response.data.ai_reply);

    // 3. Check database to see if name and call_booked_at were updated
    const checkRes = await pool.query(`SELECT name, call_booked_at FROM leads WHERE id = $1`, [lead_id]);
    console.log("Database Lead Data:", checkRes.rows[0]);
    
    // Clean up
    await pool.query(`DELETE FROM leads WHERE id = $1`, [lead_id]);

  } catch (err) {
    console.error(err?.response?.data || err.message);
  } finally {
    pool.end();
  }
})();
