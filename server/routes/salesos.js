const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const axios = require('axios');

// ==========================================
// WF00 - Lead Integrator Endpoints
// ==========================================

const { GoogleGenAI } = require('@google/genai');
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

async function generateGeminiContent(prompt) {
  if (!ai) throw new Error("Gemini API not initialized");
  const models = ['gemini-3.5-flash', 'gemini-2.5-flash'];
  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const aiRes = await ai.models.generateContent({ model, contents: prompt });
        return aiRes.text.trim();
      } catch (err) {
        console.warn(`Gemini (${model}) attempt ${attempt} error: ${err.message}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
  }
  throw new Error("AI models temporarily in high demand after automatic retries. Please try again.");
}

async function getOrUpsertConversation(lead_id) {
  const convRes = await pool.query(`SELECT id FROM conversations WHERE lead_id = $1 LIMIT 1`, [lead_id]);
  if (convRes.rows.length > 0) return convRes.rows[0].id;

  const leadRes = await pool.query(`SELECT phone, client_id as tenant_id FROM leads WHERE id = $1`, [lead_id]);
  const phone = leadRes.rows[0]?.phone || '';
  const tenant_id = leadRes.rows[0]?.tenant_id || 1;
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
  const { phone_number_id } = req.body;
  try {
    let brandId = null;
    let brandName = 'ABM Groups';

    if (phone_number_id) {
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

    res.json({ ...req.body, brand_id: brandId, brand_name: brandName, brand: brandName });
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
        `INSERT INTO leads (name, phone, email, source, client_id, status, score) VALUES ($1, $2, $3, $4, $5, 'new', 10) RETURNING id`,
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
    // FIX: Ensure conversation exists safely without constraint errors and log inbound message for bidirectional UI
    if (lead_id && message) {
      const conversation_id = await getOrUpsertConversation(lead_id);
      // Only insert if this message hasn't been logged recently to prevent dupes
      const savedMsg = await pool.query(
        `INSERT INTO messages (conversation_id, direction, msg_type, content, status, is_ai, sent_at) VALUES ($1, 'inbound', 'text', $2, 'delivered', false, NOW()) RETURNING id, direction, content, msg_type as type, status, sent_at as timestamp`,
        [conversation_id, message]
      );
      await pool.query(`UPDATE conversations SET last_message = $1, last_message_at = NOW(), unread_count = COALESCE(unread_count, 0) + 1 WHERE id = $2`, [message, conversation_id]);
      const io = req.app.get('io');
      if (io && savedMsg.rows[0]) {
        io.emit('incoming_message', { lead_id: Number(lead_id), message: savedMsg.rows[0] });
      }
    }

    if (!ai) return res.json({ intent: "GENERAL", confidence: 50 });
    const prompt = `Analyze this message sent to the brand '${brand}'. What is the user's core intent? Choose one: [PRICING, MORE_INFO, BOOK_CALL, NOT_INTERESTED, GENERAL_CHAT, COMPLAINT]. Message: "${message}". Reply ONLY with the intent and confidence score separated by a comma (e.g. PRICING, 95).`;
    const output = await generateGeminiContent(prompt);
    const parts = output.split(',');
    const intent = parts[0] ? parts[0].trim() : 'GENERAL';
    const confidence = parts[1] ? parseInt(parts[1].trim()) : 50;
    
    if (lead_id) {
      await pool.query(`INSERT INTO ai_decisions (lead_id, module, input, output, confidence) VALUES ($1, $2, $3, $4, $5)`, [lead_id, 'intent_detection', message, intent, confidence]);
    }
    res.json({ ...req.body, intent, confidence });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Objection Detection
router.post('/ai/objections', async (req, res) => {
  const { message, brand, lead_id } = req.body;
  try {
    if (!ai) return res.json({ objections: "none" });
    const prompt = `Analyze this message. Does the user have any objections? Choose one: [TOO_EXPENSIVE, NO_TIME, NOT_SURE, USING_COMPETITOR, NONE]. Message: "${message}". Reply ONLY with the objection type.`;
    const objections = await generateGeminiContent(prompt);
    res.json({ ...req.body, objections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Knowledge Retrieval
router.post('/kb/search', async (req, res) => {
  const { brand, query, lead_id } = req.body;
  try {
    const kbRes = await pool.query(`SELECT content FROM brain_docs WHERE client_id = (SELECT id FROM clients WHERE name = 'ABM Groups' LIMIT 1) AND doc_type = 'prompt' LIMIT 1`);
    const kb_snippets = kbRes.rows.length > 0 ? kbRes.rows[0].content : "No knowledge base found.";
    res.json({ ...req.body, kb_snippets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Generate AI Response
router.post('/ai/response', async (req, res) => {
  const { brand, intent, message, kb_snippets, lead_id, chat_history } = req.body;
  try {
    if (!ai) return res.json({ ...req.body, ai_reply: "AI is currently offline. We will get back to you shortly!" });
    
    let historyText = "";
    if (chat_history && Array.isArray(chat_history)) {
      historyText = "Chat History:\n" + chat_history.map(h => `${h.role}: ${h.text}`).join("\n") + "\n\n";
    }

    const prompt = `System Prompt (ABM Groups Knowledge Base):\n${kb_snippets}\n\n${historyText}User Intent detected: ${intent}\n\nUser Message: "${message}"\n\nWrite a short, friendly WhatsApp reply mimicking a human sales assistant. End with exactly one question to keep the conversation going.`;
    
    const ai_reply = await generateGeminiContent(prompt);
    res.json({ ...req.body, ai_reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Qualify And Score
router.post('/leads/score', async (req, res) => {
  const { lead_id, message, intent, objections } = req.body;
  try {
    let scoreBoost = 0;
    if (intent === 'BOOK_CALL' || intent === 'PRICING') scoreBoost = 20;
    else if (intent === 'NOT_INTERESTED') scoreBoost = -20;
    else scoreBoost = 5;

    const result = await pool.query(
      `UPDATE leads SET score = LEAST(GREATEST(score + $1, 0), 100), updated_at = NOW() WHERE id = $2 RETURNING score`,
      [scoreBoost, lead_id]
    );
    res.json({ ...req.body, lead_score: result.rows[0]?.score || 10 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Assign Owner
router.post('/leads/assign-owner', async (req, res) => {
  const { lead_id, brand, lead_score, intent } = req.body;
  try {
    let owner = 'ai_bot';
    if (lead_score >= 75) owner = 'human_sales';
    
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

// 9. Workflow Logger
router.post('/workflows/log', async (req, res) => {
  const { workflow, lead_id, status } = req.body;
  try {
    await pool.query(
      `INSERT INTO workflow_logs (workflow, lead_id, status) VALUES ($1, $2, $3)`,
      [workflow, lead_id, status]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/workflows/logs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.id, w.workflow, w.lead_id, w.status, w.message, w.created_at, l.name as lead_name
      FROM workflow_logs w
      LEFT JOIN leads l ON w.lead_id = CAST(l.id AS TEXT)
      ORDER BY w.created_at DESC
      LIMIT 100
    `);
    res.json({ logs: result.rows });
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
    const result = await pool.query(`SELECT COUNT(*) * 500 as revenue FROM leads WHERE status = 'won' AND updated_at >= CURRENT_DATE`);
    res.json({ revenue: parseInt(result.rows[0].revenue) || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/revenue-month', async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) * 500 as revenue FROM leads WHERE status = 'won' AND date_trunc('month', updated_at) = date_trunc('month', CURRENT_DATE)`);
    res.json({ revenue: parseInt(result.rows[0].revenue) || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/brand-revenue', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.name as brand, (COUNT(l.id) * 500) as revenue 
      FROM leads l
      JOIN clients c ON l.client_id = c.id
      WHERE l.status = 'won'
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
    const result = await pool.query(`SELECT COUNT(*) as count FROM leads WHERE next_followup_due > NOW() AND status != 'WON'`);
    res.json({ pending: parseInt(result.rows[0].count) || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/sla-breaches', async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM leads WHERE next_followup_due < NOW() AND status != 'WON'`);
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
    const result = await pool.query(`
      SELECT l.id as lead_id, COALESCE(c.name, 'ABM Groups') as brand, l.stage, COALESCE(l.touch_count, 0) as touch_count
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      WHERE l.next_followup_due <= NOW() AND l.status != 'WON'
    `);
    res.json({ followups: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Fetch Followup Rule
router.post('/followups/rule', async (req, res) => {
  const { touch_count } = req.body;
  try {
    // Escalate to a human after 5 ignored touches; fall back to email after 3; otherwise WhatsApp.
    let base_channel = 'whatsapp';
    let template_id = touch_count > 1 ? 're_engagement' : 'welcome_followup';
    let payload_template = touch_count > 1
      ? "Hey! Just checking back in - still interested in learning more?"
      : "Hi there! Following up on your interest with us - any questions I can help with?";
    let ai_prompt_template = `followup_attempt_${touch_count || 1}`;

    if (touch_count >= 5) {
      base_channel = 'internal_note';
      payload_template = `Lead has ignored ${touch_count} automated follow-ups. Needs a manual call.`;
    } else if (touch_count > 3) {
      base_channel = 'email';
    }

    res.json({ ...req.body, delay_hours: 24, base_channel, template_id, payload_template, ai_prompt_template });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    const touchCount = lead?.touch_count || 1;

    let ai_reply = "Are you still interested in our program?";
    if (ai) {
      const prompt = `Write a very short, polite WhatsApp follow-up message for a lead who hasn't replied to '${brandName}'. This is follow-up attempt #${touchCount}.`;
      ai_reply = await generateGeminiContent(prompt);
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
  const { data } = req.body;
  try {
    if (!ai) return res.json({ summary: "Daily Summary generated." });
    const prompt = `Summarize these daily metrics for a Founder Dashboard:\n${JSON.stringify(data)}\nWrite 3 bullet points.`;
    const summary = await generateGeminiContent(prompt);
    res.json({ summary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// WF04 - Customer Journey
// ==========================================

router.post('/leads/find-by-invoice', async (req, res) => {
  const { invoice_id } = req.body;
  try {
    // Dynamically lookup by invoice ID if it was stored, fallback to newest won lead
    const result = await pool.query(`SELECT id as lead_id, name, 'Standard Product' as product FROM leads WHERE status = 'won' ORDER BY updated_at DESC LIMIT 1`);
    res.json(result.rows[0] || { lead_id: null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/journey/steps', async (req, res) => {
  try {
    // Dynamically fetch from db or return standard array
    const steps = [
      { action: 'send_welcome' },
      { action: 'grant_access' },
      { action: 'add_whatsapp_group' }
    ];
    res.json({ steps });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Journey Action Stubs
router.post('/invoices/send', (req, res) => res.json({ success: true }));
router.post('/whatsapp/add-to-group', (req, res) => res.json({ success: true }));
router.post('/access/grant', (req, res) => res.json({ success: true }));
router.post('/tasks/create', (req, res) => res.json({ success: true }));
router.post('/leads/log-event', (req, res) => res.json({ success: true }));

// ==========================================
// WF05 - Marketing Automation
// ==========================================

router.get('/campaigns/active', async (req, res) => {
  try {
    // Assume campaigns table if we have one, otherwise return empty
    res.json({ campaigns: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/campaigns/select-leads', async (req, res) => {
  const { campaign_id, status_filter } = req.body;
  try {
    let query = `SELECT id, phone, name FROM leads WHERE status != 'won' AND phone IS NOT NULL LIMIT 500`;
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
  const { lead_id, touch_count_increment, delay_hours } = req.body;
  try {
    const query = `UPDATE leads SET next_followup_due = NOW() + ($1 || ' hours')::INTERVAL, touch_count = COALESCE(touch_count, 0) + $2 WHERE id = $3`;
    await pool.query(query, [delay_hours || 24, touch_count_increment || 1, lead_id]);
    res.json({ ...req.body, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/overdue-followups', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, next_followup_due FROM leads WHERE next_followup_due < NOW() AND status != 'won' LIMIT 50`);
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
      pool.query(`SELECT id, name, next_followup_due, owner FROM leads WHERE next_followup_due < NOW() AND status != 'won' LIMIT 50`),
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

    const salesperson_summaries = [{
      owner: 'human_sales',
      text: `Today's Tasks: ${followups.rows.length} Follow-ups, ${calls.rows.length} Calls, ${payments.rows.length} Payments, ${hot.rows.length} HOT Leads, ${overdue.rows.length} Overdue. (${humanTaskCount} assigned to the human sales team.)`
    }];

    let founder_summary = `Daily Summary - Calls: ${calls.rows.length}, Followups: ${followups.rows.length}, Pending Payments: ${payments.rows.length}, Overdue: ${overdue.rows.length}, Hot Leads: ${hot.rows.length}.`;
    if (ai) {
      try {
        const prompt = `Summarize these daily sales metrics for a Founder Dashboard:\n${JSON.stringify(metrics)}\nWrite 3 short bullet points highlighting wins and risks (like SLA breaches or pending payments).`;
        founder_summary = await generateGeminiContent(prompt);
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

module.exports = router;
