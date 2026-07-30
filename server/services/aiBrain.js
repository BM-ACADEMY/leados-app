const { GoogleGenAI } = require('@google/genai');
const db = require('../db/connection');
require('dotenv').config();

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

/**
 * AI Brain function to evaluate a lead, assign it to a brand, 
 * and set the initial next_follow_up date.
 */
async function evaluateLeadBrandAndSchedule(leadId) {
  if (!gemini) {
    console.warn('[AI Brain] Gemini API key not set. Skipping AI evaluation.');
    return;
  }

  try {
    // Fetch lead details
    const leadRes = await db.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (leadRes.rows.length === 0) return;
    const lead = leadRes.rows[0];

    // Fetch all active brands/clients context
    const clientsRes = await db.query('SELECT id, name, type, wa_category, wa_description FROM clients WHERE status = \'active\'');
    const brands = clientsRes.rows;
    
    if (brands.length === 0) return;

    const brandContext = brands.map(b => 
      `ID: ${b.id} | Name: ${b.name} | Category: ${b.wa_category || b.type || 'N/A'} | Description: ${b.wa_description || 'N/A'}`
    ).join('\n');

    const prompt = `
You are the AI Routing Brain for ABM Groups. You have a list of available brands (companies) under ABM Groups, and a new lead has just come in.
Your job is to determine which Brand this lead should be assigned to, and how soon we should follow up with them.

AVAILABLE BRANDS:
${brandContext}

NEW LEAD INFO:
Name: ${lead.name || 'Unknown'}
Email: ${lead.email || 'N/A'}
Phone: ${lead.phone || 'N/A'}
Source: ${lead.source || 'N/A'}
Interest/Context: ${lead.interest || 'N/A'}

INSTRUCTIONS:
1. Choose the single best matching brand ID for this lead based on their source or interest.
2. Decide how many minutes from now the first automated follow-up should be sent (e.g., 5, 15, 60). Usually, a fast follow-up (15 mins) is best for new leads.
3. Respond ONLY in valid JSON format. Do not include markdown code blocks.

FORMAT:
{
  "client_id": 1,
  "delay_minutes": 15
}
`;

    const response = await gemini.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let aiText = response.text.trim();
    const match = aiText.match(/\{[\s\S]*\}/);
    if (match) aiText = match[0];
    const result = JSON.parse(aiText);

    if (result.client_id) {
      const delay = parseInt(result.delay_minutes) || 15;
      
      await db.query(`
        UPDATE leads 
        SET 
          client_id = $1, 
          next_follow_up = NOW() + INTERVAL '${delay} minutes',
          updated_at = NOW()
        WHERE id = $2
      `, [result.client_id, leadId]);
      
      console.log(`[AI Brain] Assigned lead ${leadId} to client ${result.client_id}, follow-up in ${delay} mins.`);
    }

  } catch (err) {
    console.error(`[AI Brain] Error evaluating new lead ${leadId}:`, err);
  }
}

/**
 * Scans for stuck leads every hour and determines next follow up
 */
async function evaluateStuckLeads() {
  if (!gemini) return;

  try {
    const stuckLeads = await db.query(`
      SELECT l.id, l.name, l.source, l.status, l.touch_count, l.client_id, l.next_follow_up
      FROM leads l
      WHERE l.status NOT IN ('lost', 'converted')
        AND l.client_id IS NOT NULL
        AND (l.next_follow_up IS NULL OR l.next_follow_up < NOW())
      ORDER BY l.created_at ASC
      LIMIT 50
    `);

    for (const lead of stuckLeads.rows) {
      // Get conversation history (last 5 messages)
      const msgs = await db.query(`
        SELECT content, direction, sent_at
        FROM messages
        WHERE conversation_id IN (SELECT id FROM conversations WHERE lead_id = $1)
        ORDER BY sent_at DESC
        LIMIT 5
      `, [lead.id]);
      
      const history = msgs.rows.reverse().map(m => `[${m.direction.toUpperCase()}]: ${m.content}`).join('\n');
      
      const prompt = `
You are the AI Follow-Up Manager for a CRM.
This lead seems to be stuck or idle.
Name: ${lead.name}
Status: ${lead.status}
Past Touches: ${lead.touch_count || 0}
Last Contact Date: N/A

RECENT CONVERSATION HISTORY:
${history || '(No messages sent or received yet)'}

INSTRUCTIONS:
1. Determine how many hours from now the next follow-up attempt should happen. If they are totally unresponsive after many touches, you might want to wait a few days (e.g., 72 hours). If they just haven't been contacted yet, do it soon (e.g., 2 hours).
2. Propose a short internal note explaining your decision.
3. Respond ONLY in valid JSON.

FORMAT:
{
  "delay_hours": 24,
  "internal_note": "Lead hasn't replied to last 2 texts. Wait 24 hours for next touch."
}
`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      let aiText = response.text.trim();
      const match = aiText.match(/\{[\s\S]*\}/);
      if (match) aiText = match[0];
      const result = JSON.parse(aiText);
      const delayHours = parseInt(result.delay_hours) || 24;

      await db.query(`
        UPDATE leads 
        SET 
          next_follow_up = NOW() + INTERVAL '${delayHours} hours',
          updated_at = NOW()
        WHERE id = $1
      `, [lead.id]);
      
      if (result.internal_note) {
        // Fallback: append note directly to lead notes if history table doesn't exist.
        await db.query(`
          UPDATE leads SET notes = COALESCE(notes, '') || '\n[' || NOW() || '] AI Brain: ' || $1
          WHERE id = $2
        `, [result.internal_note, lead.id]).catch(e => console.error("Could not save note", e));
      }

      console.log(`[AI Brain] Processed stuck lead ${lead.id}, next follow-up in ${delayHours} hours.`);
      
      // Delay for 2 seconds to avoid hitting Gemini API rate limits
      await new Promise(r => setTimeout(r, 2000));
    }

  } catch (err) {
    console.error('[AI Brain] Error evaluating stuck leads:', err);
  }
}

module.exports = {
  evaluateLeadBrandAndSchedule,
  evaluateStuckLeads
};
