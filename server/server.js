/**
 * LeadOS — ABM Groups Backend API
 * Domain: leados-api.abmgroups.org
 * Port: 3000
 */

const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const axios = require('axios');
const cron = require('node-cron');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3600;

// ── SOCKET.IO ─────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: function (origin, callback) { callback(null, origin || true); },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// ── DB CONNECTION ─────────────────────────────────────────
const pool = require('./db/connection');
const { checkNewDriveVideos, publishPost } = require("./controllers/contentController");

// ── MIDDLEWARE ────────────────────────────────────────────
app.use(morgan('dev')); // ← must be first so every request is logged
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: function (origin, callback) {
    callback(null, origin || true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-key', 'x-data-mode']
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── ALLIANCE OS ROUTES ────────────────────────────────────
const knowledgeRoutes = require('./routes/knowledge');
const uploadRoutes = require('./routes/upload');
const pipelineRoutes = require('./routes/pipeline');
const analyzeRoutes = require('./routes/analyze');
const contentOsRoutes = require('./routes/contentos');

const thedalRoutes = require('./routes/thedal');
const thedalClientsRoutes = require('./routes/thedal-clients');
const thedalPlansRoutes = require('./routes/thedal-plans');
const thedalAuditRoutes = require('./routes/thedal-audit');
const thedalSeoAuditRoutes = require('./routes/thedal-seo-audit');
const thedalKeywordTrackingRoutes = require('./routes/thedal-keywordtracking');
const thedalGscIntelRoutes = require('./routes/thedal-gsc-intel');
const thedalSerpRadarRoutes = require('./routes/thedal-serp-radar');
const thedalGapHunterRoutes = require('./routes/thedal-gap-hunter');
const thedalSchemaLibraryRoutes = require('./routes/thedal-schema-library');
const thedalCompetitorSpyRoutes = require('./routes/thedal-competitor-spy');
const thedalBacklinksRoutes = require('./routes/thedal-backlinks');
const thedalCitationsRoutes = require('./routes/thedal-citations');
const thedalLocalSeoBridgeRoutes = require('./routes/thedal-localseobridge');
const thedalRankDropAlertRoutes = require('./routes/thedal-rank-drop-alert');
const thedalContentRoutes = require('./routes/thedal-content');
const contentRoutes = require('./routes/contentRoutes');


app.use('/api/knowledge', knowledgeRoutes); // We should use auth but let's check auth middleware later
app.use('/api/upload', uploadRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/analyze', analyzeRoutes);

// ── AUTH MIDDLEWARE ───────────────────────────────────────
const auth = (req, res, next) => {
  // Bypass JWT auth for OAuth redirect routes where the browser doesn't send a token
  if (req.path.includes('/auth/google') || req.path.includes('/auth/callback')) {
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const internalAuth = (req, res, next) => {
  if (req.headers['x-internal-key'] === process.env.INTERNAL_API_KEY) return next();
  return auth(req, res, next);
};

// ── CONTENT OS ROUTES ─────────────────────────────────────
app.use('/api/content', internalAuth, contentRoutes);
app.use('/api/content-os', internalAuth, contentOsRoutes);

// Thedal OS Routes
app.use('/api/thedal/audit', auth, thedalAuditRoutes);
app.use('/api/thedal/plans', auth, thedalPlansRoutes);
app.use('/api/thedal/seo-audit', auth, thedalSeoAuditRoutes);
app.use('/api/thedal/keywordtracking', auth, thedalKeywordTrackingRoutes);
app.use('/api/thedal/gscintel', thedalGscIntelRoutes); // Removed auth so OAuth browser redirects work
app.use('/api/thedal/serpradar', auth, thedalSerpRadarRoutes);
app.use('/api/thedal/gaphunter', auth, thedalGapHunterRoutes);
app.use('/api/thedal/schemalibrary', auth, thedalSchemaLibraryRoutes);
app.use('/api/thedal/competitorspy', auth, thedalCompetitorSpyRoutes);
app.use('/api/thedal/rankdropalert', auth, thedalRankDropAlertRoutes);
app.use('/api/thedal/backlinks', auth, thedalBacklinksRoutes);
app.use('/api/thedal/citations', auth, thedalCitationsRoutes);
app.use('/api/thedal/localseobridge', auth, thedalLocalSeoBridgeRoutes);
app.use('/api/thedal/clients', auth, thedalClientsRoutes);
app.use('/api/thedal/content', auth, thedalContentRoutes);
app.use('/api/thedal', auth, thedalRoutes);

// ── MAFIYA OS ROUTES ──────────────────────────────────────
const mafiyaClientsRoutes = require('./routes/mafiya-clients');
const { router: mafiyaGmbRoutes, handleGoogleCallback } = require('./routes/mafiya-gmb');
const mafiyaTurfRoutes = require('./routes/mafiya-turf');
const mafiyaReviewsRoutes = require('./routes/mafiya-reviews');
const mafiyaInsightsRoutes = require('./routes/mafiya-insights');
app.use('/api/mafiya/clients', auth, mafiyaClientsRoutes);
app.use('/api/mafiya/gmb', mafiyaGmbRoutes); // No auth — email links are clicked by external clients
app.use('/api/mafiya/turf', auth, mafiyaTurfRoutes);
app.use('/api/mafiya/reviews', auth, mafiyaReviewsRoutes);
app.use('/api/mafiya/insights', auth, mafiyaInsightsRoutes);
app.get('/api/auth/google/callback', handleGoogleCallback); // Map the standard OAuth callback to Mafiya GMB handler


// ══════════════════════════════════════════════════════════
// HEALTH
// ══════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ABM LeadOS API', ts: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { current, newPassword } = req.body;
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
// INBOX ROUTES
// ══════════════════════════════════════════════════════════

// GET /api/inbox
app.get('/api/inbox', auth, async (req, res) => {
  try {
    // Fetch latest message per lead
    const q = `
      SELECT 
        l.id, 
        l.name, 
        c.name as brand, 
        l.status,
        (SELECT message FROM conversations WHERE lead_id = l.id ORDER BY sent_at DESC LIMIT 1) as last,
        (SELECT sent_at FROM conversations WHERE lead_id = l.id ORDER BY sent_at DESC LIMIT 1) as time,
        COALESCE((SELECT SUM(unread_count) FROM conversations WHERE lead_id = l.id), 0) as unread
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE EXISTS (SELECT 1 FROM conversations WHERE lead_id = l.id)
      ORDER BY time DESC NULLS LAST
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error('Inbox fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/conversations/:lead_id/read
app.put('/api/conversations/:lead_id/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE conversations SET unread_count = 0 WHERE lead_id = $1', [req.params.lead_id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
// MESSAGES ROUTES (CRM-SIDE)
// ══════════════════════════════════════════════════════════

// PUT /api/messages/:id/edit
app.put('/api/messages/:id/edit', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const msgId = req.params.id;
    // Do not attempt to update optimistic UI messages on the backend
    if (String(msgId).startsWith('optimistic-')) {
      return res.status(400).json({ error: 'Cannot edit an unsaved message' });
    }
    const { rows } = await pool.query('UPDATE messages SET content = $1 WHERE id = $2 RETURNING *', [content, msgId]);
    if (rows.length) {
      io.emit('message_edited', rows[0]);
    }
    res.json({ success: true, message: rows[0] });
  } catch (err) {
    console.error('Edit message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/messages/:id/delete
app.put('/api/messages/:id/delete', auth, async (req, res) => {
  try {
    const msgId = req.params.id;
    if (String(msgId).startsWith('optimistic-')) {
      return res.status(400).json({ error: 'Cannot delete an unsaved message' });
    }
    const { rows } = await pool.query('UPDATE messages SET is_deleted = true WHERE id = $1 RETURNING *', [msgId]);
    if (rows.length) {
      io.emit('message_deleted', rows[0]);
    }
    res.json({ success: true, message: rows[0] });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/messages/:id/pin
app.put('/api/messages/:id/pin', auth, async (req, res) => {
  try {
    const msgId = req.params.id;
    const { duration, unpin } = req.body; // duration in hours: 24, 168 (7 days), 720 (30 days)

    if (String(msgId).startsWith('optimistic-')) {
      return res.status(400).json({ error: 'Cannot pin an unsaved message' });
    }

    let query;
    let params;

    if (unpin) {
      query = 'UPDATE messages SET pinned_until = NULL WHERE id = $1 RETURNING *';
      params = [msgId];
    } else {
      query = `UPDATE messages SET pinned_until = NOW() + interval '1 hour' * $1 WHERE id = $2 RETURNING *`;
      params = [duration || 24, msgId];
    }

    const { rows } = await pool.query(query, params);
    if (rows.length) {
      io.emit('message_edited', rows[0]); // reuse message_edited or create message_pinned event
    }
    res.json({ success: true, message: rows[0] });
  } catch (err) {
    console.error('Pin message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/messages/:id/star
app.put('/api/messages/:id/star', auth, async (req, res) => {
  try {
    const msgId = req.params.id;
    const { is_starred } = req.body;

    if (String(msgId).startsWith('optimistic-')) {
      return res.status(400).json({ error: 'Cannot star an unsaved message' });
    }

    const { rows } = await pool.query(
      'UPDATE messages SET is_starred = $1 WHERE id = $2 RETURNING *',
      [is_starred, msgId]
    );

    if (rows.length) {
      io.emit('message_edited', rows[0]);
    }
    res.json({ success: true, message: rows[0] });
  } catch (err) {
    console.error('Star message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/messages/:id/react
// Body: { emoji: "👍", action: "add" | "remove" }
app.put('/api/messages/:id/react', auth, async (req, res) => {
  try {
    const msgId = req.params.id;
    const { emoji, action } = req.body;

    if (!emoji) return res.status(400).json({ error: 'emoji is required' });
    if (String(msgId).startsWith('optimistic-')) {
      return res.status(400).json({ error: 'Cannot react to an unsaved message' });
    }

    // Get current message details, lead, and client credentials
    const msgQuery = await pool.query(`
      SELECT m.reactions, m.wa_msg_id, l.phone, c.phone_number_id, c.wa_access_token
      FROM messages m
      JOIN conversations cv ON m.conversation_id = cv.id
      JOIN leads l ON cv.lead_id = l.id
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE m.id = $1
    `, [msgId]);

    if (!msgQuery.rows.length) return res.status(404).json({ error: 'Message not found' });
    const msgData = msgQuery.rows[0];

    const reactions = msgData.reactions || {};
    if (action === 'remove') {
      if (reactions[emoji] && reactions[emoji] > 1) {
        reactions[emoji] = reactions[emoji] - 1;
      } else {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji] = (reactions[emoji] || 0) + 1;
    }

    const { rows } = await pool.query(
      'UPDATE messages SET reactions = $1::jsonb WHERE id = $2 RETURNING *',
      [JSON.stringify(reactions), msgId]
    );

    // Send the reaction to Meta API if we have a WhatsApp message ID (wa_msg_id)
    if (msgData.wa_msg_id) {
      const phoneNumberId = msgData.phone_number_id || process.env.WA_PHONE_NUMBER_ID;
      const waAccessToken = msgData.wa_access_token || process.env.META_PAGE_ACCESS_TOKEN;

      if (phoneNumberId && waAccessToken) {
        try {
          const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: (msgData.phone || '').replace(/\D/g, ''),
            type: 'reaction',
            reaction: {
              message_id: msgData.wa_msg_id,
              emoji: action === 'remove' ? '' : emoji
            }
          };

          await axios.post(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            payload,
            { headers: { Authorization: `Bearer ${waAccessToken}`, 'Content-Type': 'application/json' } }
          );
          console.log(`✅ Reaction sent to WhatsApp for message ID: ${msgData.wa_msg_id}`);
        } catch (waErr) {
          console.error('❌ Meta Reaction Send Error:', waErr.response?.data || waErr.message);
        }
      }
    }

    if (rows.length) {
      io.emit('message_edited', rows[0]);
    }
    res.json({ success: true, message: rows[0] });
  } catch (err) {
    console.error('React message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages/upload
const mediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads', 'media');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const mediaUpload = multer({ storage: mediaStorage });

app.post('/api/messages/upload', auth, mediaUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/media/${req.file.filename}`;
  res.json({ success: true, fileUrl });
});

// ══════════════════════════════════════════════════════════
// LEADS ROUTES
// ══════════════════════════════════════════════════════════

// GET /api/leads/sources — distinct source values
app.get('/api/leads/sources', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT source FROM leads WHERE source IS NOT NULL AND source <> '' ORDER BY source`
    );
    const sources = rows.map(r => r.source);
    res.json({ sources });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads
app.get('/api/leads', auth, async (req, res) => {
  try {
    const { status, brand, search, limit = 100, offset = 0 } = req.query;
    let q = `
      SELECT l.*, c.name as brand_name, u.name as assigned_name,
        COALESCE((SELECT SUM(unread_count) FROM conversations WHERE lead_id = l.id), 0) as unread,
        (SELECT MAX(last_message_at) FROM conversations WHERE lead_id = l.id) as last_contact,
        (
          SELECT json_build_object(
            'content', m.content,
            'msg_type', m.msg_type,
            'media_url', m.media_url,
            'is_deleted', m.is_deleted
          )
          FROM messages m
          JOIN conversations cv ON m.conversation_id = cv.id
          WHERE cv.lead_id = l.id
          ORDER BY m.sent_at DESC, m.id DESC
          LIMIT 1
        ) as last_msg
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      q += ` AND l.status = $${params.length}`;
    }
    if (brand && brand !== 'All Brands') {
      params.push(`%${brand}%`);
      q += ` AND c.name ILIKE $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      const likeParam = `$${params.length}`;
      
      params.push(search);
      const searchParam = `$${params.length}`;
      
      q += ` AND (l.name ILIKE ${likeParam} OR l.phone ILIKE ${likeParam} OR l.name % ${searchParam} OR l.phone % ${searchParam})`;
    }

    if (search) {
      const searchParamIndex = params.length; // points to the exact search term param
      q += ` ORDER BY similarity(l.name, $${searchParamIndex}) DESC, similarity(l.phone, $${searchParamIndex}) DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    } else {
      q += ` ORDER BY COALESCE((SELECT MAX(last_message_at) FROM conversations WHERE lead_id = l.id), l.created_at) DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    }
    params.push(limit, offset);

    const { rows } = await pool.query(q, params);
    const total = await pool.query('SELECT COUNT(*) FROM leads');
    res.json({ leads: rows, total: parseInt(total.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads/:id
app.get('/api/leads/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT l.*, c.name as brand_name, c.phone_number_id, c.wa_access_token,
             u.name as assigned_name
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.id = $1
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Lead not found' });

    // Join conversations (thread) → messages (individual) for this lead
    const conversations = await pool.query(`
      SELECT m.id, m.direction, m.content, m.msg_type as type, m.media_url, m.wa_msg_id,
             m.status, m.is_ai, m.sent_at as timestamp, m.read_at, m.is_deleted, m.is_forwarded, m.pinned_until, m.is_starred, m.reactions,
             CASE WHEN m.reply_to_wa_id IS NOT NULL THEN (
               SELECT json_build_object('direction', r.direction, 'media_url', r.media_url, 'content', r.content, 'msg_type', r.msg_type)
               FROM messages r WHERE r.wa_msg_id = m.reply_to_wa_id LIMIT 1
             ) ELSE NULL END as reply_to
      FROM messages m
      JOIN conversations cv ON m.conversation_id = cv.id
      WHERE cv.lead_id = $1
      ORDER BY m.sent_at ASC
    `, [req.params.id]);

    res.json({ lead: rows[0], conversations: conversations.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leads
app.post('/api/leads', auth, async (req, res) => {
  try {
    const { name, phone, source, client_id, interest, assigned_to } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

    const { rows } = await pool.query(`
      INSERT INTO leads (name, phone, source, client_id, interest, assigned_to, status, score, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'new', 0, NOW())
      RETURNING *
    `, [name, phone, source || 'Manual', client_id || null, interest || '', assigned_to || null]);

    // Trigger n8n webhook for new leads to send welcome template
    if (process.env.N8N_NEW_LEAD_WEBHOOK_URL) {
      axios.post(process.env.N8N_NEW_LEAD_WEBHOOK_URL, {
        lead_id: rows[0].id,
        name: rows[0].name,
        phone: rows[0].phone,
        client_id: rows[0].client_id,
        phone_number_id: process.env.WA_PHONE_NUMBER_ID,
        wa_access_token: process.env.META_PAGE_ACCESS_TOKEN
      }).catch(e => console.error('[n8n Webhook Error]', e.message));
    }

    res.status(201).json({ lead: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/leads/:id
app.patch('/api/leads/:id', auth, async (req, res) => {
  try {
    const { status, score, assigned_to, interest, notes } = req.body;
    const updates = [];
    const params = [];

    if (status !== undefined) { params.push(status); updates.push(`status = $${params.length}`); }
    if (score !== undefined) { params.push(score); updates.push(`score = $${params.length}`); }
    if (assigned_to !== undefined) { params.push(assigned_to); updates.push(`assigned_to = $${params.length}`); }
    if (interest !== undefined) { params.push(interest); updates.push(`interest = $${params.length}`); }
    if (notes !== undefined) { params.push(notes); updates.push(`notes = $${params.length}`); }

    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE leads SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    res.json({ lead: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/leads/:id
app.delete('/api/leads/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE lead_id = $1)', [id]);
    await pool.query('DELETE FROM conversations WHERE lead_id = $1', [id]);
    await pool.query('DELETE FROM payments WHERE lead_id = $1', [id]);

    const { rowCount } = await pool.query('DELETE FROM leads WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Lead not found' });

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    console.error('Delete lead error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
// WHATSAPP ROUTES
// ══════════════════════════════════════════════════════════

// POST /api/whatsapp/send — manual send from CRM portal
app.post('/api/whatsapp/send', auth, async (req, res) => {
  try {
    const { lead_id, message, media_url, msg_type, reply_to_wa_id, is_forwarded } = req.body;

    const leadRes = await pool.query(`
      SELECT l.*, c.phone_number_id, c.wa_access_token
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE l.id = $1
    `, [lead_id]);

    if (!leadRes.rows.length) return res.status(404).json({ error: 'Lead not found.' });
    const lead = leadRes.rows[0];

    const phoneNumberId = lead.phone_number_id || process.env.WA_PHONE_NUMBER_ID;
    const waAccessToken = lead.wa_access_token || process.env.META_PAGE_ACCESS_TOKEN;

    if (!phoneNumberId || !waAccessToken) {
      return res.status(400).json({ error: 'WhatsApp not configured for this brand. Please add phone_number_id and wa_access_token in Clients settings or server .env file.' });
    }

    const type = msg_type && msg_type !== 'text' ? msg_type : 'text';
    const payload = {
      messaging_product: 'whatsapp',
      to: (lead.phone || '').replace(/\D/g, ''),
      type: type,
    };

    if (reply_to_wa_id) {
      payload.context = { message_id: reply_to_wa_id };
    }

    if (type === 'text') {
      payload.text = { body: message };
    } else {
      const fullMediaUrl = media_url && media_url.startsWith('http') ? media_url : `${process.env.API_URL || 'https://leados-api.abmgroups.org'}${media_url}`;
      payload[type] = { link: fullMediaUrl };
      if (message) payload[type].caption = message; // Optional caption for media
    }

    const waRes = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${waAccessToken}`, 'Content-Type': 'application/json' } }
    );

    const waMessageId = waRes.data.messages?.[0]?.id;
    const phone = lead.phone?.replace(/\D/g, '');

    // Upsert the conversation thread (unique per phone+tenant)
    const convRes = await pool.query(`
      INSERT INTO conversations (lead_id, tenant_id, phone, status, last_message, last_message_at, created_at)
      VALUES ($1, $2, $3, 'open', $4, NOW(), NOW())
      ON CONFLICT (phone, tenant_id) DO UPDATE
        SET lead_id = EXCLUDED.lead_id,
            last_message = EXCLUDED.last_message,
            last_message_at = NOW()
      RETURNING id
    `, [lead_id, lead.tenant_id, phone, message]);
    const conversationId = convRes.rows[0].id;

    // Insert message into messages table
    const { rows: savedRows } = await pool.query(`
      INSERT INTO messages (conversation_id, direction, content, msg_type, media_url, wa_msg_id, status, sent_at, reply_to_wa_id, is_forwarded)
      VALUES ($1, 'outbound', $2, $3, $4, $5, 'sent', NOW(), $6, $7)
      RETURNING id, direction, content, msg_type as type, media_url, wa_msg_id, status, sent_at as timestamp, is_deleted, reply_to_wa_id, is_forwarded
    `, [conversationId, message, type, media_url || null, waMessageId, reply_to_wa_id || null, is_forwarded || false]);

    // Emit real-time event to all CRM clients
    io.emit('outgoing_message', { lead_id: Number(lead_id), message: savedRows[0] });

    res.json({ success: true, message: savedRows[0] });
  } catch (err) {
    console.error('WA send error:', err.response?.data || err.message, err.stack);
    
    res.status(500).json({
      error: 'Failed to send message',
      detail: err.message,
      meta_response: err.response?.data || null,
      stack: err.stack
    });
  }
});

// ── WHATSAPP WEBHOOK ──────────────────────────────────────

// GET — Meta webhook verification
app.get('/webhook/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return res.send(challenge);
  }
  res.sendStatus(403);
});

