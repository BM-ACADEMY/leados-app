const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const axios = require('axios');

// ==========================================
// WF00 - Lead Integrator Endpoints
// ==========================================

const openRouter = require('../services/openrouter');
const ai = openRouter.isConfigured ? openRouter : null;

// Resolve a raw Meta WhatsApp payload synchronously so n8n can continue the
// same execution with the spoken text instead of ending on an audio placeholder.
router.post('/whatsapp/transcribe', async (req, res) => {
  try {
    const payload = req.body?.payload || req.body;
    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const audio = value?.messages?.[0]?.audio;

    if (!audio?.id) {
      return res.json(payload);
    }
    if (!ai) {
      return res.status(503).json({
        error: 'Voice transcription is not configured. Set OPENROUTER_API_KEY on the API server.',
      });
    }

    const phoneNumberId = value?.metadata?.phone_number_id;
    const clientResult = phoneNumberId
      ? await pool.query('SELECT wa_access_token FROM clients WHERE phone_number_id = $1 LIMIT 1', [phoneNumberId])
      : { rows: [] };
    const waToken = clientResult.rows[0]?.wa_access_token || process.env.META_PAGE_ACCESS_TOKEN;
    if (!waToken) {
      return res.status(503).json({ error: 'No WhatsApp access token is configured for this phone number.' });
    }

    const mediaResponse = await axios.get(`https://graph.facebook.com/v18.0/${audio.id}`, {
      headers: { Authorization: `Bearer ${waToken}` },
    });
    const mediaUrl = mediaResponse.data?.url;
    if (!mediaUrl) {
      return res.status(502).json({ error: 'Meta did not return a URL for the voice note.' });
    }

    const audioResponse = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${waToken}` },
      responseType: 'arraybuffer',
    });
    const mimeType = mediaResponse.data?.mime_type || audio.mime_type || 'audio/ogg';
    const result = await ai.models.generateContent({
      model: openRouter.AUDIO_MODEL,
      contents: [
        {
          text: 'Transcribe this WhatsApp voice note precisely in its original language. Return only the spoken words, without commentary or formatting.',
        },
        {
          inlineData: {
            mimeType,
            data: Buffer.from(audioResponse.data).toString('base64'),
          },
        },
      ],
    });
    const transcription = String(result?.text || '').trim();
    if (!transcription) {
      return res.status(502).json({ error: 'The transcription provider returned an empty transcript.' });
    }

    // Present the transcript to WF00 exactly like a normal text message so the
    // existing normalization, lead detection and sales-engine nodes continue.
    const message = value.messages[0];
    message.type = 'text';
    message.text = { body: transcription };
    message.original_type = 'audio';
    delete message.audio;
    return res.json(payload);
  } catch (err) {
    console.error('[WhatsApp Transcription Error]', err.response?.data || err.message);
    return res.status(502).json({ error: 'Voice-note transcription failed.', detail: err.message });
  }
});

const OPENROUTER_MODELS = (process.env.OPENROUTER_MODELS || process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const OPENROUTER_REQUEST_TIMEOUT_MS = Number(process.env.OPENROUTER_REQUEST_TIMEOUT_MS || 12000);

const withTimeout = (promise, timeoutMs, label) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new OpenRouterServiceError({
          message: `${label} timed out after ${timeoutMs}ms.`,
          status: 504,
          category: 'deadline_exceeded',
          retryable: true,
        }));
      }, timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
};

const getOpenRouterStatus = (err) => {
  const value = err?.status ?? err?.code ?? err?.response?.status;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getOpenRouterCategory = (status) => {
  if (status === 429) return 'quota_exceeded';
  if (status === 503) return 'temporarily_unavailable';
  if (status === 504) return 'deadline_exceeded';
  if (status === 401 || status === 403) return 'authentication_or_permission';
  if (status === 404) return 'model_not_found';
  if (status === 400) return 'invalid_request';
  if (status && status >= 500) return 'provider_error';
  return 'network_or_unknown';
};

class OpenRouterServiceError extends Error {
  constructor({ message, status = 502, category, retryable = false, model = null, cause = null }) {
    super(message);
    this.name = 'OpenRouterServiceError';
    this.httpStatus = status;
    this.category = category;
    this.retryable = retryable;
    this.model = model;
    this.cause = cause;
  }
}

const sendAiError = (res, err) => {
  if (!(err instanceof OpenRouterServiceError)) {
    console.error('[AI] Unexpected error:', err);
    return res.status(500).json({
      error: 'AI request failed due to an internal server error.',
      code: 'internal_error',
      retryable: false,
    });
  }

  return res.status(err.httpStatus).json({
    error: err.message,
    code: err.category,
    retryable: err.retryable,
    model: err.model,
  });
};

const BRAND_KEYWORDS = [
  { name: 'BM Academy', pattern: /\b(course|class|syllabus|placement|job[- ]?ready|batch|fees?|academy|training|learn|learning|certification)\b/i },
  // "Digital marketing" alone is intentionally not a TechX switch signal: it is
  // also an Academy course. TechX requires explicit service/business context.
  { name: 'BM TechX', pattern: /\b(bm\s*techx|techx|marketing (service|agency)|digital marketing (service|agency)|run (meta |google )?ads?|grow (my |our )?business|business marketing|website|branding service|generate leads?|lead generation|gmb|seo service|social media service)\b/i },
  { name: 'CoreTalents', pattern: /\b(hiring|recruit|candidate|staff|vacancy|resume|coretalents?)\b/i },
  { name: 'Namma Pondy Properties', pattern: /\b(property|plot|villa|land|patta|ec|real estate|jipmer)\b/i },
  { name: 'TravellersNeed', pattern: /\b(trip|tour|package|travel|holiday|pondy tour|travellers?need)\b/i },
  { name: "Dada's Kitchen", pattern: /\b(food|catering|kitchen|order|dada'?s kitchen)\b/i },
  { name: 'EduConsultants', pattern: /\b(study abroad|education abroad|overseas admission|educonsultants?)\b/i },
  { name: 'BM Foundation', pattern: /\b(donation|ngo|charity|volunteer|foundation)\b/i },
];

const detectExplicitBrand = (message = '') =>
  BRAND_KEYWORDS.find(({ pattern }) => pattern.test(message))?.name || null;

const getLeadFirstName = (name) => {
  const cleanName = String(name || '').trim();
  // Empty, numbers only, or too short names return empty to avoid broken greetings
  if (!cleanName || /^\+?\d+$/.test(cleanName) || cleanName.length < 2) return '';
  // Remove special characters and get first valid word
  const sanitized = cleanName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const firstWord = sanitized.split(/\s+/)[0] || '';
  // Only return if it's a valid name (at least 2 chars, letters only)
  if (firstWord.length >= 2 && /^[a-zA-Z]+$/.test(firstWord)) {
    return firstWord;
  }
  return '';
};

const DEFAULT_BOT_BEHAVIOR = `You are the ABM Groups shared WhatsApp assistant.
Use the current contact's first name naturally. For a greeting, reply only:
"Hey {first_name}! 👋 How can I help you today?"
Never recite the ABM Groups brand list as a default greeting.
Keep the detected brand sticky until the user clearly mentions another brand.
"Digital marketing" alone inherits the locked brand: it is an Academy course when
BM Academy is locked. Switch to BM TechX only for explicit service/business intent
such as marketing service, run ads, grow my business, website or lead generation.
Remember information already supplied and never ask for it again.
For bookings, collect missing topic, date, time, name and number. Never claim a
booking, calendar write, reminder or handoff succeeded unless its tool succeeded.
For a voice note, ask the contact to type it. Send exactly one concise reply.`;

// Gemini-only fallback chain (paid key — higher rate limits).
// Tries 4 models in order: if one is busy/overloaded the next kicks in automatically.
async function generateOpenRouterContent(prompt) {
  if (!ai) {
    throw new OpenRouterServiceError({
      message: 'OPENROUTER_API_KEY is not configured on the API server.',
      status: 500,
      category: 'configuration_error',
    });
  }

  let lastFailure = null;
  const errors = [];
  for (const model of OPENROUTER_MODELS) {
    // One bounded attempt per model keeps the entire API request below the
    // reverse-proxy timeout. The next configured model is the retry/fallback.
    for (let attempt = 1; attempt <= 1; attempt += 1) {
      try {
        const aiRes = await withTimeout(
          ai.models.generateContent({ model, contents: prompt }),
          OPENROUTER_REQUEST_TIMEOUT_MS,
          `OpenRouter ${model}`
        );
        const text = aiRes?.text?.trim();
        if (!text) {
          throw new OpenRouterServiceError({
            message: `OpenRouter returned an empty response from ${model}.`,
            status: 502,
            category: 'empty_response',
            retryable: true,
            model,
          });
        }
        console.log(`[AI] ✅ Gemini (${model})`);
        return text;
      } catch (err) {
        const upstreamStatus = getOpenRouterStatus(err);
        const category = err instanceof OpenRouterServiceError
          ? err.category
          : getOpenRouterCategory(upstreamStatus);
        const retryable = err instanceof OpenRouterServiceError
          ? err.retryable
          : upstreamStatus === 429 || upstreamStatus === 503 ||
            upstreamStatus === 504 || (upstreamStatus !== null && upstreamStatus >= 500) ||
            upstreamStatus === null;
        const msg = err?.message || category;
        errors.push(`${model}#${attempt}: ${category} (${upstreamStatus || 'unknown'})`);

        lastFailure = err instanceof OpenRouterServiceError
          ? err
          : new OpenRouterServiceError({
              message: `OpenRouter request failed: ${category}.`,
              status: upstreamStatus === 429 ? 429 : (retryable ? 503 : 502),
              category,
              retryable,
              model,
              cause: err,
            });
        console.warn(`[AI] Gemini (${model}) attempt ${attempt} failed: ${msg}`);
        console.error('[AI] Gemini failure details', { model, attempt, upstreamStatus, category, message: msg });

        // Bad credentials and malformed requests affect every configured model.
        if ([400, 401, 403].includes(upstreamStatus)) throw lastFailure;
        // Do not retry a retired/unknown model; try the next configured model.
        if (upstreamStatus === 404) break;
        if (!retryable || attempt === 1) break;

        const delayMs = (1000 * (2 ** (attempt - 1))) + Math.floor(Math.random() * 400);
        await sleep(delayMs);
      }
    }
  }

  console.error('[AI] ❌ All Gemini models exhausted:', errors.join(' | '));
  throw lastFailure || new OpenRouterServiceError({
    message: 'No OpenRouter models are configured.',
    status: 500,
    category: 'configuration_error',
  });
}

