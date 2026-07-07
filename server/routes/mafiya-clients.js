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
  } = req.body;

  if (!business_name || !contact_person || !phone_number) {
    return res.status(400).json({ error: 'business_name, contact_person, and phone_number are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO mafiya_gmb_clients
        (business_name, business_category, custom_category, contact_person, phone_number, website_url, gmb_url, gmb_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [business_name, business_category, custom_category, contact_person, phone_number, website_url, gmb_url, gmb_email]
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

module.exports = router;
