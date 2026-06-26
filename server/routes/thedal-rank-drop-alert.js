/* eslint-env node */
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const crypto = require('crypto');

require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user:     process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

// ── ENSURE TABLE EXISTS ──────────────────────────────────────
const ensureTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS thedal_rank_drop_alerts (
        id            VARCHAR(16) PRIMARY KEY,
        client_id     INTEGER,
        client_name   VARCHAR(255),
        keyword       TEXT,
        url           TEXT,
        old_rank      INTEGER,
        new_rank      INTEGER,
        drop_amount   INTEGER,
        search_volume INTEGER,
        traffic_risk  INTEGER,
        severity      VARCHAR(16) DEFAULT 'info',
        is_critical   BOOLEAN DEFAULT FALSE,
        acknowledged  BOOLEAN DEFAULT FALSE,
        acknowledged_at TIMESTAMP,
        note          TEXT,
        date_detected TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error('Failed to create thedal_rank_drop_alerts table', err);
  }
};
ensureTable();

// ── HELPERS ──────────────────────────────────────────────────
function seededRandom(seedStr, min, max) {
  const hash = crypto.createHash('md5').update(seedStr).digest('hex');
  const num = parseInt(hash.substring(0, 8), 16);
  return min + (num % (max - min + 1));
}

function getSeverity(dropAmount, oldRank, newRank) {
  const wasPage1 = oldRank <= 10;
  const isPage1 = newRank <= 10;
  if (wasPage1 && !isPage1) return 'critical';
  if (dropAmount >= 10) return 'critical';
  if (dropAmount >= 5) return 'warning';
  return 'info';
}

async function seedAlertsForClient(clientId, clientName) {
  const baseKeywords = [
    { text: 'best ' + (clientName.split(' ')[0] || 'local') + ' services', url: '/services', sv: 1200 },
    { text: 'top rated agency in city', url: '/about', sv: 850 },
    { text: clientName + ' pricing', url: '/pricing', sv: 450 },
    { text: 'local seo experts near me', url: '/seo-services', sv: 3200 },
    { text: 'affordable web design', url: '/web-design', sv: 5400 },
    { text: 'digital marketing company', url: '/', sv: 8100 },
    { text: 'how to improve seo', url: '/blog/improve-seo', sv: 1500 },
    { text: 'b2b lead generation', url: '/lead-gen', sv: 2100 }
  ];

  const dropCount = seededRandom(clientName + 'count', 3, 6);
  const existing = await pool.query(
    'SELECT keyword FROM thedal_rank_drop_alerts WHERE client_name = $1', [clientName]
  );
  const existingKeywords = new Set(existing.rows.map(r => r.keyword));

  for (let i = 0; i < dropCount; i++) {
    const kw = baseKeywords[seededRandom(clientName + i, 0, baseKeywords.length - 1)];
    if (existingKeywords.has(kw.text)) continue;

    const oldRank = seededRandom(clientName + i + 'old', 1, 15);
    const dropAmount = seededRandom(clientName + i + 'drop', 3, 25);
    const newRank = oldRank + dropAmount;
    const severity = getSeverity(dropAmount, oldRank, newRank);
    const isCritical = severity === 'critical';

    const wasPage1 = oldRank <= 10;
    const isPage1 = newRank <= 10;
    const sv = Number(kw.sv) || 0;
    let trafficRisk = 0;
    if (wasPage1 && !isPage1) trafficRisk = Math.floor(sv * 0.15);
    else if (dropAmount >= 10) trafficRisk = Math.floor(sv * 0.05);
    else trafficRisk = Math.floor(sv * 0.02);

    const id = crypto.randomBytes(6).toString('hex');
    const daysAgo = seededRandom(clientName + i + 'days', 1, 6);
    const dateDetected = new Date(Date.now() - daysAgo * 86400000).toISOString();

    await pool.query(`
      INSERT INTO thedal_rank_drop_alerts
        (id, client_id, client_name, keyword, url, old_rank, new_rank, drop_amount, search_volume, traffic_risk, severity, is_critical, date_detected)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO NOTHING
    `, [id, clientId || null, clientName, kw.text, kw.url, oldRank, newRank, dropAmount, kw.sv, trafficRisk, severity, isCritical, dateDetected]);
  }
}

// ── GET /count — unread count across all clients (for sidebar badge) ──
router.get('/count', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM thedal_rank_drop_alerts WHERE acknowledged = FALSE'
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.json({ count: 0 });
  }
});

// ── GET /history — all acknowledged alerts ──
router.get('/history', async (req, res) => {
  const { client } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM thedal_rank_drop_alerts
       WHERE acknowledged = TRUE ${client ? 'AND client_name = $1' : ''}
       ORDER BY acknowledged_at DESC LIMIT 50`,
      client ? [client] : []
    );
    res.json({ history: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── GET / — active (unacknowledged) alerts for a client ──
router.get('/', async (req, res) => {
  const { client, client_id } = req.query;
  if (!client) return res.status(400).json({ error: 'client query param required' });

  try {
    // Seed data for this client if none exist yet
    const check = await pool.query(
      'SELECT id FROM thedal_rank_drop_alerts WHERE client_name = $1 LIMIT 1', [client]
    );
    if (check.rows.length === 0) {
      await seedAlertsForClient(client_id || null, client);
    }

    const result = await pool.query(
      `SELECT * FROM thedal_rank_drop_alerts
       WHERE client_name = $1 AND acknowledged = FALSE
       ORDER BY is_critical DESC, traffic_risk DESC`,
      [client]
    );

    const alerts = result.rows;
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const totalTrafficRisk = alerts.reduce((acc, a) => acc + (a.traffic_risk || 0), 0);

    res.json({
      summary: {
        total_alerts: alerts.length,
        critical_drops: critical,
        total_traffic_risk: totalTrafficRisk
      },
      alerts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// ── PUT /:id/acknowledge — persist acknowledgement + optional note ──
router.put('/:id/acknowledge', async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  try {
    const trimmedNote = note ? String(note).slice(0, 1000) : null;
    await pool.query(
      `UPDATE thedal_rank_drop_alerts
       SET acknowledged = TRUE, acknowledged_at = NOW(), note = $1
       WHERE id = $2`,
      [trimmedNote, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

module.exports = router;