// conversations.tenant_id is a foreign key into a legacy `tenants` table that
// was never actually populated per brand — only tenants.id=1 exists. Every
// conversation-creating path in the app (inbound webhook, /api/whatsapp/send,
// campaign sends in server.js) is on this same single seed row. Using a
// lead's clients.id here instead — as this used to, via `client_id as
// tenant_id` — violates that FK for any brand whose id isn't coincidentally
// 1, and even when it didn't error, it silently searched the wrong tenant
// bucket for an existing conversation (real rows all live under tenant_id=1).
const DEFAULT_TENANT_ID = 1;

async function getOrUpsertConversation(lead_id) {
  const convRes = await pool.query(`SELECT id FROM conversations WHERE lead_id = $1 LIMIT 1`, [lead_id]);
  if (convRes.rows.length > 0) return convRes.rows[0].id;

  const leadRes = await pool.query(`SELECT phone FROM leads WHERE id = $1`, [lead_id]);
  const phone = leadRes.rows[0]?.phone || '';
  const tenant_id = DEFAULT_TENANT_ID;
  const leadExists = leadRes.rows.length > 0;
  const safeLeadId = leadExists ? lead_id : null;

  if (phone) {
    const phoneDigits = phone.replace(/\D/g, '');
    const byPhoneRes = await pool.query(`
      SELECT id FROM conversations 
      WHERE tenant_id = $1 AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = RIGHT($2, 10) 
      LIMIT 1
    `, [tenant_id, phoneDigits]);
    if (byPhoneRes.rows.length > 0) {
      const existingId = byPhoneRes.rows[0].id;
      if (safeLeadId) {
        await pool.query(`UPDATE conversations SET lead_id = $1 WHERE id = $2`, [safeLeadId, existingId]);
      }
      return existingId;
    }
  }

  const newConv = await pool.query(`
    INSERT INTO conversations (lead_id, tenant_id, phone, status)
    VALUES ($1, $2, $3, 'open')
    ON CONFLICT (phone, tenant_id) DO UPDATE SET lead_id = COALESCE(EXCLUDED.lead_id, conversations.lead_id)
    RETURNING id
  `, [safeLeadId, tenant_id, phone]);
  return newConv.rows[0].id;
}

// Shared helper: sends a real WhatsApp text to a lead and logs it into
// messages/conversations, same pattern as /communication/send. Used by the
// WF04 journey-action endpoints so each one does real, verifiable work
// instead of returning a bare {success:true} mock.
async function sendWhatsAppText(lead_id, content) {
  const leadRes = await pool.query(`
    SELECT l.*, c.phone_number_id, c.wa_access_token as client_wa_token
    FROM leads l LEFT JOIN clients c ON l.client_id = c.id WHERE l.id = $1
  `, [lead_id]);
  const lead = leadRes.rows[0];
  if (!lead) return { delivered: false, reason: 'lead_not_found' };

  const phoneNumberId = lead.phone_number_id || process.env.WA_PHONE_NUMBER_ID;
  const waAccessToken = lead.client_wa_token || process.env.META_PAGE_ACCESS_TOKEN;
  let delivered = false, waMessageId = null;
  if (lead.phone && phoneNumberId && waAccessToken) {
    try {
      const phoneDigits = lead.phone.replace(/\D/g, '');
      const waRes = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        { messaging_product: 'whatsapp', to: phoneDigits, type: 'text', text: { body: content } },
        { headers: { Authorization: `Bearer ${waAccessToken}`, 'Content-Type': 'application/json' } }
      );
      waMessageId = waRes.data?.messages?.[0]?.id || null;
      delivered = true;
    } catch (waErr) {
      console.error('[sendWhatsAppText error]', waErr.response?.data || waErr.message);
    }
  }

  const conversation_id = await getOrUpsertConversation(lead_id);
  await pool.query(`UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`, [content, conversation_id]);
  await pool.query(
    `INSERT INTO messages (conversation_id, direction, msg_type, content, wa_msg_id, status, is_ai, sent_at) VALUES ($1, 'outbound', 'text', $2, $3, $4, false, NOW())`,
    [conversation_id, content, waMessageId, delivered ? 'sent' : 'failed']
  );

  return { delivered, wa_msg_id: waMessageId };
}

