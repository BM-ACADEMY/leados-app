const express = require('express');
const db = require('../db/connection');
const router = express.Router();

// GET /api/prompts
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM prompt_templates ORDER BY id ASC'
    );
    res.json({ success: true, prompts: rows });
  } catch (err) {
    console.error('Error fetching prompts:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/prompts
router.post('/', async (req, res) => {
  const { name, purpose, prompt_text, active = true } = req.body;
  if (!name || !prompt_text) {
    return res.status(400).json({ success: false, message: 'Name and prompt text are required' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO prompt_templates (name, purpose, prompt_text, active, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [name, purpose, prompt_text, active]
    );
    res.status(201).json({ success: true, prompt: rows[0] });
  } catch (err) {
    console.error('Error creating prompt:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/prompts/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, purpose, prompt_text, active } = req.body;

  if (!name || !prompt_text) {
    return res.status(400).json({ success: false, message: 'Name and prompt text are required' });
  }

  try {
    const { rows } = await db.query(
      `UPDATE prompt_templates
       SET name = $1, purpose = $2, prompt_text = $3, active = COALESCE($4, active), updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, purpose, prompt_text, active, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Prompt not found' });
    }

    res.json({ success: true, prompt: rows[0] });
  } catch (err) {
    console.error('Error updating prompt:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/prompts/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query(
      'DELETE FROM prompt_templates WHERE id = $1',
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Prompt not found' });
    }

    res.json({ success: true, message: 'Prompt deleted successfully' });
  } catch (err) {
    console.error('Error deleting prompt:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
