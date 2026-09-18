// Automatic AI reply for the AllianceOS WhatsApp inbox. Fires shortly after an
// inbound message is saved (see routes/alliance-inbox-v2.js webhook handler),
// mirroring the same brain/prompt-rules/lead-memory context already used by
// the manual "AI Suggestion" button, but sends the result immediately instead
// of waiting for an agent to click send.
const axios = require('axios');
const db = require('../db/connection');
const openRouter = require('./openrouter');
const { getAllianceBrainContext } = require('./alliance-brain-context');
const { getAlliancePromptRules } = require('./alliance-prompt-rules');
const { getAllianceLeadMemory, saveAllianceLeadMemory } = require('./alliance-lead-memory');

// Opt-out switch: set ALLIANCE_AI_AUTOREPLY_ENABLED=false on the server to
// disable auto-sending and fall back to the manual "AI Suggestion" workflow.
const ENABLED = String(process.env.ALLIANCE_AI_AUTOREPLY_ENABLED ?? 'true').toLowerCase() !== 'false';
// Short debounce so a burst of quick messages ("hi" then "I need a website")
// gets answered once, not once per message.
const DEBOUNCE_MS = Math.max(Number(process.env.ALLIANCE_AI_AUTOREPLY_DEBOUNCE_MS) || 12000, 3000);

const pendingReplies = new Map(); // contact_id -> Timeout

async function configuredSender() {
  const result = await db.query(`SELECT * FROM alliance_inbox_settings WHERE active = TRUE ORDER BY id LIMIT 1`);
  if (result.rows[0]) return result.rows[0];
  return process.env.ALLIANCE_WA_PHONE_NUMBER_ID
    ? { phone_number_id: process.env.ALLIANCE_WA_PHONE_NUMBER_ID, access_token_env: 'ALLIANCE_WA_ACCESS_TOKEN' }
    : null;
}

async function draftAutoReply(contactId) {
  const contact = await db.query(
    `SELECT c.id,c.name,c.phone,c.prospect_id,p.business_name,p.audience,p.industry,p.location,p.status,a.brand
     FROM alliance_inbox_contacts c
     LEFT JOIN alliance_prospects p ON p.id=c.prospect_id
     LEFT JOIN alliance_audiences a ON a.code=p.audience
     WHERE c.id=$1`, [contactId]
  );
  if (!contact.rowCount) return null;
  const history = await db.query(
    `SELECT direction,content,msg_type,sent_at FROM alliance_inbox_messages
     WHERE contact_id=$1 AND is_deleted=FALSE ORDER BY sent_at DESC LIMIT 30`, [contactId]
  );
  const latestInbound = history.rows.find((message) => message.direction === 'inbound');
  if (!latestInbound) return null;
  const brain = await getAllianceBrainContext(contact.rows[0].audience, latestInbound?.content);
  const durableLeadMemory = contact.rows[0].prospect_id ? await getAllianceLeadMemory(contact.rows[0].prospect_id) : null;
  const promptRules = await getAlliancePromptRules('reply_suggestion', 'whatsapp', contact.rows[0].audience, latestInbound?.content || '');
  const prompt = `Write one concise WhatsApp reply that will be sent automatically right now, with no human review.
Lead context: ${JSON.stringify(contact.rows[0])}
AUTHORITATIVE AI BRAIN (the only source for brand, course, service, price, duration, policy, and contact facts): ${brain ? JSON.stringify(brain) : 'Not configured for this audience yet — do not state any brand facts.'}
Pre-matched administrator rules (mandatory; lower priority number wins if instructions conflict): ${promptRules}
This contact's separate conversation memory, oldest to newest: ${JSON.stringify(history.rows.reverse())}
Durable lead memory${durableLeadMemory ? ` keyed by ${durableLeadMemory.lead_key}` : ''}: ${JSON.stringify(durableLeadMemory || {})}
Directly answer the latest inbound message using the detected brand only and continue naturally from this contact's own raw history and durable memory. Never restart the introduction when this is an ongoing conversation. End with at most one useful question. If question_scope is "broad_catalog", list EVERY active entry in exact_catalog exactly once without renaming or omitting entries; include stored duration and fee when present. If suggested_questions is non-empty, use at most one question from that list. For a specific-offering match, answer only with relevant_offerings.${brain ? ` ${brain.instructions}` : ''}
Merge the latest exchange into durable memory while preserving relevant prior facts. Return JSON only: {"suggestion":"message text","memory":{"summary":"concise cumulative conversation summary","requirements":[],"interests":[],"objections":[],"commitments":[],"next_step":"","relationship_stage":"new|engaged|evaluating|ready|closed"}}.`;
  const generated = await openRouter.generateContent({ contents: prompt, config: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 2000 } });
  let parsed;
  try { parsed = JSON.parse(String(generated.text || '').replace(/^```json\s*|\s*```$/g, '')); }
  catch { parsed = { suggestion: String(generated.text || '').trim(), memory: durableLeadMemory }; }
  let suggestion = String(parsed.suggestion || '').trim();
  if (!suggestion) return null;
  if (brain?.internal?.escalation_phone && brain.internal.public_contact_phone) {
    suggestion = suggestion.replaceAll(brain.internal.escalation_phone, brain.internal.public_contact_phone);
  }
  if (brain?.question_scope === 'broad_catalog' && brain.exact_catalog?.length) {
    const normalizeCatalogText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const normalizedSuggestion = normalizeCatalogText(suggestion);
    const missingOfferings = brain.exact_catalog.filter((offering) => !normalizedSuggestion.includes(normalizeCatalogText(offering.name)));
    if (missingOfferings.length) {
      const catalogLines = brain.exact_catalog.map((offering) => {
        const facts = [offering.duration, offering.fee ? `₹${offering.fee}` : ''].filter(Boolean).join(', ');
        return `• ${offering.name}${facts ? ` — ${facts}` : ''}`;
      });
      suggestion = `Thank you for your interest in ${brain.brand.name}. Here is our complete current catalog:\n\n${catalogLines.join('\n')}\n\n${brain.suggested_questions?.[0] || 'Which course would you like to explore in detail?'}`;
    }
  }
  if (contact.rows[0].prospect_id && parsed.memory) {
    await saveAllianceLeadMemory(contact.rows[0].prospect_id, parsed.memory, 'whatsapp', latestInbound?.sent_at || new Date());
  }
  return { suggestion, phone: contact.rows[0].phone };
}