// POST — incoming WhatsApp messages + template status updates
app.post('/webhook/whatsapp', async (req, res) => {
  res.sendStatus(200); // Always respond 200 immediately to Meta

  try {
    const body = req.body;
    if (!body.object || body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {

        // ── TEMPLATE STATUS UPDATES ──────────────────────────
        if (change.field === 'message_template_status_update') {
          const { event, message_template_id, message_template_name } = change.value;
          console.log(`📋 Template status update: ${message_template_name} → ${event}`);

          let newStatus = null;
          if (event === 'APPROVED') newStatus = 'approved';
          else if (['REJECTED', 'PAUSED', 'DISABLED'].includes(event)) newStatus = 'rejected';
          else if (event === 'PENDING_DELETION') newStatus = 'draft';

          if (newStatus) {
            const updateResult = await pool.query(`
              UPDATE templates
              SET status = $1,
                  approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END
              WHERE meta_template_id = $2 OR name = $3
              RETURNING id, name, status
            `, [newStatus, String(message_template_id), message_template_name]);

            if (updateResult.rows.length) {
              console.log(`✅ Template "${message_template_name}" updated to ${newStatus}`);
            } else {
              console.warn(`⚠️  Could not find template: ${message_template_name} (id: ${message_template_id})`);
            }
          }
          continue;
        }

        // ── INCOMING MESSAGES & DELIVERY STATUSES ────────────
        if (change.field !== 'messages') continue;
        const value = change.value;

        // Handle delivery/read status receipts
        if (value.statuses) {
          for (const s of value.statuses) {
            const wamid = s.id;
            const newStatus = s.status; // 'sent', 'delivered', 'read', 'failed'
            const errorMsg = s.errors ? s.errors[0].title : null;
            if (!wamid) continue;

                      // Update status in messages table (using wa_msg_id)
            await pool.query(`UPDATE messages SET status = $1 WHERE wa_msg_id = $2`, [newStatus, wamid]);
            // Also update campaign_logs for campaign tracking
            await pool.query(`UPDATE campaign_logs SET status = $1 WHERE wa_message_id = $2`, [newStatus, wamid]);

            // Emit real-time status update to CRM
            io.emit('message_status', { wa_message_id: wamid, status: newStatus });
            console.log(`[Webhook Status] ${wamid} → ${newStatus}`);
          }
        }

        // Handle incoming text messages from customers
        for (const msg of value.messages || []) {
          if (msg.type !== 'text') {
            console.log(`[Webhook] Unsupported message type: ${msg.type} from ${msg.from}`);
            continue;
          }

          const phone = msg.from;       // e.g. '919876543210'
          const text = msg.text.body;
          const phoneNumberId = value.metadata.phone_number_id;
          const isForwarded = msg.context?.forwarded || msg.context?.frequently_forwarded || false;

          // Find matching client by phone_number_id
          const client = (await pool.query(
            'SELECT * FROM clients WHERE phone_number_id = $1', [phoneNumberId]
          )).rows[0];

          // Find or auto-create lead by phone number
          let lead = (await pool.query('SELECT * FROM leads WHERE phone = $1', [phone])).rows[0];

          if (!lead) {
            const newLead = await pool.query(`
              INSERT INTO leads (name, phone, source, client_id, status, score, created_at)
              VALUES ($1, $2, 'WhatsApp', $3, 'new', 10, NOW())
              RETURNING *
            `, [phone, phone, client?.id || null]);
            lead = newLead.rows[0];
            console.log(`[Webhook] Auto-created lead for phone: ${phone}`);
          }

                    // Upsert conversation thread (unique per phone+tenant)
          const tenantId = lead.tenant_id || 1;
          const convRes = await pool.query(`
            INSERT INTO conversations (lead_id, tenant_id, phone, status, last_message, last_message_at, created_at)
            VALUES ($1, $2, $3, 'open', $4, NOW(), NOW())
            ON CONFLICT (phone, tenant_id) DO UPDATE
              SET lead_id = EXCLUDED.lead_id,
                  last_message = EXCLUDED.last_message,
                  last_message_at = NOW(),
                  unread_count = COALESCE(conversations.unread_count, 0) + 1
            RETURNING id
          `, [lead.id, tenantId, phone, text]);
          const conversationId = convRes.rows[0].id;

          // Save incoming message to messages table
          const { rows: savedRows } = await pool.query(`
            INSERT INTO messages (conversation_id, direction, content, msg_type, wa_msg_id, status, is_ai, sent_at, is_forwarded)
            VALUES ($1, 'inbound', $2, 'text', $3, 'delivered', false, NOW(), $4)
            RETURNING id, direction, content, msg_type as type, wa_msg_id, status, sent_at as timestamp, is_forwarded
          `, [conversationId, text, msg.id, isForwarded]);


          // ── REAL-TIME: push to CRM Inbox immediately ─────────
          io.emit('incoming_message', { lead_id: lead.id, message: savedRows[0] });
          console.log(`[Webhook] Inbound message from ${phone} saved & emitted via Socket.io`);

          // ── Forward to n8n for AI auto-reply processing ──────
          if (process.env.N8N_WEBHOOK_URL) {
            axios.post(process.env.N8N_WEBHOOK_URL, {
              lead_id: lead.id,
              phone,
              message: text,
              phone_number_id: phoneNumberId
            }).catch(e => console.error('[n8n forward error]', e.message));
          }
        }
      }
    }
  } catch (err) {
    console.error('WA webhook error:', err);
  }
});


