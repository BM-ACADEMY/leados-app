const express = require('express');
const db = require('../db/connection');
const router = express.Router();

// GET /api/pipeline?type=college
router.get('/', async (req, res) => {
  const { type } = req.query;
  try {
    const { rows } = await db.query(`
      SELECT l.id, l.name, c.name as brand_name, l.status,
             l.score, l.source as district
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      ORDER BY COALESCE(l.score, 0) DESC, l.created_at DESC
    `);
    
    // Group by status (new, analysed, contacted, meeting, negotiation, closed)
    const pipeline = {
      new: [], analysed: [], contacted: [], meeting: [], negotiation: [], closed: []
    };
    
    rows.forEach(r => {
      const st = (r.status || 'new').toLowerCase();
      if (pipeline[st]) {
        pipeline[st].push(r);
      } else {
        pipeline['new'].push(r);
      }
    });
    
    res.json({ success: true, pipeline });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/pipeline/:id/stage
router.patch('/:id/stage', async (req, res) => {
  const { status } = req.body;
  try {
    await db.query(`UPDATE leads SET status=$1, updated_at=NOW() WHERE id=$2`, [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