// 1. Deduplicate Lead
router.post('/leads/deduplicate', async (req, res) => {
  const { phone, email } = req.body;
  try {
    let query = `SELECT id, name, status, score FROM leads WHERE `;
    const conditions = [];
    const values = [];
    if (phone) { conditions.push(`phone = $${values.length + 1}`); values.push(phone); }
    if (email) { conditions.push(`email = $${values.length + 1}`); values.push(email); }

    if (conditions.length === 0) return res.json({ is_duplicate: false });

    query += conditions.join(' OR ') + ' LIMIT 1';
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      res.json({ ...req.body, is_duplicate: true, lead: result.rows[0] });
    } else {
      res.json({ ...req.body, is_duplicate: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Hybrid Brand Detection
router.post('/brand/detect', async (req, res) => {
  const { phone_number_id, phone, message } = req.body;
  try {
    if (phone_number_id) {
      let isManaged = false;
      if (phone_number_id === process.env.WA_PHONE_NUMBER_ID) {
        isManaged = true;
      } else {
        const clientCheck = await pool.query('SELECT id FROM clients WHERE phone_number_id = $1 LIMIT 1', [phone_number_id]);
        if (clientCheck.rows.length > 0) isManaged = true;
      }
      if (!isManaged) {
        console.log('🚫 [Brand Detect] Halted n8n workflow for unmanaged phone_number_id:', phone_number_id);
        return res.status(403).json({ error: 'Unmanaged phone_number_id', ignored: true });
      }
    }

    let brandId = null;
    let brandName = 'ABM Groups';
    const explicitBrand = detectExplicitBrand(message);

    // An explicit keyword is the only reason to switch an existing session.
    if (explicitBrand) {
      const explicitRes = await pool.query(
        `SELECT id, name
         FROM clients
         WHERE LOWER(name) = LOWER($1)
         LIMIT 1`,
        [explicitBrand]
      );
      if (explicitRes.rows.length > 0) {
        brandId = explicitRes.rows[0].id;
        brandName = explicitRes.rows[0].name;
      }
    }

    // Sticky brand: when the message has no switch keyword, retain the brand
    // already assigned to this WhatsApp number.
    if (!brandId && phone) {
      const digits = String(phone).replace(/\D/g, '');
      const existingRes = await pool.query(
        `SELECT c.id, c.name
         FROM leads l
         JOIN clients c ON c.id = l.client_id
         WHERE RIGHT(REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g'), 10) = RIGHT($1, 10)
         ORDER BY l.updated_at DESC
         LIMIT 1`,
        [digits]
      );
      if (existingRes.rows.length > 0) {
        brandId = existingRes.rows[0].id;
        brandName = existingRes.rows[0].name;
      }
    }

    if (!brandId && phone_number_id) {
      const clientRes = await pool.query(`SELECT id, name FROM clients WHERE phone_number_id = $1 LIMIT 1`, [phone_number_id]);
      if (clientRes.rows.length > 0) {
        brandId = clientRes.rows[0].id;
        brandName = clientRes.rows[0].name;
      }
    }

    if (!brandId) {
      const fallbackRes = await pool.query(`SELECT id, name FROM clients WHERE name = 'ABM Groups' LIMIT 1`);
      if (fallbackRes.rows.length > 0) {
        brandId = fallbackRes.rows[0].id;
      }
    }

    res.json({
      ...req.body,
      brand_id: brandId,
      brand_name: brandName,
      brand: brandName,
      brand_locked: Boolean(brandId),
      brand_switched: Boolean(explicitBrand),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create or Update Lead
router.post('/leads/createOrUpdate', async (req, res) => {
  const { name, phone, email, source } = req.body;
  try {
    if (!phone) {
      return res.json({ ...req.body, success: true, lead_id: null, ignored: true });
    }

    let brand_id = req.body.brand_id || null;
    if (!brand_id && req.body.brand) {
      const brandRes = await pool.query(`SELECT id FROM clients WHERE name = $1 LIMIT 1`, [req.body.brand]);
      brand_id = brandRes.rows[0]?.id || null;
    }
    const check = await pool.query(`SELECT id FROM leads WHERE phone = $1 LIMIT 1`, [phone]);
    let lead_id;
    if (check.rows.length > 0) {
      lead_id = check.rows[0].id;
      await pool.query(
        `UPDATE leads SET name = COALESCE($1, name), email = COALESCE($2, email), source = COALESCE($3, source), client_id = COALESCE($4, client_id), updated_at = NOW() WHERE id = $5`,
        [name, email, source, brand_id, lead_id]
      );
    } else {
      const insert = await pool.query(
        `INSERT INTO leads (name, phone, email, source, client_id, status, score, next_followup_due) VALUES ($1, $2, $3, $4, $5, 'new', 10, NOW() + INTERVAL '4 hours') RETURNING id`,
        [name, phone, email, source, brand_id]
      );
      lead_id = insert.rows[0].id;
    }
    res.json({ ...req.body, success: true, lead_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WF01 - Sales Engine Endpoints
// ==========================================

// 1. Intent Detection
router.post('/ai/intent', async (req, res) => {
  const { message, brand, lead_id } = req.body;
  try {
    let effectiveBrand = brand || 'ABM Groups';
    const explicitBrand = detectExplicitBrand(message);

    if (lead_id) {
      const currentBrandRes = await pool.query(
        `SELECT c.name
         FROM leads l
         LEFT JOIN clients c ON c.id = l.client_id
         WHERE l.id = $1
         LIMIT 1`,
        [lead_id]
      );
      const currentBrand = currentBrandRes.rows[0]?.name;
      effectiveBrand = currentBrand || effectiveBrand;

      // Persist a switch only for an unambiguous keyword. Phrases such as
      // "digital marketing" have no explicit target and therefore remain in the
      // current locked brand (e.g. the BM Academy course conversation).
      if (explicitBrand && explicitBrand !== currentBrand) {
        const targetBrandRes = await pool.query(
          `SELECT id, name FROM clients WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [explicitBrand]
        );
        if (targetBrandRes.rows[0]) {
          await pool.query(
            `UPDATE leads SET client_id = $1, updated_at = NOW() WHERE id = $2`,
            [targetBrandRes.rows[0].id, lead_id]
          );
          effectiveBrand = targetBrandRes.rows[0].name;
        }
      }
    }

    // FIX: Ensure conversation exists safely without constraint errors and log inbound message for bidirectional UI
    if (lead_id && message) {
      const conversation_id = await getOrUpsertConversation(lead_id);
      // The WhatsApp webhook normally persists this message before n8n runs.
      // Insert only when no matching inbound event was saved in the last minute.
      const savedMsg = await pool.query(
        `INSERT INTO messages (conversation_id, direction, msg_type, content, status, is_ai, sent_at)
         SELECT $1, 'inbound', 'text', $2, 'delivered', false, NOW()
         WHERE NOT EXISTS (
           SELECT 1
           FROM messages
           WHERE conversation_id = $1
             AND direction = 'inbound'
             AND content = $2
             AND sent_at >= NOW() - INTERVAL '1 minute'
         )
         RETURNING id, direction, content, msg_type as type, status, sent_at as timestamp`,
        [conversation_id, message]
      );
      if (savedMsg.rows[0]) {
        await pool.query(`UPDATE conversations SET last_message = $1, last_message_at = NOW(), unread_count = COALESCE(unread_count, 0) + 1 WHERE id = $2`, [message, conversation_id]);
      }
      const io = req.app.get('io');
      if (io && savedMsg.rows[0]) {
        io.emit('incoming_message', { lead_id: Number(lead_id), message: savedMsg.rows[0] });
      }
      await pool.query(`
        UPDATE leads
        SET touch_count = 0,
            next_followup_due = NOW() + INTERVAL '4 hours',
            updated_at = NOW()
        WHERE id = $1
          AND status NOT IN ('converted', 'booked', 'opt-out', 'lost')
          AND call_booked_at IS NULL
      `, [lead_id]);
    }

    const prompt = `Analyze this message in the locked brand '${effectiveBrand}'. What is the user's core intent? Choose one: [PRICING, MORE_INFO, BOOK_CALL, NOT_INTERESTED, GENERAL_CHAT, COMPLAINT]. Message: "${message}". Reply ONLY with the intent and confidence score separated by a comma (e.g. PRICING, 95).`;
    const output = await generateOpenRouterContent(prompt);
    const parts = output.split(',');
    const intent = parts[0] ? parts[0].trim() : 'GENERAL';
    const confidence = parts[1] ? parseInt(parts[1].trim()) : 50;

    if (lead_id) {
      await pool.query(`INSERT INTO ai_decisions (lead_id, module, input, output, confidence) VALUES ($1, $2, $3, $4, $5)`, [lead_id, 'intent_detection', message, intent, confidence]);
    }
    res.json({ ...req.body, brand: effectiveBrand, brand_locked: true, intent, confidence });
  } catch (err) {
    sendAiError(res, err);
  }
});

// 2. Objection Detection
router.post('/ai/objections', async (req, res) => {
  const { message, brand, lead_id } = req.body;
  try {
    const prompt = `Analyze this message. Does the user have any objections? Choose one: [TOO_EXPENSIVE, NO_TIME, NOT_SURE, USING_COMPETITOR, NONE]. Message: "${message}". Reply ONLY with the objection type.`;
    const objections = await generateOpenRouterContent(prompt);
    res.json({ ...req.body, objections });
  } catch (err) {
    sendAiError(res, err);
  }
});

const KB_MAX_CHARS = Number(process.env.AI_KB_MAX_CHARS || 18000);
const KB_STOP_WORDS = new Set([
  'a', 'all', 'and', 'are', 'available', 'can', 'course', 'courses', 'do',
  'for', 'have', 'i', 'in', 'is', 'list', 'me', 'of', 'please', 'show',
  'tell', 'the', 'to', 'what', 'you', 'your',
]);

const getRecentChatHistory = async (leadId, limit = 12) => {
  if (!leadId) return [];

  const result = await pool.query(
    `SELECT m.direction, m.content
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE c.lead_id = $1
       AND m.content IS NOT NULL
       AND BTRIM(m.content) <> ''
     ORDER BY m.sent_at DESC
     LIMIT $2`,
    [leadId, limit]
  );

  return result.rows.reverse().map((row) => ({
    role: row.direction === 'inbound' ? 'user' : 'assistant',
    text: row.content,
  }));
};

const normalizeChatHistory = (history) => (
  Array.isArray(history)
    ? history
      .map((item) => ({
        role: item?.role || (item?.direction === 'inbound' ? 'user' : 'assistant'),
        text: String(item?.text ?? item?.content ?? '').trim(),
      }))
      .filter((item) => item.text)
    : []
);

const getRelevantKnowledge = (documents, query = '') => {
  const normalizedQuery = String(query).toLowerCase();
  const wantsCourseList = /\b(all|available|offer|show|what|which)\b.*\b(course|courses|program|programs)\b|\bcourse list\b/i.test(normalizedQuery);
  const queryTerms = [...new Set(
    normalizedQuery
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 1 && !KB_STOP_WORDS.has(term))
  )];

  const chunks = documents
    .flatMap((document) => String(document || '').split(/(?=^#{2,3}\s)/gm))
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const ranked = chunks.map((chunk, index) => {
    const lower = chunk.toLowerCase();
    let score = queryTerms.reduce((total, term) => total + (lower.includes(term) ? 5 : 0), 0);
    if (/^## brand_router/im.test(chunk)) score += 2;
    if (wantsCourseList && /complete course catalogue/i.test(chunk)) score += 100;
    if (wantsCourseList && /^### program_/im.test(chunk)) score += 1;
    return { chunk, index, score };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  const selected = [];
  let length = 0;
  for (const item of ranked) {
    if (item.score <= 0 && selected.length > 0) continue;
    const remaining = KB_MAX_CHARS - length;
    if (remaining <= 0) break;
    const value = item.chunk.slice(0, remaining);
    selected.push(value);
    length += value.length;
    if (selected.length >= 8) break;
  }

  return selected.join('\n\n');
};

// 3. Knowledge Retrieval
router.post('/kb/search', async (req, res) => {
  const { brand, query, lead_id, chat_history } = req.body;
  try {
    let resolvedHistory = normalizeChatHistory(chat_history);
    if (resolvedHistory.length === 0 && lead_id) {
      resolvedHistory = await getRecentChatHistory(lead_id);
    }
    const contextualQuery = [
      ...resolvedHistory.slice(-10).map((item) => item.text),
      query,
    ].filter(Boolean).join(' ');

    // AIBrainView stores the master multi-brand knowledge under ABM Groups.
    // Load it as a fallback and combine it with any brand-specific documents.
    const targetBrand = brand || 'ABM Groups';
    const docsRes = await pool.query(
      `SELECT c.name AS client_name, bd.doc_type, bd.content
       FROM brain_docs bd
       JOIN clients c ON c.id = bd.client_id
       WHERE (LOWER(c.name) = LOWER($1) OR LOWER(c.name) = LOWER('ABM Groups'))
         AND bd.doc_type IN ('prompt', 'training', 'product', 'pricing')
       ORDER BY
         CASE WHEN LOWER(c.name) = LOWER($1) THEN 1 ELSE 0 END,
         CASE bd.doc_type
           WHEN 'prompt' THEN 1
           WHEN 'product' THEN 2
           WHEN 'pricing' THEN 3
           WHEN 'training' THEN 4
         END`,
      [targetBrand]
    );

    const knowledgeDocs = docsRes.rows
      .filter((doc) => ['prompt', 'product', 'pricing'].includes(doc.doc_type) && doc.content)
      .map((doc) => doc.content);
    const trainingDocs = docsRes.rows
      .filter((doc) => doc.doc_type === 'training' && doc.content)
      .map((doc) => doc.content);

    // Follow-up questions such as "what is the syllabus?" need the previously
    // selected program in the retrieval query, not only the latest vague turn.
    const kb_snippets = getRelevantKnowledge(knowledgeDocs, contextualQuery) || 'No relevant knowledge found.';
    const isBmAcademy = ['bm academy', 'bm-academy', 'bmacademy'].includes(
      String(targetBrand).trim().toLowerCase()
    );
    const bmAcademyCourseRule = isBmAcademy
      ? `BM ACADEMY COURSE LIST RULE:
When asked for available courses or the full course list, include every PROGRAM entry in the knowledge base, not only the first four. The catalogue has 23 courses. Group the names under Flagship & Placement, Digital Marketing, Creator & Video, Design & Web, AI Tools, and Kids & Teens. Show names first, then ask which course needs details.`
      : '';
    const system_instructions = [...trainingDocs, bmAcademyCourseRule]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 8000);
    res.json({ ...req.body, chat_history: resolvedHistory, kb_snippets, system_instructions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Generate AI Response
router.post('/ai/response', async (req, res) => {
  const { brand, intent, message, kb_snippets, system_instructions, lead_id, chat_history, name } = req.body;
  try {
    let leadName = name || '';
    let persistedBrand = brand || 'ABM Groups';
    if (lead_id) {
      const leadContext = await pool.query(
        `SELECT l.name, c.name AS brand_name
         FROM leads l
         LEFT JOIN clients c ON c.id = l.client_id
         WHERE l.id = $1
         LIMIT 1`,
        [lead_id]
      );
      leadName = leadContext.rows[0]?.name || leadName;
      persistedBrand = leadContext.rows[0]?.brand_name || persistedBrand;
    }

    // Deterministic: the very first reply after the Core Talents bulk hiring
    // broadcast (template: hiring_template) always gets the fixed follow-up
    // line below, regardless of content and regardless of the lead's own CRM
    // brand. Campaign CSV imports intentionally never overwrite an existing
    // lead's client_id (see /api/leads/import), so a lead who already existed
    // under another brand keeps that brand's persistedBrand above — relying
    // on the prompt alone to override that "sticky brand" framing was not
    // reliable, so this is enforced here instead of left to the model.
    if (lead_id) {
      const lastCampaignRes = await pool.query(`
        SELECT clg.sent_at
        FROM campaign_logs clg
        JOIN campaigns camp ON camp.id = clg.campaign_id
        JOIN templates t ON t.id = camp.template_id
        WHERE clg.lead_id = $1 AND clg.status != 'failed' AND t.name = 'hiring_template'
        ORDER BY clg.sent_at DESC
        LIMIT 1
      `, [lead_id]);

      if (lastCampaignRes.rows.length > 0) {
        const replyCountRes = await pool.query(`
          SELECT COUNT(*) FROM messages m
          JOIN conversations c ON c.id = m.conversation_id
          WHERE c.lead_id = $1 AND m.direction = 'inbound' AND m.sent_at > $2
        `, [lead_id, lastCampaignRes.rows[0].sent_at]);

        if (parseInt(replyCountRes.rows[0].count, 10) === 1) {
          const ai_reply = 'For more details, kindly call this number: 9403892971.';
          return res.json({ ...req.body, brand: persistedBrand, name: leadName, ai_reply });
        }
      }
    }

    const firstName = getLeadFirstName(leadName);
    const isSimpleGreeting = /^(hi+|hello+|hey+|vanakkam)[\s!.,👋😊🙏]*$/iu.test(String(message || '').trim());

    // Detect voice/audio messages - respond immediately without AI
    const msgContent = String(message || '').toLowerCase();
    const isVoiceMessage = msgContent.includes('[voice_message]') ||
                         msgContent.includes('[audio]') ||
                         msgContent.includes('voice note') ||
                         msgContent.includes('🎧');

    if (isVoiceMessage) {
      const voiceReply = "Got your voice note 🎧 — could you type it quickly so I can help right away?";
      return res.json({ ...req.body, ai_reply: voiceReply });
    }

    // Greetings are deterministic so the model can never fall back to the old
    // all-brand recital. This also saves one paid Gemini request.
    if (isSimpleGreeting) {
      const ai_reply = firstName
        ? `Hey ${firstName}! 👋 How can I help you today?`
        : 'Hey! 👋 How can I help you today?';
      return res.json({ ...req.body, brand: persistedBrand, name: leadName, ai_reply });
    }

    let resolvedHistory = normalizeChatHistory(chat_history);
    if (resolvedHistory.length === 0 && lead_id) {
      resolvedHistory = await getRecentChatHistory(lead_id);
    }
    let historyText = "";
    if (resolvedHistory.length > 0) {
      historyText = "Chat History (oldest to newest):\n" + resolvedHistory.map(h => `${h.role}: ${h.text}`).join("\n") + "\n\n";
    }

    const prompt = `AI BRAIN SYSTEM INSTRUCTIONS (editable in LeadOS):\n${system_instructions || DEFAULT_BOT_BEHAVIOR}\n\n
      NON-NEGOTIABLE ORCHESTRATION RULES:
      - Current contact name: "${leadName || 'unknown'}". Current locked brand: "${persistedBrand}".
      - Address the contact naturally by first name ("${firstName || 'there'}") when useful, but do not repeat their name in every sentence.
      - The brand is sticky. Stay with "${persistedBrand}" unless the current message explicitly names or clearly keywords another ABM brand.
      - "Digital marketing" alone never switches brands. Under BM Academy it means the course; under BM TechX it means the service.
      - Academy learning signals: course, class, syllabus, batch, fees, training, placement, certification.
      - TechX service signals: marketing service/agency, run ads, business growth, website, branding service, lead generation, GMB or SEO service.
      - For a greeting, reply only: "${firstName ? `Hey ${firstName}! 👋 How can I help you today?` : 'Hey! 👋 How can I help you today?'}"
      - Never recite ABM Groups and its brand list as a default greeting.
      - Never reset the conversation or ask again for information already present in chat history.
      - Resolve follow-up phrases such as "this course", "that course", "it", "details", "fees", "duration", and "the syllabus" to the most recently selected course/topic in chat history.
      - If a course was identified earlier, keep it as the active course until the user explicitly selects a different course. Do not ask "which course?" again for a follow-up about that active course.
      - If the user asks a FAQ (like contact number, timings, or fees) mid-booking, provide the answer inline and immediately resume the booking flow. Do not reset the conversation or ask for information again.
      - Send exactly one concise WhatsApp reply for this user message.
      - Never claim a booking, calendar entry, reminder, or handoff succeeded unless the corresponding workflow result confirms it.

      KNOWLEDGE BASE REFERENCE:
      ${kb_snippets}

      ${historyText}User Intent detected: ${intent}
      User Message: "${message}"

      CRITICAL BEHAVIOR SPECIFICATIONS:
      1. Greeting: Mirror the user's opener (e.g. "hi" -> "Hi!", "hello" -> "Hello!"). Keep it to one short line. Do NOT open with "Vanakkam, this is ABM Groups" or list all brands on every message. Only fall back to full brand list if intent is genuinely unclear.
      2. Brand detection: Only switch brands if the new message clearly contains a different brand keyword (BM Academy, BM TechX, CoreTalents, Namma Pondy Properties, TravellersNeed, Dada's Kitchen, EduConsultants, BM Foundation). Otherwise, stick to the locked brand.
      3. Conversation memory: Never ask for something already provided (e.g., don't ask the time slot again after the user gave "4pm", or name if already given).
      4. Fallbacks: If it's a voice note (audio), reply: "Got your voice note 🎧 — could you type it quickly so I can help right away?". If unclear, ask ONE short clarifying question.
      5. Tone: Write a short, friendly WhatsApp reply mimicking a human sales assistant. End with exactly one question to keep the conversation going.
      6. Routing Numbers: Use these exact numbers if the user asks for contact info: Shared WABA (inbound) is ${process.env.SHARED_WABA_NUMBER || '919944509441'}, Outbound contact for ALL brands is ${process.env.OUTBOUND_CONTACT_NUMBER || '94038 92971'}, General / partnerships is ${process.env.GENERAL_PARTNERSHIPS_NUMBER || '99442 88271'}, BM Academy admissions is ${process.env.BM_ACADEMY_ADMISSIONS_NUMBER || '94038 92971'}.
      
      JSON OUTPUT REQUIREMENT:
      You MUST return your response as a raw JSON object with the following keys exactly:
      {
        "reply": "your generated reply message following the behavior specs",
        "extracted_name": "John Doe", (or null if the user has not provided their name)
        "extracted_booking_time": "2026-07-25T16:00:00Z" (or null if the user has not provided a preferred date/time for a call)
      }
      Respond ONLY with the JSON object, no markdown formatting, no backticks.`;

    const rawAiResponse = await generateOpenRouterContent(prompt);
      
    let ai_reply = "I'm sorry, I couldn't process that. Can you repeat?";
    let extractedData = null;

    try {
      const cleanJsonStr = rawAiResponse.replace(/\s*```json\s*/gi, '').replace(/\s*```\s*/g, '').trim();
      extractedData = JSON.parse(cleanJsonStr);
      ai_reply = extractedData.reply || rawAiResponse;

      if (lead_id) {
         if (extractedData.extracted_name) {
           await pool.query(`UPDATE leads SET name = $1 WHERE id = $2`, [extractedData.extracted_name, lead_id]);
         }
         if (extractedData.extracted_booking_time) {
           // When a booking time is extracted, set status to 'booked' to STOP follow-ups
           await pool.query(`UPDATE leads SET call_booked_at = $1, status = 'booked', updated_at = NOW() WHERE id = $2`, [extractedData.extracted_booking_time, lead_id]);
           console.log(`[AI Booking] Lead ${lead_id} booked for ${extractedData.extracted_booking_time} - follow-ups STOPPED`);
         }
      }
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON:", parseErr.message, rawAiResponse);
      ai_reply = rawAiResponse; 
    }

    res.json({ ...req.body, ai_reply });
  } catch (err) {
    // Keep the WhatsApp workflow moving when every AI model is temporarily
    // slow/unavailable. HTTP 200 prevents an nginx/n8n 504 failure.
    if (err instanceof OpenRouterServiceError && err.retryable) {
      console.error('[AI] Returning safe fallback after provider timeout:', err.message);
      return res.json({
        ...req.body,
        ai_reply: "I'm taking a little longer than usual. Please send that once more, and I'll help you right away.",
        ai_fallback: true,
        ai_error_code: err.category,
      });
    }
    sendAiError(res, err);
  }
});

// 5. Qualify And Score - DETERMINISTIC FORMULA (no LLM involvement)
router.post('/leads/score', async (req, res) => {
  const { lead_id, message, intent, objections } = req.body;
  try {
    let scoreBoost = 0;

    // Intent-based scoring (deterministic)
    if (intent === 'BOOK_CALL' || intent === 'PRICING') scoreBoost = 20;
    else if (intent === 'NOT_INTERESTED') scoreBoost = -20;
    else if (intent === 'MORE_INFO' || intent === 'GENERAL_CHAT') scoreBoost = 5;
    else if (intent === 'COMPLAINT') scoreBoost = -15;
    else scoreBoost = 5; // Default

    // Objection-based scoring (deterministic)
    if (objections) {
      const obj = String(objections).toLowerCase();
      if (obj.includes('too_expensive') || obj.includes('no_time')) scoreBoost -= 10;
      if (obj.includes('not_sure')) scoreBoost -= 5;
      if (obj.includes('using_competitor')) scoreBoost -= 10;
    }

    const result = await pool.query(
      `UPDATE leads SET score = LEAST(GREATEST(score + $1, 0), 100), updated_at = NOW() WHERE id = $2 RETURNING score`,
      [scoreBoost, lead_id]
    );

    console.log(`[Lead Scoring] Lead ${lead_id}: intent=${intent}, objections=${objections}, boost=${scoreBoost}, new_score=${result.rows[0]?.score}`);
    res.json({ ...req.body, lead_score: result.rows[0]?.score || 10 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Assign Owner
router.post('/leads/assign-owner', async (req, res) => {
  const { lead_id, brand, lead_score, intent } = req.body;
  try {
    let owner = 'System (AI)';
    if (lead_score >= 75) {
      // For hot leads, try to find a real human user; fallback to 'Sales Team' group
      const userRes = await pool.query(
        `SELECT id FROM users WHERE role IN ('admin', 'agent', 'sales') AND is_active = true ORDER BY created_at ASC LIMIT 1`
      );
      if (userRes.rows.length > 0) {
        owner = String(userRes.rows[0].id);
      } else {
        owner = 'Sales Team';
      }
    }

    await pool.query(`UPDATE leads SET owner = $1 WHERE id = $2`, [owner, lead_id]);
    res.json({ ...req.body, owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Update CRM
router.post('/leads/update', async (req, res) => {
  const { lead_id, stage, owner, lead_score, intent } = req.body;
  try {
    let status = 'new';
    if (lead_score >= 75) status = 'hot';
    else if (lead_score >= 40) status = 'warm';
    else if (lead_score < 10) status = 'cold';

    await pool.query(
      `UPDATE leads SET status = COALESCE($1, status), owner = COALESCE($2, owner), updated_at = NOW() WHERE id = $3`,
      [status, owner, lead_id]
    );
    res.json({ ...req.body, success: true, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Send Communication
router.post('/communication/send', async (req, res) => {
  const { lead_id, channel, type, content } = req.body;
  try {
    const safeContent = content || "Thank you for reaching out to ABM Groups! We have received your message and will get back to you shortly.";
    const msgType = type || 'text';

    // 1. Fetch lead & client details to get phone number, phone_number_id, and access token for Meta Cloud API
    const leadRes = await pool.query(`
      SELECT l.*, c.phone_number_id, c.wa_access_token as client_wa_token
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE l.id = $1
    `, [lead_id]);

    const lead = leadRes.rows[0];
    const phoneNumberId = lead?.phone_number_id || process.env.WA_PHONE_NUMBER_ID;
    const waAccessToken = lead?.client_wa_token || process.env.META_PAGE_ACCESS_TOKEN;

    // 2. Send real outbound message via Meta WhatsApp Cloud API (`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`)
    let waMessageId = null;
    if (channel === 'whatsapp' && lead && lead.phone && phoneNumberId && waAccessToken) {
      try {
        const phoneDigits = lead.phone.replace(/\D/g, '');
        const payload = {
          messaging_product: 'whatsapp',
          to: phoneDigits,
          type: 'text',
          text: { body: safeContent }
        };

        console.log(`[Send Communication] Sending AI WhatsApp response to ${phoneDigits} via Meta API...`);
        const waRes = await axios.post(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          payload,
          { headers: { Authorization: `Bearer ${waAccessToken}`, 'Content-Type': 'application/json' } }
        );
        waMessageId = waRes.data?.messages?.[0]?.id || null;
        console.log(`✅ [Send Communication] Meta WhatsApp delivered successfully! Message ID: ${waMessageId}`);
      } catch (waErr) {
        console.error(`⚠️ [Send Communication] Meta Graph API Error:`, waErr.response?.data || waErr.message);
      }
    }

    // 3. Upsert conversation in DB and update last_message timestamp so it jumps to top of LeadOS Inbox!
    const conversation_id = await getOrUpsertConversation(lead_id);
    await pool.query(`
      UPDATE conversations
      SET last_message = $1,
          last_message_at = NOW()
      WHERE id = $2
    `, [safeContent, conversation_id]);

    // 4. Insert message into messages table
    const { rows: savedRows } = await pool.query(
      `INSERT INTO messages (conversation_id, direction, msg_type, content, wa_msg_id, status, is_ai, sent_at) VALUES ($1, 'outbound', $2, $3, $4, 'sent', true, NOW()) RETURNING id, direction, content, msg_type as type, wa_msg_id, status, is_ai, sent_at as timestamp`,
      [conversation_id, msgType, safeContent, waMessageId]
    );

    // 5. Emit real-time Socket.IO event so LeadOS WhatsApp Inbox UI updates instantly without page refresh
    try {
      const io = req.app?.get('io') || global.io;
      if (io) {
        io.emit('outgoing_message', { lead_id: Number(lead_id), message: savedRows[0] });
        io.emit('message_sent', { lead_id: Number(lead_id), message: savedRows[0] });
        io.emit('incoming_message', { lead_id: Number(lead_id), message: savedRows[0] });
        io.emit('ai_typing', { lead_id: String(lead_id), typing: false });
      }
    } catch (ioErr) {
      console.warn('Socket emit warning:', ioErr.message);
    }

    res.json({ ...req.body, success: true, delivered: true, content: safeContent, wa_msg_id: waMessageId });
  } catch (err) {
    console.error('[Send Communication Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── SEND TO FOUNDER (WF06 REPORT) ──────────────────────
router.post('/communication/send-founder', async (req, res) => {
  const { channel, type, content } = req.body;
  try {
    const founderPhone = process.env.FOUNDER_WHATSAPP_PHONE || '8807226257';
    const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
    const waAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

    let waMessageId = null;
    if (channel === 'whatsapp' && founderPhone && phoneNumberId && waAccessToken) {
      try {
        const phoneDigits = founderPhone.replace(/\D/g, '');
        const payload = {
          messaging_product: 'whatsapp',
          to: phoneDigits,
          type: 'text',
          text: { body: content }
        };

        console.log(`[Send Founder Report] Sending to ${phoneDigits} via Meta API...`);
        const waRes = await axios.post(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          payload,
          { headers: { Authorization: `Bearer ${waAccessToken}`, 'Content-Type': 'application/json' } }
        );
        waMessageId = waRes.data?.messages?.[0]?.id || null;
        console.log(`✅ [Send Founder Report] Meta WhatsApp delivered successfully! Message ID: ${waMessageId}`);
      } catch (waErr) {
        console.error(`⚠️ [Send Founder Report] Meta Graph API Error:`, waErr.response?.data || waErr.message);
      }
    }

    // Automatically log this as a Workflow Log so the UI can display it in FounderReportsView
    await pool.query(
      `INSERT INTO workflow_logs (workflow, status, message) VALUES ($1, $2, $3)`,
      ['WF06', 'success', content]
    );

    res.json({ success: true, delivered: true, content, wa_msg_id: waMessageId });
  } catch (err) {
    console.error('[Send Founder Report Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Workflow Logger
router.post('/workflows/log', async (req, res) => {
  const { workflow, lead_id, status, message } = req.body;
  try {
    await pool.query(
      `INSERT INTO workflow_logs (workflow, lead_id, status, message) VALUES ($1, $2, $3, $4)`,
      [workflow, lead_id, status, message || null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/workflows/logs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.id, w.workflow, w.lead_id, w.status, w.message, w.created_at, 
             l.name as lead_name, l.source, l.campaign_name, l.campaign_id, 
             l.ad_name, l.ad_id, l.lead_ad_form_id, l.meta_lead_id, l.phone, l.email
      FROM workflow_logs w
      LEFT JOIN leads l ON w.lead_id = CAST(l.id AS TEXT)
      ORDER BY w.created_at DESC
      LIMIT 1000
    `);
    res.json({ logs: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/workflows/logs/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM workflow_logs WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Log not found' });
    res.json({ success: true, deleted_id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/workflows/telemetry', async (req, res) => {
  try {
    // 1. Total executions
    const totalRes = await pool.query(`SELECT COUNT(*) as count FROM workflow_logs`);
    const totalExecutions = parseInt(totalRes.rows[0].count) || 0;

    // 2. Success Rate
    const successRes = await pool.query(`SELECT COUNT(*) as count FROM workflow_logs WHERE status = 'success'`);
    const successCount = parseInt(successRes.rows[0].count) || 0;
    const successRate = totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 100;

    // 3. AI Interventions
    const aiRes = await pool.query(`SELECT COUNT(*) as count FROM ai_decisions`);
    const aiInterventions = parseInt(aiRes.rows[0].count) || 0;

    res.json({
      telemetry: {
        totalExecutions,
        successRate,
        aiInterventions,
        activeWorkflows: 8
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WF03 & WF06 - Reporting & Dashboard
// ==========================================

router.get('/reports/revenue-today', async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) * 500 as revenue FROM leads WHERE status = 'converted' AND updated_at >= CURRENT_DATE`);
    res.json({ revenue: parseInt(result.rows[0].revenue) || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/revenue-month', async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) * 500 as revenue FROM leads WHERE status = 'converted' AND date_trunc('month', updated_at) = date_trunc('month', CURRENT_DATE)`);
    res.json({ revenue: parseInt(result.rows[0].revenue) || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/brand-revenue', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.name as brand, (COUNT(l.id) * 500) as revenue 
      FROM leads l
      JOIN clients c ON l.client_id = c.id
      WHERE l.status = 'converted'
      GROUP BY c.name
    `);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/lead-sources', async (req, res) => {
  try {
    const result = await pool.query(`SELECT source, COUNT(*) as count FROM leads GROUP BY source`);
    res.json({ sources: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/conversion-rate', async (req, res) => {
  try {
    const result = await pool.query(`SELECT status, COUNT(*) as count FROM leads GROUP BY status`);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/followups-pending', async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM leads WHERE next_followup_due > NOW() AND status != 'converted'`);
    res.json({ pending: parseInt(result.rows[0].count) || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/sla-breaches', async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM leads WHERE next_followup_due < NOW() AND status != 'converted'`);
    res.json({ breaches: parseInt(result.rows[0].count) || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/ai-performance', async (req, res) => {
  try {
    const result = await pool.query(`SELECT AVG(confidence) as avg_confidence FROM ai_decisions`);
    res.json({ avg_confidence: parseFloat(result.rows[0].avg_confidence) || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// WF02 - Followup Engine
// ==========================================
router.get('/followups/due', async (req, res) => {
  try {
    const MAX_FOLLOWUP_ATTEMPTS = 5; // Stop after 5 attempts

    const result = await pool.query(`
      SELECT l.id as lead_id, l.name, l.phone,
             COALESCE(c.name, 'ABM Groups') as brand,
             l.stage, COALESCE(l.touch_count, 0) as touch_count
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE l.next_followup_due <= NOW()
        AND l.status NOT IN ('converted', 'booked', 'lost', 'opt-out')
        AND (l.status != 'opt-out' OR l.status IS NULL)
        AND l.call_booked_at IS NULL
        AND (l.touch_count IS NULL OR l.touch_count < $1)
    `, [MAX_FOLLOWUP_ATTEMPTS]);
    res.json({ followups: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Fetch Followup Rule
router.post('/followups/rule', async (req, res) => {
  const { touch_count } = req.body;
  try {
    const cadenceHours = [4, 8, 12, 24, 72];
    const currentTouch = Math.max(0, Number(touch_count) || 0);
    const nextDelayHours = cadenceHours[currentTouch + 1] ?? null;
    let base_channel = 'whatsapp';
    let template_id = currentTouch > 1 ? 're_engagement' : 'welcome_followup';
    let payload_template = currentTouch > 1
      ? "Hey! Just checking back in - still interested in learning more?"
      : "Hi there! Following up on your interest with us - any questions I can help with?";
    let ai_prompt_template = `contextual_followup_attempt_${currentTouch + 1}`;

    if (currentTouch >= 5) {
      base_channel = 'internal_note';
      payload_template = 'Lead completed all five staged follow-ups without conversion. Review for a manual call or respectful close.';
    }

    res.json({
      ...req.body,
      current_delay_hours: cadenceHours[currentTouch] ?? 4,
      delay_hours: nextDelayHours,
      base_channel,
      template_id,
      payload_template,
      ai_prompt_template,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Opt-out: Stop follow-ups when lead says "not interested"
router.post('/leads/opt-out', async (req, res) => {
  const { lead_id, reason } = req.body;
  try {
    if (!lead_id) {
      return res.status(400).json({ success: false, error: "Missing lead_id" });
    }

    await pool.query(
      `UPDATE leads SET status = 'opt-out', updated_at = NOW() WHERE id = $1`,
      [lead_id]
    );

    console.log(`[Opt-Out] Lead ${lead_id} opted out - follow-ups STOPPED`);
    res.json({ success: true, message: "Lead has been opted out. No more follow-ups will be sent." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Check 24h Window
router.post('/whatsapp/check-24h', async (req, res) => {
  const { lead_id, base_channel, template_id, payload_template, ai_prompt_template } = req.body;
  try {
    const result = await pool.query(`
      SELECT m.sent_at FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.lead_id = $1 AND m.direction = 'inbound'
      ORDER BY m.sent_at DESC LIMIT 1
    `, [lead_id]);
    let within_24h = false;
    if (result.rows.length > 0) {
      const hours = (new Date() - new Date(result.rows[0].sent_at)) / 36e5;
      if (hours < 24) within_24h = true;
    }

    let action_type = base_channel;
    if (base_channel === 'whatsapp') {
      action_type = within_24h ? 'whatsapp_text' : 'whatsapp_template';
    }

    res.json({
      ...req.body,
      within_24h,
      action: { action_type, template_id, payload_template, ai_prompt_template }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Generate & Send Followup AI Text
router.post('/ai/followup', async (req, res) => {
  const { lead_id } = req.body;
  try {
    const leadRes = await pool.query(`
      SELECT l.*, c.name as brand_name, c.phone_number_id, c.wa_access_token as client_wa_token
      FROM leads l LEFT JOIN clients c ON l.client_id = c.id WHERE l.id = $1
    `, [lead_id]);
    const lead = leadRes.rows[0];
    const brandName = lead?.brand_name || 'ABM Groups';
    const touchCount = lead?.touch_count ?? 0;
    const leadName = (lead?.name || '').split(' ')[0] || 'there';

    if (!lead || ['converted', 'booked', 'opt-out', 'lost'].includes(lead.status) || lead.call_booked_at) {
      return res.json({ ...req.body, success: true, delivered: false, skipped: true, reason: 'stop_condition' });
    }

    const historyRes = await pool.query(`
      SELECT m.direction, m.content, m.sent_at
      FROM messages m
      JOIN conversations conversation ON conversation.id = m.conversation_id
      WHERE conversation.lead_id = $1
        AND m.content IS NOT NULL
        AND BTRIM(m.content) <> ''
      ORDER BY m.sent_at DESC
      LIMIT 10
    `, [lead_id]);
    const recentHistory = historyRes.rows.reverse();
    const latestMessage = recentHistory[recentHistory.length - 1];
    if (!latestMessage || latestMessage.direction === 'inbound') {
      return res.json({
        ...req.body,
        success: true,
        delivered: false,
        skipped: true,
        reason: latestMessage ? 'customer_message_awaiting_reply' : 'no_conversation_history',
      });
    }

    let ai_reply = `Hi ${leadName}, are you still interested in our program?`;
    if (ai) {
      const historyText = recentHistory
        .map((item) => `${item.direction === 'inbound' ? 'Customer' : 'Assistant'}: ${item.content}`)
        .join('\n');
      const prompt = `You write conversion-focused WhatsApp follow-ups for ABM Groups.
Brand: ${brandName}
Lead first name: ${leadName}
Follow-up attempt: ${touchCount + 1} of 5

Latest conversation (oldest to newest):
${historyText}

Write one natural follow-up that continues the unfinished topic. Reference the specific course, service, job, property, trip, food order, admission, or charity topic already discussed. Never ask the lead to repeat information already present. Use a warm human tone, no pressure, no invented price, offer, availability, or deadline, and no more than 3 short sentences. End with exactly one easy question that moves toward the appropriate conversion step. Return only the message text.`;
      ai_reply = await generateOpenRouterContent(prompt);
    }

    let delivered = false;
    let waMessageId = null;
    const phoneNumberId = lead?.phone_number_id || process.env.WA_PHONE_NUMBER_ID;
    const waAccessToken = lead?.client_wa_token || process.env.META_PAGE_ACCESS_TOKEN;
    if (lead && lead.phone && phoneNumberId && waAccessToken) {
      try {
        const phoneDigits = lead.phone.replace(/\D/g, '');
        const waRes = await axios.post(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          { messaging_product: 'whatsapp', to: phoneDigits, type: 'text', text: { body: ai_reply } },
          { headers: { Authorization: `Bearer ${waAccessToken}`, 'Content-Type': 'application/json' } }
        );
        waMessageId = waRes.data?.messages?.[0]?.id || null;
        delivered = true;
      } catch (waErr) {
        console.error('[ai/followup send error]', waErr.response?.data || waErr.message);
      }
    }

    if (lead) {
      const conversation_id = await getOrUpsertConversation(lead_id);
      await pool.query(`UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`, [ai_reply, conversation_id]);
      await pool.query(
        `INSERT INTO messages (conversation_id, direction, msg_type, content, wa_msg_id, status, is_ai, sent_at) VALUES ($1, 'outbound', 'text', $2, $3, $4, true, NOW())`,
        [conversation_id, ai_reply, waMessageId, delivered ? 'sent' : 'failed']
      );
    }

    res.json({ ...req.body, success: true, ai_reply, delivered });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// WF03 - Reminder Engine
// ==========================================

router.get('/reports/today-calls', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id as lead_id, name, call_booked_at as time FROM leads WHERE call_booked_at >= CURRENT_DATE AND call_booked_at < CURRENT_DATE + INTERVAL '1 day'`);
    res.json({ calls: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/today-followups', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id as lead_id, name, stage FROM leads WHERE next_followup_due >= CURRENT_DATE AND next_followup_due < CURRENT_DATE + INTERVAL '1 day'`);
    res.json({ followups: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/hot-leads', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, score FROM leads WHERE status = 'hot' ORDER BY score DESC LIMIT 10`);
    res.json({ hot_leads: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/report-generator', async (req, res) => {
  const data = req.body.data || req.body.metrics || req.body;
  try {
    if (!ai) return res.json({ summary: "Daily Summary generated." });

    // STRICT rules to prevent hallucination and force INR
    const prompt = `You are a financial reporter for an Indian business. CRITICAL RULES:
1. ALL currency amounts MUST use Indian Rupees (₹) symbol - NEVER use $ or USD
2. Do NOT invent any numbers, scores, or percentages not present in the data
3. Use ONLY the exact metrics provided below
4. If a metric is missing, state "Not available" - never make it up
5. Output ONLY bullet points, no extra commentary

Data to summarize:
${JSON.stringify(data, null, 2)}

Write exactly 3 bullet points. Use format: "• ₹X,XXX" for all currency values.`;

    let summary = await generateOpenRouterContent(prompt);
    console.log('[report-generator] Raw LLM response:', summary);

    // Post-process: Force INR currency - split on $ and rejoin with ₹
    summary = summary.split('$').join('₹');

    console.log('[report-generator] After replace:', summary);

    res.json({ summary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// WF04 - Customer Journey
// ==========================================

router.post('/leads/find-by-invoice', async (req, res) => {
  const { invoice_id, lead_id, link_id } = req.body;
  try {
    let lead = null;
    const cleanLeadId = lead_id && lead_id !== 'null' && lead_id !== 'undefined' && lead_id !== '' ? parseInt(lead_id, 10) : null;
    console.log('[salesos find-by-invoice] received:', { invoice_id, lead_id, link_id, cleanLeadId });

    // 1. Try cleanLeadId first (fastest, from notes.lead_id)
    if (cleanLeadId && !isNaN(cleanLeadId)) {
      const lr = await pool.query(
        `SELECT l.id AS lead_id, l.name, l.phone, c.name AS brand, c.id AS brand_id
         FROM leads l LEFT JOIN clients c ON c.id = l.client_id
         WHERE l.id = $1::integer`, [cleanLeadId]
      );
      if (lr.rows.length) {
        lead = lr.rows[0];
        // Capture payment & mark lead converted
        if (invoice_id) {
          await pool.query(
            `UPDATE payments SET razorpay_payment_id = $1, status = 'captured'
             WHERE lead_id = $2 AND razorpay_payment_id IS NULL`,
            [invoice_id, cleanLeadId]
          ).catch(() => {});
          await pool.query(
            `UPDATE leads SET status = 'converted', score = 100 WHERE id = $1`,
            [cleanLeadId]
          ).catch(() => {});
          console.log(`[salesos find-by-invoice] ✅ Lead ${cleanLeadId} marked converted, payment ${invoice_id} saved`);
        }
      }
    }

    // 2. Try by link_id (payment link ID plink_xxx)
    if (!lead && link_id && link_id !== 'null' && link_id !== 'undefined' && link_id !== '') {
      const pr = await pool.query(
        `SELECT l.id AS lead_id, l.name, l.phone, c.name AS brand, c.id AS brand_id
         FROM payments p
         JOIN leads l ON l.id = p.lead_id
         LEFT JOIN clients c ON c.id = l.client_id
         WHERE p.razorpay_link_id = $1
         LIMIT 1`, [link_id]
      );
      if (pr.rows.length) {
        lead = pr.rows[0];
        if (invoice_id) {
          await pool.query(
            `UPDATE payments SET razorpay_payment_id = $1, status = 'captured' WHERE razorpay_link_id = $2`,
            [invoice_id, link_id]
          ).catch(() => {});
          await pool.query(
            `UPDATE leads SET status = 'converted', score = 100 WHERE id = $1`,
            [lead.lead_id]
          ).catch(() => {});
        }
      }
    }

    // 3. Try fallback by invoice_id
    if (!lead && invoice_id && invoice_id !== 'null') {
      const pr = await pool.query(
        `SELECT l.id AS lead_id, l.name, l.phone, c.name AS brand, c.id AS brand_id
         FROM payments p
         JOIN leads l ON l.id = p.lead_id
         LEFT JOIN clients c ON c.id = l.client_id
         WHERE p.razorpay_payment_id = $1
         ORDER BY p.created_at DESC LIMIT 1`, [invoice_id]
      );
      lead = pr.rows[0] || null;
    }

    // 4. Ultimate fallback: most recently won lead (for manual tests)
    if (!lead) {
      const fallback = await pool.query(
        `SELECT l.id as lead_id, l.name, l.phone, c.name as brand, l.client_id as brand_id
         FROM leads l LEFT JOIN clients c ON l.client_id = c.id
         WHERE l.status = 'converted' ORDER BY l.updated_at DESC LIMIT 1`
      );
      lead = fallback.rows[0] || null;
    }

    res.json({
      ...req.body,
      lead_id: lead?.lead_id || null,
      name: lead?.name || null,
      phone: lead?.phone || null,
      brand: lead?.brand || 'ABM Groups',
      brand_id: lead?.brand_id || null
    });
  } catch (err) {
    console.error('[salesos find-by-invoice] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Immediate post-payment onboarding sequence. Action values must match the
// Execute Journey Step switch in WF04 exactly. There's no journey_steps table
// yet, so this is a fixed sequence rather than per-brand configurable - the
// delayed nurture steps (feedback/review/referral, sent days/weeks later)
// need a scheduled trigger like WF02's follow-up engine and aren't included here.
router.post('/journey/steps', async (req, res) => {
  try {
    const steps = [
      { action: 'send_invoice' },
      { action: 'send_welcome' },
      { action: 'add_to_whatsapp_group' },
      { action: 'grant_access' },
      { action: 'trigger_orientation' }
    ];
    res.json({ ...req.body, steps });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Journey Actions
router.post('/invoices/send', async (req, res) => {
  const { lead_id } = req.body;
  try {
    const payRes = await pool.query(`SELECT amount, currency FROM payments WHERE lead_id = $1 AND status = 'captured' ORDER BY created_at DESC LIMIT 1`, [lead_id]);
    const payment = payRes.rows[0];
    const amountText = payment ? `${payment.currency || 'INR'} ${payment.amount}` : 'your payment';
    const content = `Thank you for your payment of ${amountText}! Your invoice has been recorded. If you need a formal receipt, reply here and our team will send one over.`;
    const sendResult = await sendWhatsAppText(lead_id, content);
    res.json({ ...req.body, success: true, ...sendResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NOTE: Meta's WhatsApp Cloud API has no endpoint to programmatically add a
// user to a WhatsApp group - that's not something the Business API supports.
// This sends a real message; an actual group invite link would need to be
// configured per-client (no such field exists in `clients` yet) and pasted in.
router.post('/whatsapp/add-to-group', async (req, res) => {
  const { lead_id } = req.body;
  try {
    const content = `Welcome aboard! We'll be sharing your community group invite link shortly - keep an eye on this chat.`;
    const sendResult = await sendWhatsAppText(lead_id, content);
    await pool.query(`INSERT INTO workflow_logs (workflow, lead_id, status, message) VALUES ('WF04', $1, 'success', $2)`, [lead_id, 'WhatsApp group invite requested (manual link send required - no group-invite API in Meta Cloud API)']);
    res.json({ ...req.body, success: true, ...sendResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/access/grant', async (req, res) => {
  const { lead_id } = req.body;
  try {
    await pool.query(`UPDATE leads SET payment_status = 'access_granted', updated_at = NOW() WHERE id = $1`, [lead_id]);
    const content = `You're all set! Your access has been granted - check your email for login details, or reply here if you need help getting started.`;
    const sendResult = await sendWhatsAppText(lead_id, content);
    res.json({ ...req.body, success: true, ...sendResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NOTE: no dedicated tasks table exists - logged into workflow_logs so it's
// visible on the Workflow Logs page, same pattern as WF02's internal-note.
router.post('/tasks/create', async (req, res) => {
  const { lead_id, type } = req.body;
  try {
    await pool.query(`INSERT INTO workflow_logs (workflow, lead_id, status, message) VALUES ('WF04', $1, 'pending', $2)`, [lead_id, `Task created: ${type || 'general'}`]);
    res.json({ ...req.body, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/leads/log-event', async (req, res) => {
  const { lead_id, event } = req.body;
  try {
    await pool.query(`INSERT INTO workflow_logs (workflow, lead_id, status, message) VALUES ('WF04', $1, 'success', $2)`, [lead_id, `Event: ${event || 'unknown'}`]);
    res.json({ ...req.body, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// WF05 - Marketing Automation
// ==========================================

router.get('/campaigns/active', async (req, res) => {
  try {
    // Due = scheduled to run and either unscheduled (run ASAP) or its time has passed.
    // 'running'/'completed'/'failed' are excluded so a campaign is only ever executed once.
    const result = await pool.query(`
      SELECT id as campaign_id, name, client_id FROM campaigns
      WHERE status = 'scheduled' AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    `);
    res.json({ campaigns: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/campaigns/select-leads', async (req, res) => {
  const { campaign_id, status_filter } = req.body;
  try {
    let query = `SELECT id, phone, name FROM leads WHERE status != 'converted' AND phone IS NOT NULL LIMIT 500`;
    if (status_filter) {
      query = `SELECT id, phone, name FROM leads WHERE status = $1 AND phone IS NOT NULL LIMIT 500`;
      const result = await pool.query(query, [status_filter]);
      return res.json({ leads: result.rows });
    }
    const result = await pool.query(query);
    res.json({ leads: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/campaigns/check-frequency', async (req, res) => {
  const { lead_id } = req.body;
  try {
    const convRes = await pool.query(`SELECT id FROM conversations WHERE lead_id = $1 LIMIT 1`, [lead_id]);
    if (convRes.rows.length === 0) return res.json({ allowed: true });
    const conversation_id = convRes.rows[0].id;

    const result = await pool.query(`SELECT sent_at FROM messages WHERE conversation_id = $1 AND direction = 'outbound' AND msg_type = 'campaign' ORDER BY sent_at DESC LIMIT 1`, [conversation_id]);
    let allowed = true;
    if (result.rows.length > 0) {
      const days = (new Date() - new Date(result.rows[0].sent_at)) / (36e5 * 24);
      if (days < 7) allowed = false; // Cap at 1 marketing message per 7 days
    }
    res.json({ allowed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/campaigns/log', (req, res) => res.json({ success: true }));

// ==========================================
// WF07 - Admin & Maintenance
// ==========================================

router.post('/admin/retry', async (req, res) => {
  try {
    const result = await pool.query(`UPDATE messages SET status = 'pending' WHERE status = 'failed' RETURNING id`);
    res.json({ retried_count: result.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/admin/cleanup', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM workflow_logs WHERE created_at < NOW() - INTERVAL '30 days'`);
    res.json({ deleted_logs: result.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/admin/refresh-embeddings', async (req, res) => {
  try {
    // In a real system, you'd trigger a vector DB sync here
    res.json({ success: true, embeddings_updated: 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// Missing Workflows Endpoints Implementation
// ==========================================

router.post('/communication/send-email', (req, res) => {
  // Mock endpoint for sending emails (could integrate SendGrid here)
  res.json({ ...req.body, success: true, delivered: true, channel: 'email' });
});

router.post('/communication/send-template', (req, res) => {
  // Mock endpoint for sending WhatsApp templates (could integrate Meta API here)
  res.json({ ...req.body, success: true, delivered: true, channel: 'whatsapp_template' });
});

router.post('/leads/internal-note', async (req, res) => {
  const { lead_id, note } = req.body;
  try {
    await pool.query(`INSERT INTO workflow_logs (workflow, lead_id, status, message) VALUES ('WF02', $1, 'success', $2)`, [lead_id, `Internal Note: ${note}`]);
    res.json({ ...req.body, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/leads/update-followup', async (req, res) => {
  const { lead_id, touch_count_increment } = req.body;
  try {
    const increment = touch_count_increment || 1;
    const query = `
      UPDATE leads
      SET touch_count = COALESCE(touch_count, 0) + $1,
          next_followup_due = CASE COALESCE(touch_count, 0) + $1
            WHEN 1 THEN NOW() + INTERVAL '8 hours'
            WHEN 2 THEN NOW() + INTERVAL '12 hours'
            WHEN 3 THEN NOW() + INTERVAL '24 hours'
            WHEN 4 THEN NOW() + INTERVAL '72 hours'
            ELSE NULL
          END,
          updated_at = NOW()
      WHERE id = $2
        AND status NOT IN ('converted', 'booked', 'opt-out', 'lost')
        AND call_booked_at IS NULL
    `;
    await pool.query(query, [increment, lead_id]);
    res.json({ ...req.body, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/overdue-followups', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, next_followup_due FROM leads WHERE next_followup_due < NOW() AND status != 'converted' LIMIT 50`);
    res.json({ overdue: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/pending-payments', async (req, res) => {
  try {
    // We don't have an invoice table, so we fallback to a mock for now
    res.json({ pending: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Combines all 5 WF03 metrics server-side in one call, so the n8n workflow
// doesn't need a Merge node to reassemble 5 parallel branches.
// NOTE: leads.owner only ever holds the generic bucket 'human_sales' or 'ai_bot' -
// there is no per-individual sales-rep assignment in the schema today, so this
// produces one combined "human sales team" summary rather than per-person lists.
router.get('/reports/reminder-bundle', async (req, res) => {
  try {
    const [calls, followups, payments, overdue, hot] = await Promise.all([
      pool.query(`SELECT id as lead_id, name, call_booked_at as time, owner FROM leads WHERE call_booked_at >= CURRENT_DATE AND call_booked_at < CURRENT_DATE + INTERVAL '1 day'`),
      pool.query(`SELECT id as lead_id, name, stage, owner FROM leads WHERE next_followup_due >= CURRENT_DATE AND next_followup_due < CURRENT_DATE + INTERVAL '1 day'`),
      Promise.resolve({ rows: [] }), // no invoice table yet - mirrors /reports/pending-payments
      pool.query(`SELECT id, name, next_followup_due, owner FROM leads WHERE next_followup_due < NOW() AND status != 'converted' LIMIT 50`),
      pool.query(`SELECT id, name, score, owner FROM leads WHERE status = 'hot' ORDER BY score DESC LIMIT 10`)
    ]);

    const metrics = {
      calls: calls.rows, followups: followups.rows, pending_payments: payments.rows,
      overdue: overdue.rows, hot_leads: hot.rows
    };

    const humanTaskCount = calls.rows.filter(r => r.owner === 'human_sales').length
      + followups.rows.filter(r => r.owner === 'human_sales').length
      + overdue.rows.filter(r => r.owner === 'human_sales').length
      + hot.rows.filter(r => r.owner === 'human_sales').length;

    // Sync tasks to sales_tasks table
    const insertTask = async (lead_id, type) => {
       const exists = await pool.query(`SELECT id FROM sales_tasks WHERE lead_id = $1 AND task_type = $2 AND DATE(created_at) = CURRENT_DATE`, [lead_id, type]);
       if (exists.rows.length === 0) {
         await pool.query(`INSERT INTO sales_tasks (lead_id, task_type) VALUES ($1, $2)`, [lead_id, type]);
       }
    };
    for (const c of calls.rows) await insertTask(c.lead_id || c.id, 'call');
    for (const f of followups.rows) await insertTask(f.lead_id || f.id, 'followup');
    for (const o of overdue.rows) await insertTask(o.lead_id || o.id, 'overdue');
    for (const h of hot.rows) await insertTask(h.lead_id || h.id, 'hot_lead');

    const salesperson_summaries = [{
      owner: 'human_sales',
      text: `Today's Tasks: ${followups.rows.length} Follow-ups, ${calls.rows.length} Calls, ${payments.rows.length} Payments, ${hot.rows.length} HOT Leads, ${overdue.rows.length} Overdue. (${humanTaskCount} assigned to the human sales team.)`
    }];

    let founder_summary = `Daily Summary - Calls: ${calls.rows.length}, Followups: ${followups.rows.length}, Pending Payments: ${payments.rows.length}, Overdue: ${overdue.rows.length}, Hot Leads: ${hot.rows.length}.`;
    if (ai) {
      try {
        const prompt = `Summarize these daily sales metrics for a Founder Dashboard:\n${JSON.stringify(metrics)}\nWrite 3 short bullet points highlighting wins and risks (like SLA breaches or pending payments).`;
        founder_summary = await generateOpenRouterContent(prompt);
      } catch (e) { console.error('[reminder-bundle] Gemini summary failed:', e.message); }
    }

    res.json({ success: true, metrics, salesperson_summaries, founder_summary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Direct staff/founder notification - does NOT touch leads/conversations tables,
// since this isn't lead messaging. Requires FOUNDER_WHATSAPP_PHONE (or an explicit
// `phone`) to actually deliver; otherwise it no-ops with delivered:false so callers
// can see nothing was sent instead of silently failing.
router.post('/communication/notify-staff', async (req, res) => {
  const { phone, content, label } = req.body;
  try {
    const targetPhone = phone || process.env.FOUNDER_WHATSAPP_PHONE;
    if (!targetPhone) {
      console.warn(`[notify-staff] No phone configured for "${label || 'recipient'}" - skipping. Set FOUNDER_WHATSAPP_PHONE in .env or pass phone explicitly.`);
      return res.json({ ...req.body, success: true, delivered: false, reason: 'no_phone_configured' });
    }

    const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
    const waAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
    let delivered = false, waMessageId = null;
    if (phoneNumberId && waAccessToken) {
      try {
        const phoneDigits = targetPhone.replace(/\D/g, '');
        const waRes = await axios.post(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          { messaging_product: 'whatsapp', to: phoneDigits, type: 'text', text: { body: content } },
          { headers: { Authorization: `Bearer ${waAccessToken}`, 'Content-Type': 'application/json' } }
        );
        waMessageId = waRes.data?.messages?.[0]?.id || null;
        delivered = true;
      } catch (waErr) {
        console.error('[notify-staff send error]', waErr.response?.data || waErr.message);
      }
    }
    res.json({ ...req.body, success: true, delivered, wa_msg_id: waMessageId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});



// ==========================================
// Sales Person Tasks API
// ==========================================
router.get('/sales-tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT st.*, l.name, l.phone, l.email, l.status as lead_status 
      FROM sales_tasks st
      JOIN leads l ON st.lead_id = l.id
      WHERE DATE(st.created_at) = CURRENT_DATE
      ORDER BY st.status DESC, st.created_at DESC
    `);
    res.json({ success: true, tasks: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/sales-tasks/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    let query = `UPDATE sales_tasks SET status = $1, updated_at = NOW()`;
    if (status === 'completed') {
      query += `, completed_at = NOW()`;
    }
    query += ` WHERE id = $2 RETURNING *`;
    const result = await pool.query(query, [status, req.params.id]);
    res.json({ success: true, task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/sales-tasks/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM sales_tasks WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// Bot Integration: Book a Call - STOPS FOLLOW-UPS
// ==========================================
router.post('/leads/book-call', async (req, res) => {
  try {
    const { lead_id, booking_time } = req.body;

    if (!lead_id || !booking_time) {
      return res.status(400).json({ success: false, error: "Missing lead_id or booking_time" });
    }

    // Update call_booked_at AND status to indicate booked - this stops follow-ups
    const result = await pool.query(
      `UPDATE leads SET call_booked_at = $1, status = 'booked', updated_at = NOW() WHERE id = $2 RETURNING id, call_booked_at, status`,
      [booking_time, lead_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    console.log(`[Book Call] Lead ${lead_id} booked for ${booking_time} - follow-ups will STOP`);
    res.json({ success: true, lead: result.rows[0], message: "Call booked! Follow-ups have been stopped for this lead." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