// ── META LEADS WEBHOOK ────────────────────────────────────

app.get('/webhook/meta-leads', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) return res.send(challenge);
  res.sendStatus(403);
});

app.post('/webhook/meta-leads', async (req, res) => {
  res.sendStatus(200);
  try {
    const { entry } = req.body;
    for (const e of entry || []) {
      for (const change of e.changes || []) {
        if (change.field !== 'leadgen') continue;
        const leadgenId = change.value.leadgen_id;
        const pageId = change.value.page_id;

        // Fetch full lead from Meta
        const metaLead = await axios.get(
          `https://graph.facebook.com/v18.0/${leadgenId}`,
          { params: { access_token: process.env.META_PAGE_ACCESS_TOKEN } }
        );

        const fields = {};
        for (const f of metaLead.data.field_data || []) {
          fields[f.name] = f.values[0];
        }

        const name = fields.full_name || fields.name || 'Unknown';
        const phone = (fields.phone_number || fields.phone || '').replace(/\D/g, '');
        const email = fields.email || null;

        if (!phone) continue;

        const existing = await pool.query('SELECT id FROM leads WHERE phone = $1', [phone]);
        if (existing.rows.length) continue;

        await pool.query(`
          INSERT INTO leads (name, phone, email, source, status, score, created_at)
          VALUES ($1, $2, $3, 'Meta Ads', 'new', 20, NOW())
        `, [name, phone, email]);
      }
    }
  } catch (err) {
    console.error('Meta leads webhook error:', err.message);
  }
});

