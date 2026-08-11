const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);
const db = require('../db/connection');
const ensureAllianceSchema = require('../db/alliance-schema');
const { processQueuedAllianceWelcomes } = require('../services/alliance-welcome');

function createAllianceInboxRouter({ auth, io }) {
  const router = express.Router();
  const mediaDirectory = path.join(__dirname, '..', 'uploads', 'alliance-media');
  fs.mkdirSync(mediaDirectory, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, mediaDirectory),
      filename: (_req, file, callback) => callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  const configuredPhoneId = async () => {
    const result = await db.query(`SELECT * FROM alliance_inbox_settings WHERE active = TRUE ORDER BY id LIMIT 1`);
    return result.rows[0] || (process.env.ALLIANCE_WA_PHONE_NUMBER_ID ? {
      phone_number_id: process.env.ALLIANCE_WA_PHONE_NUMBER_ID,
      access_token_env: 'ALLIANCE_WA_ACCESS_TOKEN',
    } : null);
  };
  const accessToken = (settings) => process.env[settings?.access_token_env || 'ALLIANCE_WA_ACCESS_TOKEN'];
  const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
  const relayAuthorized = (req) => {
    const expected = String(process.env.INTERNAL_API_KEY || '');
    return !expected || String(req.get('x-internal-key') || '') === expected;
  };
  const syncImportedProspects = async () => {
    const settings = await configuredPhoneId();
    const phoneNumberId = settings?.phone_number_id || process.env.ALLIANCE_WA_PHONE_NUMBER_ID || 'unconfigured';
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE alliance_inbox_contacts c
         SET name = COALESCE(p.name, p.business_name, c.name),
             profile_name = COALESCE(p.name, p.business_name, c.profile_name),
             phone = CASE WHEN NOT EXISTS (
               SELECT 1 FROM alliance_inbox_contacts other
               WHERE other.id <> c.id AND other.phone = p.phone
             ) THEN p.phone ELSE c.phone END,
             wa_id = CASE WHEN NOT EXISTS (
               SELECT 1 FROM alliance_inbox_contacts other
               WHERE other.id <> c.id AND other.wa_id = p.phone
             ) THEN p.phone ELSE c.wa_id END,
             source = COALESCE(p.source, c.source, 'file_upload'),
             custom_fields = c.custom_fields || jsonb_build_object(
               'business_name', p.business_name, 'audience', p.audience,
               'email', p.email, 'industry', p.industry, 'location', p.location
             ),
             updated_at = NOW()
         FROM alliance_prospects p
         WHERE c.prospect_id = p.id`
      );
      await client.query(
        `UPDATE alliance_inbox_contacts c
         SET prospect_id = p.id, name = COALESCE(p.name, p.business_name, c.name),
             source = COALESCE(c.source, p.source, 'file_upload'),
             custom_fields = c.custom_fields || jsonb_build_object(
               'business_name', p.business_name, 'audience', p.audience, 'email', p.email
             ), updated_at = NOW()
         FROM alliance_prospects p
         WHERE c.prospect_id IS NULL AND c.phone IS NOT NULL AND p.phone = c.phone
           AND NOT EXISTS (SELECT 1 FROM alliance_inbox_contacts linked WHERE linked.prospect_id = p.id)`
      );
      await client.query(
        `INSERT INTO alliance_inbox_contacts
          (prospect_id, wa_id, phone, name, profile_name, source, custom_fields)
         SELECT p.id, p.phone, p.phone, COALESCE(p.name, p.business_name),
                COALESCE(p.name, p.business_name), COALESCE(p.source, 'file_upload'),
                jsonb_build_object('business_name', p.business_name, 'audience', p.audience, 'email', p.email)
         FROM alliance_prospects p
         WHERE NOT EXISTS (SELECT 1 FROM alliance_inbox_contacts c WHERE c.prospect_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM alliance_inbox_contacts c WHERE p.phone IS NOT NULL AND c.phone = p.phone)`
      );
      await client.query(
        `INSERT INTO alliance_inbox_conversations (contact_id, phone_number_id, welcome_status)
         SELECT c.id, $1,
                CASE WHEN p.phone IS NOT NULL AND p.consent = TRUE THEN 'not_queued' ELSE 'not_eligible' END
         FROM alliance_inbox_contacts c
         LEFT JOIN alliance_prospects p ON p.id = c.prospect_id
         WHERE NOT EXISTS (SELECT 1 FROM alliance_inbox_conversations cv WHERE cv.contact_id = c.id)`,
        [phoneNumberId]
      );
      await client.query(
        `INSERT INTO alliance_inbox_messages
          (conversation_id, contact_id, direction, msg_type, content, status, raw_payload)
         SELECT cv.id, c.id, 'outbound', 'template', t.body, 'queued',
                jsonb_build_object(
                  'purpose', 'welcome', 'template_name', t.template_name,
                  'language', COALESCE(t.language, 'en'), 'prospect_id', p.id
                )
         FROM alliance_inbox_contacts c
         JOIN alliance_prospects p ON p.id = c.prospect_id
         JOIN alliance_inbox_conversations cv ON cv.contact_id = c.id
         JOIN alliance_templates t ON t.audience = p.audience
           AND t.channel = 'whatsapp' AND t.touch_no = 1 AND t.active = TRUE
           AND t.template_name IS NOT NULL
           AND LOWER(COALESCE(t.provider_status, 'approved')) = 'approved'
         WHERE cv.welcome_status = 'not_queued'
           AND NOT EXISTS (
             SELECT 1 FROM alliance_inbox_messages m
             WHERE m.conversation_id = cv.id AND m.msg_type = 'template'
               AND m.raw_payload->>'purpose' = 'welcome'
           )`
      );
      await client.query(
        `UPDATE alliance_inbox_conversations cv
         SET welcome_status = 'queued', welcome_template_name = t.template_name,
             welcome_error = NULL, updated_at = NOW()
         FROM alliance_inbox_contacts c
         JOIN alliance_prospects p ON p.id = c.prospect_id
         JOIN alliance_templates t ON t.audience = p.audience
           AND t.channel = 'whatsapp' AND t.touch_no = 1 AND t.active = TRUE
           AND t.template_name IS NOT NULL
           AND LOWER(COALESCE(t.provider_status, 'approved')) = 'approved'
         WHERE cv.contact_id = c.id AND cv.welcome_status = 'not_queued'`
      );
      await client.query(
        `UPDATE alliance_inbox_conversations cv
         SET welcome_status = 'missing_template',
             welcome_error = 'No approved WhatsApp touch-1 template is configured for this audience.',
             updated_at = NOW()
         FROM alliance_inbox_contacts c
         WHERE cv.contact_id = c.id AND cv.welcome_status = 'not_queued'
           AND NOT EXISTS (
             SELECT 1 FROM alliance_prospects p
             JOIN alliance_templates t ON t.audience = p.audience
               AND t.channel = 'whatsapp' AND t.touch_no = 1 AND t.active = TRUE
               AND t.template_name IS NOT NULL
               AND LOWER(COALESCE(t.provider_status, 'approved')) = 'approved'
             WHERE p.id = c.prospect_id
           )`
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };
  const messageSelect = `
    SELECT m.id, m.wa_msg_id, m.direction, m.msg_type, m.msg_type AS type, m.content,
           m.media_id, m.media_url, m.mime_type, m.filename, m.status, m.reactions,
           m.is_starred, m.is_deleted, m.pinned_until, m.sent_at, m.sent_at AS timestamp,
           CASE WHEN parent.id IS NULL THEN NULL ELSE json_build_object(
             'id', parent.id, 'wa_msg_id', parent.wa_msg_id, 'content', parent.content,
             'media_url', parent.media_url, 'type', parent.msg_type
           ) END AS reply_to
    FROM alliance_inbox_messages m
    LEFT JOIN alliance_inbox_messages parent ON parent.wa_msg_id = m.reply_to_wa_msg_id`;

  router.use(async (_req, res, next) => {
    try { await ensureAllianceSchema(); next(); }
    catch (error) { console.error('Alliance inbox schema failed:', error); res.status(500).json({ error: 'Alliance inbox database is not ready.' }); }
  });

  // Public Meta verification and event endpoints. Only events for the configured
  // Alliance phone_number_id are accepted; LeadOS webhook data never enters here.
  router.get('/webhook', (req, res) => {
    if (!relayAuthorized(req)) return res.sendStatus(401);
    const expected = process.env.ALLIANCE_WA_VERIFY_TOKEN;
    if (req.query['hub.mode'] === 'subscribe' && expected && req.query['hub.verify_token'] === expected) return res.status(200).send(req.query['hub.challenge']);
    return res.sendStatus(403);
  });

  router.post('/webhook', async (req, res) => {
    if (!relayAuthorized(req)) return res.sendStatus(401);
    res.sendStatus(200);
    try {
      const settings = await configuredPhoneId();
      if (!settings) return;
      for (const entry of req.body?.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value || {};
          if (String(value.metadata?.phone_number_id || '') !== String(settings.phone_number_id)) continue;

          for (const statusEvent of value.statuses || []) {
            const updated = await db.query(
              `UPDATE alliance_inbox_messages SET status = $1, raw_payload = raw_payload || $2::jsonb WHERE wa_msg_id = $3 RETURNING *`,
              [statusEvent.status, JSON.stringify({ status_event: statusEvent }), statusEvent.id]
            );
            if (updated.rowCount) io.emit('alliance_message_status', { wa_message_id: statusEvent.id, status: statusEvent.status });
            await db.query(
              `UPDATE alliance_whatsapp_campaign_recipients SET status=$1
               WHERE wa_msg_id=$2 AND status IN ('sent','delivered','read','failed')`,
              [statusEvent.status, statusEvent.id]
            ).catch(() => {});
          }

          for (const incoming of value.messages || []) {
            const phone = normalizePhone(incoming.from);
            const profileName = value.contacts?.find((item) => normalizePhone(item.wa_id) === phone)?.profile?.name || phone;
            const client = await db.connect();
            try {
              await client.query('BEGIN');
              const contactResult = await client.query(
                `INSERT INTO alliance_inbox_contacts (wa_id, phone, name, profile_name)
                 VALUES ($1,$1,$2,$2)
                 ON CONFLICT (wa_id) DO UPDATE SET profile_name = EXCLUDED.profile_name, updated_at = NOW()
                 RETURNING *`, [phone, profileName]
              );
              const contact = contactResult.rows[0];
              const conversationResult = await client.query(
                `INSERT INTO alliance_inbox_conversations (contact_id, phone_number_id)
                 VALUES ($1,$2) ON CONFLICT (contact_id) DO UPDATE SET updated_at = NOW() RETURNING *`,
                [contact.id, settings.phone_number_id]
              );
              const conversation = conversationResult.rows[0];
              const type = incoming.type || 'text';
              const typedPayload = incoming[type] || {};
              const content = type === 'text' ? incoming.text?.body : (typedPayload.caption || typedPayload.filename || `[${type}]`);
              const mediaId = ['image', 'video', 'audio', 'document', 'sticker'].includes(type) ? typedPayload.id : null;
              const mediaUrl = mediaId ? `/api/alliance-inbox/media/${mediaId}` : null;
              const replyToId = incoming.context?.id || null;
              const saved = await client.query(
                `INSERT INTO alliance_inbox_messages
                  (conversation_id, contact_id, wa_msg_id, direction, msg_type, content, media_id, media_url, mime_type, filename, status, reply_to_wa_msg_id, raw_payload, sent_at)
                 VALUES ($1,$2,$3,'inbound',$4,$5,$6,$7,$8,$9,'received',$10,$11,to_timestamp($12))
                 ON CONFLICT (wa_msg_id) DO NOTHING RETURNING *`,
                [conversation.id, contact.id, incoming.id, type, content, mediaId, mediaUrl, typedPayload.mime_type || null,
                  typedPayload.filename || null, replyToId, JSON.stringify(incoming), Number(incoming.timestamp || Math.floor(Date.now() / 1000))]
              );
              if (saved.rowCount) {
                await client.query(
                  `UPDATE alliance_inbox_conversations SET unread_count = unread_count + 1, last_message = $1,
                   last_message_at = $2, last_inbound_at = $2, updated_at = NOW() WHERE id = $3`,
                  [content, saved.rows[0].sent_at, conversation.id]
                );
                if (contact.prospect_id) {
                  await client.query(`UPDATE alliance_prospects SET status='replied',updated_at=NOW() WHERE id=$1 AND status NOT IN ('converted','closed','not_interested','unsubscribed')`,[contact.prospect_id]);
                  await client.query(
                    `UPDATE alliance_whatsapp_campaign_recipients SET status='cancelled',error_message='Recipient replied.'
                     WHERE prospect_id=$1 AND status='queued'`,
                    [contact.prospect_id]
                  );
                  await client.query(
                    `UPDATE alliance_whatsapp_followup_jobs SET status='cancelled',error_message='Recipient replied.'
                     WHERE prospect_id=$1 AND status IN ('pending','claimed')`,
                    [contact.prospect_id]
                  );
                }
              }
              await client.query('COMMIT');
              if (saved.rowCount) io.emit('alliance_incoming_message', { lead_id: String(contact.id), message: { ...saved.rows[0], type, timestamp: saved.rows[0].sent_at } });
            } catch (error) {
              await client.query('ROLLBACK');
              console.error('Alliance inbound message failed:', error);
            } finally { client.release(); }
          }
        }
      }
    } catch (error) { console.error('Alliance webhook processing failed:', error); }
  });

  router.get('/media/:mediaId', async (req, res) => {
    try {
      const referenced = await db.query(`SELECT 1 FROM alliance_inbox_messages WHERE media_id = $1 LIMIT 1`, [req.params.mediaId]);
      if (!referenced.rowCount) return res.sendStatus(404);
      const settings = await configuredPhoneId();
      const token = accessToken(settings);
      if (!token) return res.status(503).json({ error: 'Alliance WhatsApp token is not configured.' });
      const metadata = await axios.get(`https://graph.facebook.com/v19.0/${req.params.mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
      const media = await axios.get(metadata.data.url, { headers: { Authorization: `Bearer ${token}` }, responseType: 'arraybuffer' });
      res.setHeader('Content-Type', metadata.data.mime_type || media.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(Buffer.from(media.data));
    } catch (error) { res.status(502).json({ error: 'Unable to fetch Alliance media.' }); }
  });

  router.use(auth);

  router.get('/contacts', async (req, res) => {
    await syncImportedProspects();
    setImmediate(() => processQueuedAllianceWelcomes(io).catch((error) => {
      console.error('[Alliance welcome queue]', error);
    }));
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const search = String(req.query.search || '').trim();
    const result = await db.query(
      `SELECT c.id, c.name, c.profile_name, c.phone, c.status, c.interest, c.source, c.prospect_id,
              cv.last_message AS last, cv.last_message AS last_msg, cv.last_message_at AS time,
              cv.unread_count AS unread, cv.last_inbound_at, cv.welcome_status,
              cv.welcome_template_name, cv.welcome_wa_msg_id, cv.welcome_sent_at, cv.welcome_error
       FROM alliance_inbox_contacts c
       JOIN alliance_inbox_conversations cv ON cv.contact_id = c.id
       WHERE ($1 = '' OR c.name ILIKE '%' || $1 || '%' OR c.phone ILIKE '%' || $1 || '%')
       ORDER BY cv.last_message_at DESC NULLS LAST LIMIT $2 OFFSET $3`,
      [search, limit, offset]
    );
    const count = await db.query(`SELECT COUNT(*)::int AS total FROM alliance_inbox_contacts`);
    res.json({ leads: result.rows, total: count.rows[0].total });
  });

  router.get('/contacts/:id', async (req, res) => {
    const result = await db.query(
      `SELECT c.*, cv.last_inbound_at, cv.welcome_status, cv.welcome_template_name,
              cv.welcome_wa_msg_id, cv.welcome_sent_at, cv.welcome_error
       FROM alliance_inbox_contacts c
       JOIN alliance_inbox_conversations cv ON cv.contact_id = c.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Alliance contact not found.' });
    res.json({ lead: result.rows[0] });
  });

  router.patch('/contacts/:id', async (req, res) => {
    const result = await db.query(
      `UPDATE alliance_inbox_contacts SET name = COALESCE($1,name), status = COALESCE($2,status),
       interest = COALESCE($3,interest), updated_at = NOW() WHERE id = $4 RETURNING *`,
      [req.body.name || null, req.body.status || null, req.body.interest || null, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Alliance contact not found.' });
    res.json({ lead: result.rows[0] });
  });

  router.get('/contacts/:id/messages', async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const result = await db.query(
      `${messageSelect} WHERE m.contact_id = $1 ORDER BY m.sent_at DESC LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );
    res.json({ messages: result.rows.reverse() });
  });

  router.put('/conversations/:contactId/read', async (req, res) => {
    await db.query(`UPDATE alliance_inbox_conversations SET unread_count = 0 WHERE contact_id = $1`, [req.params.contactId]);
    res.json({ success: true });
  });

  router.post('/media/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    let uploaded = req.file;
    if (req.file.mimetype?.toLowerCase().startsWith('audio/webm')) {
      const convertedName = `${path.parse(req.file.filename).name}.ogg`;
      const convertedPath = path.join(mediaDirectory, convertedName);
      try {
        await new Promise((resolve, reject) => ffmpeg(req.file.path).noVideo().audioCodec('libopus').audioChannels(1).audioBitrate('32k').format('ogg').on('end', resolve).on('error', reject).save(convertedPath));
        await fs.promises.unlink(req.file.path).catch(() => {});
        uploaded = { ...req.file, filename: convertedName, path: convertedPath, mimetype: 'audio/ogg' };
      } catch (error) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        await fs.promises.unlink(convertedPath).catch(() => {});
        return res.status(500).json({ error: 'Unable to prepare this voice note for WhatsApp.' });
      }
    }
    const fileUrl = `/uploads/alliance-media/${uploaded.filename}`;
    await db.query(
      `INSERT INTO alliance_inbox_media (storage_path, public_url, mime_type, filename, file_size, direction)
       VALUES ($1,$2,$3,$4,$5,'outbound')`,
      [uploaded.path, fileUrl, uploaded.mimetype, req.file.originalname, req.file.size]
    );
    res.json({ success: true, fileUrl, mimeType: uploaded.mimetype });
  });

  router.post('/contacts/:id/messages', async (req, res) => {
    const contactResult = await db.query(
      `SELECT c.*, cv.id AS conversation_id, cv.last_inbound_at FROM alliance_inbox_contacts c
       JOIN alliance_inbox_conversations cv ON cv.contact_id = c.id WHERE c.id = $1`, [req.params.id]
    );
    if (!contactResult.rowCount) return res.status(404).json({ error: 'Alliance contact not found.' });
    const contact = contactResult.rows[0];
    if (!contact.last_inbound_at || Date.now() - new Date(contact.last_inbound_at).getTime() > 24 * 60 * 60 * 1000) {
      return res.status(409).json({ error: 'The 24-hour WhatsApp service window is closed.', reason: 'window_closed' });
    }
    const settings = await configuredPhoneId();
    const token = accessToken(settings);
    if (!settings?.phone_number_id || !token) return res.status(503).json({ error: 'Alliance WhatsApp Phone Number ID or access token is not configured.' });
    const type = req.body.msgType || req.body.type || 'text';
    const content = String(req.body.message || req.body.content || '');
    const payload = { messaging_product: 'whatsapp', recipient_type: 'individual', to: contact.phone, type };
    if (type === 'text') payload.text = { body: content };
    else {
      const mediaLink = String(req.body.mediaUrl || '');
      if (!mediaLink) return res.status(400).json({ error: 'Media URL is required.' });
      const link = mediaLink.startsWith('http') ? mediaLink : `${process.env.PUBLIC_API_URL || ''}${mediaLink}`;
      payload[type] = { link };
      if (content && ['image', 'video', 'document'].includes(type)) payload[type].caption = content;
      if (type === 'document') payload.document.filename = path.basename(mediaLink);
    }
    if (req.body.replyToMessageId) payload.context = { message_id: req.body.replyToMessageId };
    try {
      const meta = await axios.post(`https://graph.facebook.com/v19.0/${settings.phone_number_id}/messages`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const waMessageId = meta.data.messages?.[0]?.id;
      const saved = await db.query(
        `INSERT INTO alliance_inbox_messages
          (conversation_id, contact_id, wa_msg_id, direction, msg_type, content, media_url, status, reply_to_wa_msg_id, raw_payload)
         VALUES ($1,$2,$3,'outbound',$4,$5,$6,'sent',$7,$8) RETURNING *`,
        [contact.conversation_id, contact.id, waMessageId, type, content, req.body.mediaUrl || null,
          req.body.replyToMessageId || null, JSON.stringify(meta.data)]
      );
      await db.query(`UPDATE alliance_inbox_conversations SET last_message = $1, last_message_at = NOW(), updated_at = NOW() WHERE id = $2`, [content || `[${type}]`, contact.conversation_id]);
      const message = { ...saved.rows[0], type, timestamp: saved.rows[0].sent_at };
      io.emit('alliance_outgoing_message', { lead_id: String(contact.id), message });
      res.json({ success: true, message });
    } catch (error) {
      console.error('Alliance WhatsApp send failed:', error.response?.data || error.message);
      res.status(502).json({ error: error.response?.data?.error?.message || 'Alliance WhatsApp send failed.' });
    }
  });

  const updateMessage = (suffix, build) => router.put(`/messages/:id/${suffix}`, async (req, res) => {
    const { sql, params } = build(req);
    const result = await db.query(`${sql} RETURNING *`, params);
    if (!result.rowCount) return res.status(404).json({ error: 'Message not found.' });
    io.emit('alliance_message_edited', result.rows[0]);
    res.json({ success: true, message: result.rows[0] });
  });
  updateMessage('edit', (req) => ({ sql: `UPDATE alliance_inbox_messages SET content = $1 WHERE id = $2`, params: [req.body.content, req.params.id] }));
  updateMessage('delete', (req) => ({ sql: `UPDATE alliance_inbox_messages SET is_deleted = TRUE WHERE id = $1`, params: [req.params.id] }));
  updateMessage('star', (req) => ({ sql: `UPDATE alliance_inbox_messages SET is_starred = $1 WHERE id = $2`, params: [Boolean(req.body.is_starred), req.params.id] }));
  updateMessage('pin', (req) => req.body.unpin
    ? ({ sql: `UPDATE alliance_inbox_messages SET pinned_until = NULL WHERE id = $1`, params: [req.params.id] })
    : ({ sql: `UPDATE alliance_inbox_messages SET pinned_until = NOW() + ($1 * INTERVAL '1 hour') WHERE id = $2`, params: [Number(req.body.duration) || 24, req.params.id] }));
  updateMessage('react', (req) => ({
    sql: req.body.action === 'remove'
      ? `UPDATE alliance_inbox_messages SET reactions = reactions - $1 WHERE id = $2`
      : `UPDATE alliance_inbox_messages SET reactions = jsonb_set(reactions, ARRAY[$1], to_jsonb(COALESCE((reactions->>$1)::int,0)+1)) WHERE id = $2`,
    params: [req.body.emoji, req.params.id],
  }));

  return router;
}

module.exports = createAllianceInboxRouter;
