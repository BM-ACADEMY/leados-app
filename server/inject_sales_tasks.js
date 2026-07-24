const fs = require('fs');
const path = require('path');

const salesosPath = path.join(__dirname, 'routes', 'salesos.js');
let content = fs.readFileSync(salesosPath, 'utf8');

const syncLogic = `
      // Sync tasks to sales_tasks table
      const insertTask = async (lead_id, type) => {
         const exists = await pool.query(\`SELECT id FROM sales_tasks WHERE lead_id = $1 AND task_type = $2 AND DATE(created_at) = CURRENT_DATE\`, [lead_id, type]);
         if (exists.rows.length === 0) {
           await pool.query(\`INSERT INTO sales_tasks (lead_id, task_type) VALUES ($1, $2)\`, [lead_id, type]);
         }
      };
      for (const c of calls.rows) await insertTask(c.lead_id || c.id, 'call');
      for (const f of followups.rows) await insertTask(f.lead_id || f.id, 'followup');
      for (const o of overdue.rows) await insertTask(o.lead_id || o.id, 'overdue');
      for (const h of hot.rows) await insertTask(h.lead_id || h.id, 'hot_lead');
      
      const salesperson_summaries =`;

content = content.replace('      const salesperson_summaries =', syncLogic);

const newRoutes = `

// ==========================================
// Sales Person Tasks API
// ==========================================
router.get('/sales-tasks', async (req, res) => {
  try {
    const result = await pool.query(\`
      SELECT st.*, l.name, l.phone, l.email, l.status as lead_status 
      FROM sales_tasks st
      JOIN leads l ON st.lead_id = l.id
      WHERE DATE(st.created_at) = CURRENT_DATE
      ORDER BY st.status DESC, st.created_at DESC
    \`);
    res.json({ success: true, tasks: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/sales-tasks/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    let query = \`UPDATE sales_tasks SET status = $1, updated_at = NOW()\`;
    if (status === 'completed') {
      query += \`, completed_at = NOW()\`;
    }
    query += \` WHERE id = $2 RETURNING *\`;
    const result = await pool.query(query, [status, req.params.id]);
    res.json({ success: true, task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;`;

content = content.replace('module.exports = router;', newRoutes);

fs.writeFileSync(salesosPath, content, 'utf8');
console.log('Successfully updated salesos.js');
