const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { sendGmbConnectEmail } = require('../utils/mafiya-email');

// GET all GMB clients
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mafiya_gmb_clients ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('[Mafiya] GET /clients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new GMB client
router.post('/', async (req, res) => {
  const {
    business_name,
    business_category,
    custom_category,
    contact_person,
    phone_number,
    website_url,
    gmb_url,
    gmb_email,
    logo_url,
  } = req.body;

  if (!business_name || !contact_person || !phone_number) {
    return res.status(400).json({ error: 'business_name, contact_person, and phone_number are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO mafiya_gmb_clients
        (business_name, business_category, custom_category, contact_person, phone_number, website_url, gmb_url, gmb_email, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [business_name, business_category, custom_category, contact_person, phone_number, website_url, gmb_url, gmb_email, logo_url]
    );

    const savedClient = result.rows[0];

    // Send GMB authorization email if gmb_email is provided
    if (gmb_email) {
      sendGmbConnectEmail(savedClient).catch(err => {
        console.error('[Mafiya] Failed to send GMB connect email:', err.message);
      });
    }

    res.status(201).json({ ...savedClient, email_sent: !!gmb_email });
  } catch (err) {
    console.error('[Mafiya] POST /clients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT: Update a GMB client
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    business_name,
    business_category,
    custom_category,
    contact_person,
    phone_number,
    website_url,
    gmb_url,
    gmb_email,
    logo_url,
  } = req.body;

  if (!business_name || !contact_person || !phone_number) {
    return res.status(400).json({ error: 'business_name, contact_person, and phone_number are required' });
  }

  try {
    const result = await pool.query(
      `UPDATE mafiya_gmb_clients
       SET business_name = $1, business_category = $2, custom_category = $3, contact_person = $4, phone_number = $5, website_url = $6, gmb_url = $7, gmb_email = $8, logo_url = $9
       WHERE id = $10
       RETURNING *`,
      [business_name, business_category, custom_category, contact_person, phone_number, website_url, gmb_url, gmb_email, logo_url, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Mafiya] PUT /clients/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a GMB client
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM mafiya_gmb_clients WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    console.error('[Mafiya] DELETE /clients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST: Resend GMB connect email
router.post('/:id/resend-email', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM mafiya_gmb_clients WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = result.rows[0];
    if (!client.gmb_email) {
      return res.status(400).json({ error: 'Client does not have a GMB email configured' });
    }

    await sendGmbConnectEmail(client);
    res.json({ success: true, message: 'Verification email sent successfully' });
  } catch (err) {
    console.error('[Mafiya] POST /clients/:id/resend-email error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST: Disconnect GMB connection for a client
router.post('/:id/disconnect-gmb', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM mafiya_gmb_tokens WHERE client_id = $1', [id]);
    const result = await pool.query(
      `UPDATE mafiya_gmb_clients 
       SET gmb_verified = false, reviews_cache = NULL, reviews_updated_at = NULL 
       WHERE id = $1 RETURNING *`, 
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ success: true, message: 'GMB disconnected successfully' });
  } catch (err) {
    console.error('[Mafiya] POST /clients/:id/disconnect-gmb error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
