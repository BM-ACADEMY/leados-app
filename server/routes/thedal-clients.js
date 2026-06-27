const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

// GET all clients
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM thedal_clients ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new client
router.post('/', async (req, res) => {
  const { domain, plan, client_name, phone, email, business_name, business_category, subscription_duration } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO thedal_clients (domain, plan, client_name, phone, email, business_name, business_category, subscription_duration, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') RETURNING *`,
      [domain, plan || 'Free', client_name, phone, email, business_name, business_category, subscription_duration || '1 Month']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update client
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { domain, plan, client_name, phone, email, business_name, business_category, subscription_duration, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE thedal_clients
       SET domain = COALESCE($1, domain),
           plan = COALESCE($2, plan),
           client_name = COALESCE($3, client_name),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           business_name = COALESCE($6, business_name),
           business_category = COALESCE($7, business_category),
           subscription_duration = COALESCE($8, subscription_duration),
           status = COALESCE($9, status)
       WHERE id = $10 RETURNING *`,
      [domain, plan, client_name, phone, email, business_name, business_category, subscription_duration, status, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE client
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM thedal_clients WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
