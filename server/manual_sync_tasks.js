const pool = require('./db/connection.js');
async function run() {
  const insertTask = async (lead_id, type) => {
    const exists = await pool.query('SELECT id FROM sales_tasks WHERE lead_id = $1 AND task_type = $2 AND DATE(created_at) = CURRENT_DATE', [lead_id, type]);
    if (exists.rows.length === 0) {
      await pool.query('INSERT INTO sales_tasks (lead_id, task_type) VALUES ($1, $2)', [lead_id, type]);
    }
  };

  const calls = await pool.query("SELECT id as lead_id FROM leads WHERE call_booked_at >= CURRENT_DATE AND call_booked_at < CURRENT_DATE + INTERVAL '1 day'");
  for (const c of calls.rows) await insertTask(c.lead_id, 'call');
  
  const followups = await pool.query("SELECT id as lead_id FROM leads WHERE next_followup_due >= CURRENT_DATE AND next_followup_due < CURRENT_DATE + INTERVAL '1 day'");
  for (const f of followups.rows) await insertTask(f.lead_id, 'followup');

  const overdue = await pool.query("SELECT id as lead_id FROM leads WHERE next_followup_due < NOW() AND status != 'converted' LIMIT 50");
  for (const o of overdue.rows) await insertTask(o.lead_id, 'overdue');

  const hot = await pool.query("SELECT id as lead_id FROM leads WHERE status = 'hot' ORDER BY score DESC LIMIT 10");
  for (const h of hot.rows) await insertTask(h.lead_id, 'hot_lead');

  console.log('Done inserting tasks manually');
  pool.end();
}
run();
