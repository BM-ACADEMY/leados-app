const fs = require('fs');
const path = require('path');

const salesosPath = path.join(__dirname, 'routes', 'salesos.js');
let content = fs.readFileSync(salesosPath, 'utf8');

const newEndpoint = `
// ==========================================
// Bot Integration: Book a Call
// ==========================================
router.post('/leads/book-call', async (req, res) => {
  try {
    const { lead_id, booking_time } = req.body;
    
    if (!lead_id || !booking_time) {
      return res.status(400).json({ success: false, error: "Missing lead_id or booking_time" });
    }

    const result = await pool.query(
      \`UPDATE leads SET call_booked_at = $1, updated_at = NOW() WHERE id = $2 RETURNING id, call_booked_at\`,
      [booking_time, lead_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    res.json({ success: true, lead: result.rows[0], message: "Call successfully booked!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;`;

content = content.replace('module.exports = router;', newEndpoint);

fs.writeFileSync(salesosPath, content, 'utf8');
console.log('Successfully added /leads/book-call to salesos.js');
