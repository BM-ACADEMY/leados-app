/* eslint-env node */
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
        is_demo       BOOLEAN DEFAULT FALSE,
        date_detected TIMESTAMP DEFAULT NOW()
      )
    `);
    // Safe column addition
    await pool.query(`ALTER TABLE thedal_rank_drop_alerts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE`);

    // Clean up old seeded alerts from Live Mode (since they were created before is_demo column existed)
    const mockKeywords = [
      'top rated agency in city',
      'local seo experts near me',
      'affordable web design',
      'digital marketing company',
      'how to improve seo',
      'b2b lead generation'
    ];
    await pool.query(`
      DELETE FROM thedal_rank_drop_alerts 
      WHERE is_demo = FALSE AND (
        keyword = ANY($1) 
        OR keyword LIKE '%services' 
        OR keyword LIKE '%pricing'
      )
    `, [mockKeywords]);
    console.log('Cleaned up old seeded mock alerts from Live Mode table.');
  } catch (err) {
    console.error('Failed to create thedal_rank_drop_alerts table', err);
  }
};
ensureTable();

// ── HELPERS ──────────────────────────────────────────────────
const keywordsFile = path.join(__dirname, '../data/keywords.json');

const getTrackedKeywords = () => {
  try {
    if (fs.existsSync(keywordsFile)) {
      return JSON.parse(fs.readFileSync(keywordsFile, 'utf8'));
    }
  } catch (e) {}
  return [];
};

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
    'SELECT keyword FROM thedal_rank_drop_alerts WHERE client_name = $1 AND is_demo = TRUE', [clientName]
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
        (id, client_id, client_name, keyword, url, old_rank, new_rank, drop_amount, search_volume, traffic_risk, severity, is_critical, is_demo, date_detected)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO NOTHING
    `, [id, clientId || null, clientName, kw.text, kw.url, oldRank, newRank, dropAmount, kw.sv, trafficRisk, severity, isCritical, true, dateDetected]);
  }
}

// ── GET /count — unread count for active mode (for sidebar badge) ──
router.get('/count', async (req, res) => {
  const { client } = req.query;
  const useDemoMode = req.headers['x-data-mode'] === 'demo';
  try {
    let query = 'SELECT COUNT(*) FROM thedal_rank_drop_alerts WHERE acknowledged = FALSE AND is_demo = $1';
    const params = [useDemoMode];
    if (client) {
      query += ' AND client_name = $2';
      params.push(client);
    }
    const result = await pool.query(query, params);
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.json({ count: 0 });
  }
});

// ── GET /history — acknowledged alerts for active mode ──
router.get('/history', async (req, res) => {
  const { client } = req.query;
  const useDemoMode = req.headers['x-data-mode'] === 'demo';
  try {
    const result = await pool.query(
      `SELECT * FROM thedal_rank_drop_alerts
       WHERE acknowledged = TRUE AND is_demo = $1 ${client ? 'AND client_name = $2' : ''}
       ORDER BY acknowledged_at DESC LIMIT 50`,
      client ? [useDemoMode, client] : [useDemoMode]
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

  const useDemoMode = req.headers['x-data-mode'] === 'demo';

  try {
    if (useDemoMode) {
      // Seed mock data for this client under demo mode if none exist yet
      const check = await pool.query(
        'SELECT id FROM thedal_rank_drop_alerts WHERE client_name = $1 AND is_demo = TRUE LIMIT 1', [client]
      );
      if (check.rows.length === 0) {
        await seedAlertsForClient(client_id || null, client);
      }
    } else {
      // In Live mode, do NOT seed random alerts. Parse actual rank drops from keywords.json
      try {
        const tracked = getTrackedKeywords();
        const clientKeywords = tracked.filter(k => {
          const target = k.targetUrl?.toLowerCase() || '';
          return target.includes(client.toLowerCase()) || target.includes('bmtechx') || target.includes('exportersindia');
        });

        for (const kw of clientKeywords) {
          if (kw.currentRank && kw.previousRank && kw.currentRank > kw.previousRank) {
            const dropAmount = kw.currentRank - kw.previousRank;
            const severity = getSeverity(dropAmount, kw.previousRank, kw.currentRank);
            const isCritical = severity === 'critical';
            const sv = 850; // default estimate
            const trafficRisk = Math.floor(sv * 0.15);
            const alertId = crypto.createHash('md5').update(kw.id + kw.lastChecked).digest('hex').substring(0, 16);

            // Check if alert already logged
            const checkAlert = await pool.query(
              'SELECT id FROM thedal_rank_drop_alerts WHERE id = $1', [alertId]
            );
            if (checkAlert.rows.length === 0) {
              let urlPath = '/';
              try {
                urlPath = new URL(kw.targetUrl).pathname;
              } catch(e) {}

              await pool.query(`
                INSERT INTO thedal_rank_drop_alerts
                  (id, client_id, client_name, keyword, url, old_rank, new_rank, drop_amount, search_volume, traffic_risk, severity, is_critical, is_demo, date_detected)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
              `, [alertId, client_id || null, client, kw.keyword, urlPath, kw.previousRank, kw.currentRank, dropAmount, sv, trafficRisk, severity, isCritical, false]);
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse actual live keyword rank drops:', e);
      }
    }

    const result = await pool.query(
      `SELECT * FROM thedal_rank_drop_alerts
       WHERE client_name = $1 AND acknowledged = FALSE AND is_demo = $2
       ORDER BY is_critical DESC, traffic_risk DESC`,
      [client, useDemoMode]
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
