require('dotenv').config();
const pool = require('./db/connection');

(async () => {
  try {
    const hot = await pool.query(`SELECT id FROM leads WHERE status = 'hot' LIMIT 3`);
    for (const h of hot.rows) {
      await pool.query(`INSERT INTO sales_tasks (lead_id, task_type) VALUES ($1, 'hot_lead')`, [h.id]);
    }
    console.log("Mock tasks inserted.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
})();