// ── RAZORPAY WEBHOOK ──────────────────────────────────────
app.post('/webhook/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  res.sendStatus(200);
  try {
    const event = JSON.parse(req.body);
    if (event.event === 'payment.captured') {
      const { amount, notes } = event.payload.payment.entity;
      const leadId = notes?.lead_id;
      if (leadId) {
        await pool.query(`
          INSERT INTO payments (lead_id, amount, status, razorpay_payment_id, created_at)
          VALUES ($1, $2, 'captured', $3, NOW())
        `, [leadId, amount / 100, event.payload.payment.entity.id]);
        await pool.query(
          "UPDATE leads SET status = 'converted', score = 100 WHERE id = $1", [leadId]
        );
      }
    }
  } catch (err) {
    console.error('Razorpay webhook error:', err.message);
  }
});


// ══════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════
app.post('/api/payments/create-link', auth, async (req, res) => {
  try {
    const { lead_id, amount, description } = req.body;
    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1', [lead_id]);
    if (!leadRes.rows.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = leadRes.rows[0];

    const rzpRes = await axios.post(
      'https://api.razorpay.com/v1/payment_links',
      {
        amount: amount * 100,
        currency: 'INR',
        description,
        customer: { name: lead.name, contact: lead.phone },
        notes: { lead_id: lead_id.toString() },
        callback_url: `${process.env.PORTAL_URL}/payment-success`,
        callback_method: 'get',
      },
      {
        auth: { username: process.env.RAZORPAY_KEY_ID, password: process.env.RAZORPAY_SECRET }
      }
    );

    await pool.query(`
      INSERT INTO payments (lead_id, amount, status, razorpay_link_id, payment_link, created_at)
      VALUES ($1, $2, 'pending', $3, $4, NOW())
    `, [lead_id, amount, rzpRes.data.id, rzpRes.data.short_url]);

    res.json({ payment_link: rzpRes.data.short_url, link_id: rzpRes.data.id });
  } catch (err) {
    console.error('Payment link error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

app.get('/api/payments', auth, async (req, res) => {
  try {
    const { lead_id } = req.query;
    let q = 'SELECT p.*, l.name as lead_name FROM payments p JOIN leads l ON p.lead_id = l.id WHERE 1=1';
    const params = [];
    if (lead_id) { params.push(lead_id); q += ` AND p.lead_id = $${params.length}`; }
    q += ' ORDER BY p.created_at DESC';
    const { rows } = await pool.query(q, params);
    res.json({ payments: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
// TEMPLATES
// ══════════════════════════════════════════════════════════
app.get('/api/templates', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, c.name as brand_name
      FROM templates t
      LEFT JOIN clients c ON t.client_id = c.id
      ORDER BY t.created_at DESC
    `);
    res.json({ templates: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/templates', auth, async (req, res) => {
  try {
    const { name, category, language, header_format, header, body, footer, buttons, client_id } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO templates (name, category, language, header_format, header, body, footer, buttons, client_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW())
      RETURNING *
    `, [name, category, language || 'en', header_format || 'TEXT', header || null, body, footer || null, JSON.stringify(buttons || []), client_id || null]);
    res.status(201).json({ template: rows[0] });
  } catch (err) {
    console.error('Create template err:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/templates/:id/submit — submit to Meta for approval
app.post('/api/templates/:id/submit', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    const tpl = rows[0];

    const client = tpl.client_id
      ? (await pool.query('SELECT * FROM clients WHERE id = $1', [tpl.client_id])).rows[0]
      : null;

    const waToken = client?.wa_access_token || process.env.META_PAGE_ACCESS_TOKEN;
    const waBusinessId = client?.wa_business_id || process.env.WA_BUSINESS_ACCOUNT_ID;

    // Construct Meta components
    const components = [];
    if (tpl.header_format && tpl.header_format !== 'TEXT' && tpl.header_format !== 'NONE') {
      const comp = { type: 'HEADER', format: tpl.header_format };
      if (tpl.header) comp.example = { header_handle: [tpl.header] };
      components.push(comp);
    } else if (tpl.header) {
      components.push({ type: 'HEADER', format: 'TEXT', text: tpl.header });
    }

    components.push({ type: 'BODY', text: tpl.body });
    if (tpl.footer) components.push({ type: 'FOOTER', text: tpl.footer });
    if (tpl.buttons && tpl.buttons.length > 0) {
      components.push({ type: 'BUTTONS', buttons: tpl.buttons });
    }

    const metaRes = await axios.post(
      `https://graph.facebook.com/v18.0/${waBusinessId}/message_templates`,
      {
        name: tpl.name,
        language: tpl.language || 'en',
        category: tpl.category || 'UTILITY',
        components,
      },
      { headers: { Authorization: `Bearer ${waToken}` } }
    );

    await pool.query(`
      UPDATE templates SET status = 'pending', submitted_at = NOW(), meta_template_id = $1 WHERE id = $2
    `, [metaRes.data.id, req.params.id]);

    res.json({ success: true, meta_id: metaRes.data.id });
  } catch (err) {
    console.error('Template submit error:', err.response?.data || err.message);
    const metaErr = err.response?.data?.error;
    const errMsg = metaErr
      ? `Meta API Error (${metaErr.code}): ${metaErr.message}`
      : err.message || 'Failed to submit template';
    res.status(500).json({ error: errMsg, meta_error: metaErr || null });
  }
});

// GET /api/templates/:id/sync — sync status from Meta
app.get('/api/templates/:id/sync', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    const tpl = rows[0];

    const client = tpl.client_id ? (await pool.query('SELECT * FROM clients WHERE id = $1', [tpl.client_id])).rows[0] : null;
    const waToken = client?.wa_access_token || process.env.META_PAGE_ACCESS_TOKEN;
    const waBusinessId = client?.wa_business_id || process.env.WA_BUSINESS_ACCOUNT_ID;

    // Fetch from Meta
    const metaRes = await axios.get(
      `https://graph.facebook.com/v18.0/${waBusinessId}/message_templates?name=${tpl.name}`,
      { headers: { Authorization: `Bearer ${waToken}` } }
    );

    const metaTpl = metaRes.data.data.find(t => t.name === tpl.name && t.language === (tpl.language || 'en'));

    if (metaTpl) {
      const status = metaTpl.status.toLowerCase();
      let updateQuery = 'UPDATE templates SET status = $1, meta_template_id = $2';
      const params = [status, metaTpl.id];

      if (status === 'approved' && !tpl.approved_at) {
        updateQuery += ', approved_at = NOW()';
      }
      updateQuery += ' WHERE id = $3 RETURNING *';
      params.push(tpl.id);

      const { rows: updatedRows } = await pool.query(updateQuery, params);
      return res.json({ template: updatedRows[0] });
    }

    res.json({ template: tpl });
  } catch (err) {
    console.error('Template sync error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to sync template status' });
  }
});

// PUT /api/templates/:id
app.put('/api/templates/:id', auth, async (req, res) => {
  try {
    const { name, category, language, header_format, header, body, footer, buttons, client_id } = req.body;
    const { id } = req.params;

    const { rows: currentRows } = await pool.query('SELECT * FROM templates WHERE id = $1', [id]);
    if (!currentRows.length) return res.status(404).json({ error: 'Template not found' });
    const current = currentRows[0];

    // Build components for Meta
    const components = [];
    const finalHeaderFmt = header_format !== undefined ? header_format : current.header_format;
    const finalHeader = header !== undefined ? header : current.header;

    if (finalHeaderFmt && finalHeaderFmt !== 'TEXT' && finalHeaderFmt !== 'NONE') {
      const comp = { type: 'HEADER', format: finalHeaderFmt };
      if (finalHeader) comp.example = { header_handle: [finalHeader] };
      components.push(comp);
    } else if (finalHeader) {
      components.push({ type: 'HEADER', format: 'TEXT', text: finalHeader });
    }

    components.push({ type: 'BODY', text: body || current.body });
    if (footer !== undefined ? footer : current.footer) components.push({ type: 'FOOTER', text: footer !== undefined ? footer : current.footer });
    const finalBtns = buttons !== undefined ? buttons : current.buttons;
    if (finalBtns && finalBtns.length > 0) {
      components.push({ type: 'BUTTONS', buttons: finalBtns });
    }

    if (current.status !== 'draft' && current.meta_template_id) {
      const client = current.client_id ? (await pool.query('SELECT * FROM clients WHERE id = $1', [current.client_id])).rows[0] : null;
      const waToken = client?.wa_access_token || process.env.META_PAGE_ACCESS_TOKEN;

      await axios.post(
        `https://graph.facebook.com/v18.0/${current.meta_template_id}`,
        { components },
        { headers: { Authorization: `Bearer ${waToken}` } }
      );
    }

    const { rows } = await pool.query(`
      UPDATE templates 
      SET name = COALESCE($1, name), 
          category = COALESCE($2, category), 
          language = COALESCE($3, language),
          header_format = COALESCE($4, header_format),
          header = $5, 
          body = COALESCE($6, body), 
          footer = $7, 
          buttons = COALESCE($8, buttons),
          client_id = COALESCE($9, client_id),
          status = CASE WHEN status != 'draft' THEN 'pending' ELSE status END,
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      name, category, language,
      header_format,
      header !== undefined ? header : current.header,
      body,
      footer !== undefined ? footer : current.footer,
      buttons ? JSON.stringify(buttons) : null,
      client_id || null,
      id
    ]);

    res.json({ template: rows[0] });
  } catch (err) {
    console.error('Template update error:', err.response?.data || err.message);
    const metaErr = err.response?.data?.error;
    const errMsg = metaErr
      ? `Meta API Error (${metaErr.code}): ${metaErr.message}`
      : err.message || 'Failed to update template';
    res.status(500).json({ error: errMsg, meta_error: metaErr || null });
  }
});

// DELETE /api/templates/:id
app.delete('/api/templates/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM templates WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    const tpl = rows[0];

    if (tpl.status !== 'draft') {
      const client = tpl.client_id ? (await pool.query('SELECT * FROM clients WHERE id = $1', [tpl.client_id])).rows[0] : null;
      const waToken = client?.wa_access_token || process.env.META_PAGE_ACCESS_TOKEN;
      const waBusinessId = client?.wa_business_id || process.env.WA_BUSINESS_ACCOUNT_ID;

      try {
        await axios.delete(
          `https://graph.facebook.com/v18.0/${waBusinessId}/message_templates`,
          {
            params: { name: tpl.name },
            headers: { Authorization: `Bearer ${waToken}` }
          }
        );
      } catch (metaErr) {
        console.error('Meta template delete error:', metaErr.response?.data || metaErr.message);
      }
    }

    await pool.query('DELETE FROM templates WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Template delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
// CLIENTS
// ══════════════════════════════════════════════════════════
app.get('/api/clients', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM leads l WHERE l.client_id = c.id) as lead_count,
        (SELECT COUNT(*) FROM leads l WHERE l.client_id = c.id AND l.status = 'converted') as converted_count
      FROM clients c
      ORDER BY c.created_at DESC
    `);
    res.json({ clients: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/clients', auth, async (req, res) => {
  try {
    const { name, type, plan, phone_number_id, wa_access_token, wa_business_id, whatsapp_number, wa_category, wa_description, wa_address, wa_email, wa_website } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO clients (name, type, plan, phone_number_id, wa_access_token, wa_business_id, whatsapp_number, wa_category, wa_description, wa_address, wa_email, wa_website, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW())
      RETURNING *
    `, [name, type, plan, phone_number_id, wa_access_token, wa_business_id, whatsapp_number, wa_category, wa_description, wa_address, wa_email, wa_website]);
    res.status(201).json({ client: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/clients/:id', auth, async (req, res) => {
  try {
    const { phone_number_id, wa_access_token, wa_business_id, whatsapp_number, wa_category, wa_description, wa_address, wa_email, wa_website, status } = req.body;
    await pool.query(`
      UPDATE clients SET
        phone_number_id = COALESCE($1, phone_number_id),
        wa_access_token = COALESCE($2, wa_access_token),
        wa_business_id = COALESCE($3, wa_business_id),
        whatsapp_number = COALESCE($4, whatsapp_number),
        wa_category = COALESCE($5, wa_category),
        wa_description = COALESCE($6, wa_description),
        wa_address = COALESCE($7, wa_address),
        wa_email = COALESCE($8, wa_email),
        wa_website = COALESCE($9, wa_website),
        status = COALESCE($10, status),
        updated_at = NOW()
      WHERE id = $11
    `, [phone_number_id, wa_access_token, wa_business_id, whatsapp_number, wa_category, wa_description, wa_address, wa_email, wa_website, status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/clients/:id', auth, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only administrators can delete clients' });
  }

  const clientDb = await pool.connect();
  try {
    await clientDb.query('BEGIN');
    const { id } = req.params;

    // Use FOR UPDATE to lock the row during transaction
    const { rows } = await clientDb.query('SELECT * FROM clients WHERE id = $1 FOR UPDATE', [id]);
    if (!rows.length) {
      await clientDb.query('ROLLBACK');
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = rows[0];

    // Deregister from Meta WhatsApp Cloud API
    if (client.phone_number_id && client.wa_access_token) {
      try {
        await axios.post(
          `https://graph.facebook.com/v19.0/${client.phone_number_id}/deregister`,
          {},
          { headers: { Authorization: `Bearer ${client.wa_access_token}` } }
        );
        console.log(`[Meta] Successfully deregistered phone_number_id: ${client.phone_number_id}`);
      } catch (metaErr) {
        // Log but do not block local DB deletion
        console.warn(`[Meta] Deregistration failed for client ${id}:`, metaErr.response?.data || metaErr.message);
      }
    }

    await clientDb.query('DELETE FROM clients WHERE id = $1', [id]);
    await clientDb.query('COMMIT');

    res.json({ success: true, message: 'Client deleted and deregistered successfully' });
  } catch (err) {
    await clientDb.query('ROLLBACK');
    console.error(`[Delete Client API] Error deleting client ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error during deletion' });
  } finally {
    clientDb.release();
  }
});

// POST /api/clients/:id/whatsapp-setup
app.post('/api/clients/:id/whatsapp-setup', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    const client = rows[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });

    if (!client.phone_number_id || !client.wa_access_token || !client.whatsapp_number) {
      return res.status(400).json({ error: 'Missing WhatsApp API credentials' });
    }

    // 1. Update Business Profile
    const profileData = {
      messaging_product: "whatsapp",
      vertical: client.wa_category || "OTHER",
    };
    if (client.wa_address) profileData.address = client.wa_address;
    if (client.wa_description) profileData.description = client.wa_description;
    if (client.wa_email) profileData.email = client.wa_email;
    if (client.wa_website) profileData.websites = [client.wa_website];

    try {
      await axios.post(
        `https://graph.facebook.com/v19.0/${client.phone_number_id}/whatsapp_business_profile`,
        profileData,
        { headers: { Authorization: `Bearer ${client.wa_access_token}` } }
      );
    } catch (e) {
      console.error('Meta Profile Update Error:', e.response?.data || e.message);
      // Non-fatal, continue to register
    }

    // 2. Register Number
    try {
      await axios.post(
        `https://graph.facebook.com/v19.0/${client.phone_number_id}/register`,
        { messaging_product: "whatsapp", pin: "123456" },
        { headers: { Authorization: `Bearer ${client.wa_access_token}` } }
      );
    } catch (e) {
      console.error('Meta Register Error:', e.response?.data || e.message);
    }

    // 3. Send Dummy Message to verify
    try {
      const toPhone = client.whatsapp_number.replace(/\D/g, '');
      await axios.post(
        `https://graph.facebook.com/v19.0/${client.phone_number_id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: toPhone,
          type: 'text',
          text: { body: '✅ Your WhatsApp Business API integration is successful!' }
        },
        { headers: { Authorization: `Bearer ${client.wa_access_token}` } }
      );
    } catch (e) {
      console.error('Meta Dummy Message Error:', e.response?.data || e.message);
      return res.status(400).json({ error: 'Failed to send dummy message. Check Meta permissions or OTP verification status.' });
    }

    res.json({ success: true, message: 'WhatsApp Setup & Verification completed successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during setup' });
  }
});

// ══════════════════════════════════════════════════════════
// AI BRAIN (brain_docs table)
// ══════════════════════════════════════════════════════════
app.get('/api/brain', auth, async (req, res) => {
  try {
    const { client_id } = req.query;
    const q = client_id
      ? 'SELECT * FROM brain_docs WHERE client_id = $1 ORDER BY doc_type'
      : 'SELECT * FROM brain_docs ORDER BY client_id, doc_type';
    const { rows } = await pool.query(q, client_id ? [client_id] : []);
    res.json({ docs: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/brain', auth, async (req, res) => {
  try {
    const { client_id, doc_type, content } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO brain_docs (client_id, doc_type, content, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (client_id, doc_type)
      DO UPDATE SET content = $3, updated_at = NOW()
      RETURNING *
    `, [client_id, doc_type, content]);
    res.json({ doc: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── LEADS IMPORT ──────────────────────────────────────────
const upload = multer({ dest: 'uploads/' });
app.post('/api/leads/import', auth, upload.single('file'), async (req, res) => {
  try {
    const { client_id } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const results = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Pre-fetch clients and users for mapping
    const [clientsRes, usersRes] = await Promise.all([
      pool.query('SELECT id, name FROM clients'),
      pool.query('SELECT id, name, email FROM users')
    ]);
    const clientsMap = {};
    clientsRes.rows.forEach(c => clientsMap[c.name.toLowerCase()] = c.id);
    const usersMap = {};
    usersRes.rows.forEach(u => {
      usersMap[u.name.toLowerCase()] = u.id;
      usersMap[u.email.toLowerCase()] = u.id;
    });

    let imported = 0;
    let failed = 0;

    for (const row of results) {
      try {
        const name = row.name || row.Name || row['First Name'] || 'Unknown';

        let phone = row.phone || row.Phone || row.whatsapp || row['Phone Number'] || row['phone number'] || '';
        let countryCode = row.country_code || row['country code'] || row['Country Code'] || '';

        phone = phone.toString().replace(/=/g, '').replace(/"/g, '').replace(/\D/g, '');
        countryCode = countryCode.toString().replace(/\D/g, '');

        if (countryCode && !phone.startsWith(countryCode)) {
          phone = countryCode + phone;
        }

        const status = req.body.force_status || (row.status || row.Status || 'new').toLowerCase();
        const source = req.body.force_source || row.source || row.Source || 'CSV Import';
        const score = parseInt(row.score || row.Score) || 0;
        const interest = row.interest || row.Interest || null;

        // Brand
        let rowClientId = client_id || null;
        if (!rowClientId) {
          const brandName = row.brand || row.Brand;
          if (brandName && clientsMap[brandName.toLowerCase()]) {
            rowClientId = clientsMap[brandName.toLowerCase()];
          }
        }

        // Assigned To
        let assignedTo = null;
        const assignedName = row.assigned || row.Assigned || row.assigned_to;
        if (assignedName && usersMap[assignedName.toLowerCase()]) {
          assignedTo = usersMap[assignedName.toLowerCase()];
        }

        // Last Contact
        let lastContact = null;
        const lc = row.last_contact || row['Last Contact'] || row.lastContact;
        if (lc) {
          const parsed = new Date(lc);
          if (!isNaN(parsed.getTime())) lastContact = parsed.toISOString();
        }

        if (!phone) {
          failed++;
          continue;
        }

        await pool.query(`
          INSERT INTO leads (client_id, name, phone, status, source, score, interest, assigned_to, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (phone) DO UPDATE 
          SET name = EXCLUDED.name, status = EXCLUDED.status, 
              client_id = COALESCE(EXCLUDED.client_id, leads.client_id),
              source = EXCLUDED.source, score = EXCLUDED.score,
              interest = EXCLUDED.interest, assigned_to = COALESCE(EXCLUDED.assigned_to, leads.assigned_to),
              updated_at = NOW()
        `, [rowClientId, name, phone, status, source, score, interest, assignedTo]);

        imported++;
      } catch (e) {
        console.error('Row import error for', row, e.message);
        failed++;
      }
    }

    fs.unlinkSync(req.file.path); // cleanup
    res.json({ success: true, imported, failed });

  } catch (err) {
    console.error('Import error:', err);
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

// ══════════════════════════════════════════════════════════
// META WHATSAPP WEBHOOKS
// ══════════════════════════════════════════════════════════

// Verification Challenge
app.get('/api/webhooks/meta', (req, res) => {
  const verify_token = process.env.WA_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      console.log('Meta Webhook Verified!');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
  res.sendStatus(400);
});

// Receive Live Status Updates
app.post('/api/webhooks/meta', async (req, res) => {
  try {
    const { object, entry } = req.body;

    if (object === 'whatsapp_business_account' && entry && entry[0].changes) {
      const value = entry[0].changes[0].value;

      // Handle message statuses (Delivered, Read, Failed)
      if (value.statuses && value.statuses.length > 0) {
        const statusObj = value.statuses[0];
        const wamid = statusObj.id;
        const newStatus = statusObj.status; // 'delivered', 'read', 'failed'
        const error = statusObj.errors ? statusObj.errors[0].title : null;

        console.log(`[Webhook] Update: ${wamid} -> ${newStatus}`);

        // Update campaign_logs directly
        await pool.query(`
          UPDATE campaign_logs 
          SET status = $1, error_message = $2
          WHERE wa_message_id = $3
        `, [newStatus, error, wamid]);
      }

      // Handle incoming replied messages
      if (value.messages && value.messages.length > 0) {
        const msg = value.messages[0];
        const incomingPhone = msg.from;
        const msgId = msg.id;
        const text = msg.text ? msg.text.body : '';

        // Find if this user was part of a campaign
        const { rowCount } = await pool.query(`
          UPDATE campaign_logs 
          SET status = 'replied'
          WHERE lead_id = (SELECT id FROM leads WHERE phone LIKE '%' || $1 LIMIT 1)
        `, [incomingPhone.substring(incomingPhone.length - 10)]);

        // Insert into messages table
        await pool.query(`
          INSERT INTO messages (client_id, lead_id, direction, type, content, wa_message_id, status, timestamp)
          SELECT client_id, id, 'inbound', 'text', $1, $2, 'delivered', NOW()
          FROM leads WHERE phone LIKE '%' || $3 LIMIT 1
        `, [text, msgId, incomingPhone.substring(incomingPhone.length - 10)]);
      }
    }

    // Always return 200 OK to Meta
    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.sendStatus(500);
  }
});

// ══════════════════════════════════════════════════════════
// CAMPAIGNS
// ══════════════════════════════════════════════════════════
app.get('/api/campaigns', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT camp.*, c.name as brand_name,
        (SELECT COUNT(*) FROM campaign_logs cl WHERE cl.campaign_id = camp.id AND cl.status = 'sent') as sent_count,
        (SELECT COUNT(*) FROM campaign_logs cl WHERE cl.campaign_id = camp.id AND cl.status = 'delivered') as delivered_count,
        (SELECT COUNT(*) FROM campaign_logs cl WHERE cl.campaign_id = camp.id AND cl.status = 'read') as read_count,
        (SELECT COUNT(*) FROM campaign_logs cl WHERE cl.campaign_id = camp.id AND cl.status = 'replied') as replied_count
      FROM campaigns camp
      LEFT JOIN clients c ON camp.client_id = c.id
      ORDER BY camp.created_at DESC
    `);
    res.json({ campaigns: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/api/campaigns', auth, async (req, res) => {
  try {
    const { name, client_id, template_id, target_status, scheduled_at } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO campaigns (name, client_id, template_id, target_status, scheduled_at, status, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, NOW())
      RETURNING *
    `, [name, client_id, template_id, target_status, scheduled_at, req.user.id]);
    res.status(201).json({ campaign: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/campaigns/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM campaign_logs WHERE campaign_id = $1', [id]);
    const { rowCount } = await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Background Campaign Execution Function
async function executeCampaign(campaign_id) {
  try {
    const campRes = await pool.query(`
      SELECT c.*, t.body as template_body, t.name as template_name, cl.wa_access_token, cl.phone_number_id
      FROM campaigns c
      JOIN templates t ON c.template_id = t.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      WHERE c.id = $1
    `, [campaign_id]);

    if (!campRes.rows.length) return;
    const campaign = campRes.rows[0];

    await pool.query("UPDATE campaigns SET status = 'running' WHERE id = $1", [campaign_id]);

    let leadsQuery = 'SELECT id, phone, name FROM leads WHERE client_id = $1';
    const queryParams = [campaign.client_id];

    if (campaign.target_status && campaign.target_status !== 'all') {
      if (campaign.target_status.startsWith('csv_')) {
        leadsQuery += ' AND source = $2';
      } else {
        leadsQuery += ' AND status = $2';
      }
      queryParams.push(campaign.target_status);
    }

    const leadsRes = await pool.query(leadsQuery, queryParams);
    const leads = leadsRes.rows;
    let sentCount = 0;

    const waToken = campaign.wa_access_token || process.env.META_PAGE_ACCESS_TOKEN;
    const phoneId = campaign.phone_number_id || process.env.WA_PHONE_NUMBER_ID;

    // Process in batches of 50 for high performance
    const BATCH_SIZE = 50;
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (lead) => {
        try {
          const templatePayload = {
            name: campaign.template_name,
            language: { code: 'en' }
          };

          const components = [];
          if (campaign.template_body && campaign.template_body.includes('{{1}}')) {
            components.push({
              type: 'body',
              parameters: [
                { type: 'text', text: lead.name || 'Friend' }
              ]
            });
          }
          if (components.length > 0) {
            templatePayload.components = components;
          }

          const waRes = await axios.post(
            `https://graph.facebook.com/v18.0/${phoneId}/messages`,
            {
              messaging_product: 'whatsapp',
              to: lead.phone.replace(/\D/g, ''),
              type: 'template',
              template: templatePayload
            },
            { headers: { Authorization: `Bearer ${waToken}`, 'Content-Type': 'application/json' } }
          );

          return {
            lead_id: lead.id,
            wa_message_id: waRes.data.messages?.[0]?.id,
            status: 'sent',
            error: null
          };
        } catch (err) {
          return {
            lead_id: lead.id,
            wa_message_id: null,
            status: 'failed',
            error: err.response?.data?.error?.message || err.message
          };
        }
      });

      const results = await Promise.all(promises);

      // Bulk Insert Logs
      for (const res of results) {
        if (res.status === 'sent') {
          await pool.query(`
            INSERT INTO campaign_logs (campaign_id, lead_id, wa_message_id, status, sent_at)
            VALUES ($1, $2, $3, 'sent', NOW())
          `, [campaign_id, res.lead_id, res.wa_message_id]);

          await pool.query(`
            INSERT INTO messages (client_id, lead_id, direction, type, content, wa_message_id, status, timestamp)
            VALUES ($1, $2, 'outbound', 'template', $3, $4, 'sent', NOW())
          `, [campaign.client_id, res.lead_id, campaign.template_body, res.wa_message_id]);

          sentCount++;
        } else {
          await pool.query(`
            INSERT INTO campaign_logs (campaign_id, lead_id, status, error_message, sent_at)
            VALUES ($1, $2, 'failed', $3, NOW())
          `, [campaign_id, res.lead_id, res.error]);
        }
      }

      // Respect Meta rate limits between batches
      if (i + BATCH_SIZE < leads.length) {
        await new Promise(res => setTimeout(res, 500));
      }
    }

    await pool.query("UPDATE campaigns SET status = 'completed' WHERE id = $1", [campaign_id]);
    console.log(`Campaign ${campaign_id} completed. Sent ${sentCount} messages.`);
  } catch (err) {
    console.error('Campaign execution error:', err);
    await pool.query("UPDATE campaigns SET status = 'failed' WHERE id = $1", [campaign_id]);
  }
}

// POST /api/campaigns/execute
app.post('/api/campaigns/execute', auth, async (req, res) => {
  try {
    const { campaign_id } = req.body;
    // Execute asynchronously without blocking
    executeCampaign(campaign_id);
    res.json({ success: true, message: 'Campaign execution started in background' });
  } catch (err) {
    console.error('Campaign execution trigger error:', err);
    res.status(500).json({ error: 'Failed to trigger campaign' });
  }
});

// GET /api/campaigns/:id/logs
app.get('/api/campaigns/:id/logs', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT cl.*, l.name, l.phone 
      FROM campaign_logs cl
      JOIN leads l ON cl.lead_id = l.id
      WHERE cl.campaign_id = $1
      ORDER BY cl.sent_at DESC
    `, [id]);
    res.json({ logs: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════

// GET /api/reports/summary — dashboard stats
app.get('/api/reports/summary', auth, async (req, res) => {
  try {
    const today = await pool.query(`
      SELECT COUNT(*) as leads_today FROM leads
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const yesterday = await pool.query(`
      SELECT COUNT(*) as leads_yesterday FROM leads
      WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
    `);
    const hot = await pool.query("SELECT COUNT(*) as hot FROM leads WHERE status = 'hot'");
    const converted = await pool.query(`
      SELECT COUNT(*) as converted FROM leads
      WHERE status = 'converted' AND DATE(updated_at) = CURRENT_DATE
    `);
    const convertedYesterday = await pool.query(`
      SELECT COUNT(*) as converted_yesterday FROM leads
      WHERE status = 'converted' AND DATE(updated_at) = CURRENT_DATE - INTERVAL '1 day'
    `);
    const revenue = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as revenue FROM payments
      WHERE status = 'captured' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
    `);
    const revenueLastMonth = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as revenue FROM payments
      WHERE status = 'captured' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
    `);
    const weekly = await pool.query(`
      SELECT
        TO_CHAR(d.day, 'Dy') as day,
        COUNT(l.id) as leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'
      ) d(day)
      LEFT JOIN leads l ON DATE(l.created_at) = d.day
      GROUP BY d.day ORDER BY d.day
    `);
    const sources = await pool.query(`
      SELECT source, COUNT(*) as count
      FROM leads
      GROUP BY source ORDER BY count DESC LIMIT 6
    `);
    const funnel = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status != 'new' THEN 1 END) as contacted,
        COUNT(CASE WHEN score >= 40 THEN 1 END) as qualified,
        COUNT(CASE WHEN status = 'hot' THEN 1 END) as hot,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted
      FROM leads
    `);
    const revenueTrend = await pool.query(`
      SELECT
        TO_CHAR(d.month, 'Mon') as m,
        COALESCE(SUM(p.amount), 0) as r
      FROM generate_series(
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'
      ) d(month)
      LEFT JOIN payments p ON DATE_TRUNC('month', p.created_at) = d.month AND p.status = 'captured'
      GROUP BY d.month ORDER BY d.month
    `);

    res.json({
      leads_today: parseInt(today.rows[0].leads_today),
      leads_yesterday: parseInt(yesterday.rows[0].leads_yesterday),
      hot_leads: parseInt(hot.rows[0].hot),
      converted_today: parseInt(converted.rows[0].converted),
      converted_yesterday: parseInt(convertedYesterday.rows[0].converted_yesterday),
      revenue_month: parseFloat(revenue.rows[0].revenue),
      revenue_last_month: parseFloat(revenueLastMonth.rows[0].revenue),
      weekly: weekly.rows,
      sources: sources.rows,
      funnel: funnel.rows[0],
      revenue_trend: revenueTrend.rows.map(row => ({ m: row.m, r: parseFloat(row.r) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/leads — for reports page
app.get('/api/reports/leads', auth, async (req, res) => {
  try {
    const { from, to, brand } = req.query;
    let q = `
      SELECT l.*, c.name as brand_name
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (from) { params.push(from); q += ` AND l.created_at >= $${params.length}`; }
    if (to) { params.push(to); q += ` AND l.created_at <= $${params.length}`; }
    if (brand && brand !== 'All Brands') { params.push(`%${brand}%`); q += ` AND c.name ILIKE $${params.length}`; }
    q += ' ORDER BY l.created_at DESC LIMIT 500';
    const { rows } = await pool.query(q, params);
    res.json({ leads: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
// USERS / TEAM
// ══════════════════════════════════════════════════════════
app.get('/api/users', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, is_active, last_login, created_at FROM users ORDER BY created_at'
    );
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { name, email, password, role } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, is_active, created_at)
      VALUES ($1, $2, $3, $4, true, NOW())
      RETURNING id, name, email, role
    `, [name, email.toLowerCase(), hash, role || 'agent']);
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ── INTERNAL (called by n8n) ──────────────────────────────

// POST /api/internal/save-conversation
app.post('/api/internal/save-conversation', internalAuth, async (req, res) => {
  try {
    const { lead_id, direction, message, sender, wa_message_id } = req.body;
    await pool.query(`
      INSERT INTO conversations (lead_id, direction, message, message_type, sent_at, sender, wa_message_id)
      VALUES ($1, $2, $3, 'text', NOW(), $4, $5)
    `, [lead_id, direction, message, sender, wa_message_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/internal/update-lead
app.post('/api/internal/update-lead', internalAuth, async (req, res) => {
  try {
    const { lead_id, status, score, interest } = req.body;
    await pool.query(`
      UPDATE leads SET
        status = COALESCE($1, status),
        score = COALESCE($2, score),
        interest = COALESCE($3, interest),
        updated_at = NOW()
      WHERE id = $4
    `, [status, score, interest, lead_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CRON JOBS ─────────────────────────────────────────────
cron.schedule('* * * * *', async () => {
  try {
    const { rows } = await pool.query(`
      SELECT id FROM campaigns 
      WHERE status = 'scheduled' AND scheduled_at <= NOW()
    `);

    for (const row of rows) {
      console.log(`Cron: Starting scheduled campaign ${row.id}`);
      executeCampaign(row.id);
    }
  } catch (err) {
    console.error('Cron check error:', err);
  }
});

// Run every 1 minute to poll Google Drive folders for new videos
if (process.env.DISABLE_DRIVE_POLLER !== 'true') {
  cron.schedule('* * * * *', async () => {
    try {
      await checkNewDriveVideos();
    } catch (err) {
      console.error('Cron checkNewDriveVideos error:', err);
    }
  });
} else {
  console.log('DrivePoller: Polling disabled via DISABLE_DRIVE_POLLER=true environment variable.');
}

// Run every 5 minutes to auto-publish scheduled approved posts (acting as a fallback for n8n)
cron.schedule('*/5 * * * *', async () => {
  console.log('Cron: Checking for scheduled approved content due for publishing...');
  try {
    const { rows: duePosts } = await pool.query(`
      SELECT id FROM content_queue 
      WHERE status IN ('APPROVED', 'approved') 
        AND scheduled_at <= NOW() 
        AND scheduled_at > NOW() - INTERVAL '2 hours'
      ORDER BY scheduled_at ASC
    `);

    if (duePosts.length > 0) {
      console.log(`Cron: Found ${duePosts.length} posts due for publishing.`);
      for (const post of duePosts) {
        console.log(`Cron: Fallback publishing post ${post.id}...`);
        const dummyReq = { params: { id: post.id } };
        const dummyRes = {
          status: function (code) {
            this.statusCode = code;
            return this;
          },
          json: function (data) {
            console.log(`Cron: Publish result for post ${post.id}:`, JSON.stringify(data));
          }
        };
        try {
          await publishPost(dummyReq, dummyRes);
        } catch (pubErr) {
          console.error(`Cron: Failed to publish post ${post.id}:`, pubErr.message);
        }
      }
    }
  } catch (err) {
    console.error('Cron scheduled fallback publisher check error:', err);
  }
});

// ── SERVE FRONTEND BUILD (Production) ────────────────────
// When deployed, serve the Vite-built React app from ../dist.
// All API routes above take priority; this fallback catches client-side routes.
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    // Don't catch API or webhook routes — those 404 on their own
    if (req.path.startsWith('/api/') || req.path.startsWith('/webhook/') || req.path.startsWith('/socket.io/') || req.path.startsWith('/uploads/')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
  console.log(`[Static] Serving frontend from ${DIST_DIR}`);
}

// ── START ─────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`LeadOS API running on port ${PORT} (Socket.io enabled)`);
});

module.exports = { app, httpServer, io };
  