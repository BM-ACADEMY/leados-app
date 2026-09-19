const express = require('express');
const webpush = require('web-push');
const db = require('../db/connection');

const configured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@abmgroups.org',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[web-push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — background notifications disabled.');
}

let tableReady;
const ensureTable = () => (tableReady ||= db.query(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`).catch((error) => { tableReady = null; throw error; }));

// Sends to every currently-subscribed device. Subscriptions are removed on
// logout, so only logged-in users' devices are notified.
async function sendInboundPush({ title, body, url, leadId }) {
  if (!configured) return;
  try {
    await ensureTable();
    const { rows } = await db.query('SELECT endpoint, p256dh, auth FROM push_subscriptions');
    const payload = JSON.stringify({ title, body, url, leadId });
    await Promise.all(rows.map(async (row) => {
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, { TTL: 3600 });
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]).catch(() => {});
        } else {
          console.error('[web-push] send failed:', error.statusCode || error.message);
        }
      }
    }));
  } catch (error) {
    console.error('[web-push] sendInboundPush failed:', error.message);
  }
}

function createPushRouter({ auth }) {
  const router = express.Router();

  router.get('/public-key', (_req, res) => res.json({ publicKey: configured ? process.env.VAPID_PUBLIC_KEY : null }));

  router.post('/subscribe', auth, async (req, res) => {
    const sub = req.body?.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return res.status(400).json({ error: 'Invalid subscription.' });
    try {
      await ensureTable();
      await db.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1,$2,$3,$4)
         ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
        [req.user?.id || null, sub.endpoint, sub.keys.p256dh, sub.keys.auth]
      );
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  router.post('/unsubscribe', auth, async (req, res) => {
    try {
      await ensureTable();
      await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [req.body?.endpoint || '']);
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  return router;
}

module.exports = { sendInboundPush, createPushRouter };