async function sendAllianceAutoReply(contactId, io) {
  const draft = await draftAutoReply(contactId);
  if (!draft?.suggestion) return;
  const convResult = await db.query(`SELECT id FROM alliance_inbox_conversations WHERE contact_id=$1 LIMIT 1`, [contactId]);
  const conversationId = convResult.rows[0]?.id;
  if (!conversationId) return;
  const settings = await configuredSender();
  const token = process.env[settings?.access_token_env || 'ALLIANCE_WA_ACCESS_TOKEN'];
  if (!settings?.phone_number_id || !token) {
    console.warn('[Alliance auto-reply] Skipped — WhatsApp credentials not configured.');
    return;
  }
  const response = await axios.post(
    `https://graph.facebook.com/v19.0/${settings.phone_number_id}/messages`,
    { messaging_product: 'whatsapp', recipient_type: 'individual', to: draft.phone, type: 'text', text: { body: draft.suggestion } },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 20000 }
  );
  const waMessageId = response.data?.messages?.[0]?.id || null;
  const saved = await db.query(
    `INSERT INTO alliance_inbox_messages
      (conversation_id, contact_id, wa_msg_id, direction, msg_type, content, status, raw_payload, sent_at)
     VALUES ($1,$2,$3,'outbound','text',$4,'sent',$5::jsonb,NOW())
     ON CONFLICT (wa_msg_id) DO UPDATE SET status = EXCLUDED.status
     RETURNING *`,
    [conversationId, contactId, waMessageId, draft.suggestion, JSON.stringify({ purpose: 'ai_auto_reply', sender_type: 'ai' })]
  );
  await db.query(
    `UPDATE alliance_inbox_conversations SET last_message = $1, last_message_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [draft.suggestion, conversationId]
  );
  const outMessage = saved.rows[0];
  io?.emit('alliance_contacts_changed', { contact_id: String(contactId) });
  if (outMessage) io?.emit('alliance_outgoing_message', { lead_id: String(contactId), message: { ...outMessage, type: outMessage.msg_type, timestamp: outMessage.sent_at, sender_type: 'ai' } });
}

// Debounced trigger — call this from the inbound webhook handler. Waits
// DEBOUNCE_MS so a quick follow-up message ("wait" / "hold on") gets folded
// into a single reply instead of firing twice.
function queueAllianceAutoReply(contactId, io) {
  if (!ENABLED || !openRouter.isConfigured) return;
  const key = String(contactId);
  if (pendingReplies.has(key)) clearTimeout(pendingReplies.get(key));
  const timer = setTimeout(() => {
    pendingReplies.delete(key);
    sendAllianceAutoReply(contactId, io).catch((error) => {
      console.error('[Alliance auto-reply] send failed:', { contactId, error: error.response?.data || error.message });
    });
  }, DEBOUNCE_MS);
  timer.unref?.();
  pendingReplies.set(key, timer);
}

module.exports = { queueAllianceAutoReply, sendAllianceAutoReply, draftAutoReply, ENABLED };
