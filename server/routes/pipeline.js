const express = require('express');
const db = require('../db/connection');
const router = express.Router();

// GET /api/pipeline?type=college
router.get('/', async (req, res) => {
  const { type } = req.query;
  try {
    const { rows } = await db.query(`
      SELECT o.id, o.name, o.district, o.status,
             a.score, a.offer_recommended, a.personalisation_hook
      FROM organisations o
      LEFT JOIN ai_analysis a ON o.id = a.org_id
      WHERE o.type = $1
      ORDER BY COALESCE(a.score, 0) DESC, o.created_at DESC
    `, [type]);
    
    // Group by status (new, analysed, contacted, meeting, closed)
    const pipeline = {
      new: [], analysed: [], contacted: [], meeting: [], closed: []
    };
    
    rows.forEach(r => {
      if (pipeline[r.status]) {
        pipeline[r.status].push(r);
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
    await db.query(`UPDATE organisations SET status=$1, updated_at=NOW() WHERE id=$2`, [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
