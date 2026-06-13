// backend/services/openai.js
const Groq = require('groq-sdk');
const OpenAI = require('openai');
const axios = require('axios');
const db = require('../db/connection');

const apiKey = process.env.OPENAI_API_KEY || 'dummy_key';
const groq = new Groq({ apiKey });
const openai = new OpenAI({ apiKey });

// WEBSITE SCRAPER
async function scrapeWebsite(url) {
  try {
    if (!url || url.trim() === '') return 'No website available.';
    
    // Auto-fix URL if it's missing protocol
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
    }

    const res = await axios.get(url, { timeout: 8000 });
    const text = res.data
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
    return text || 'Website found but no readable content.';
  } catch (err) {
    return 'Website unavailable.';
  }
}

// KNOWLEDGE BASE CONTEXT RETRIEVAL
async function getKBContext(orgType) {
  const brandFilter = orgType === 'college' || (orgType && orgType.includes('college'))
    ? ['BM Academy','Core Talents','BM TechX','All']
    : ['Core Talents','BM Academy','All'];
    
  const { rows } = await db.query(`
    SELECT title, brand, category,
           LEFT(content, 2000) AS content
    FROM knowledge_base
    WHERE brand = ANY($1)
    ORDER BY
      CASE category
        WHEN 'profile' THEN 1
        WHEN 'mou' THEN 2
        WHEN 'faq' THEN 3
        ELSE 4
      END,
      created_at DESC
    LIMIT 5
  `, [brandFilter]);
  
  if (rows.length === 0) {
    return 'Knowledge base is empty. Upload ABM Groups profile PDFs first.';
  }
  
  return rows.map(r =>
    `=== ${r.brand.toUpperCase()} — ${r.title} ===\n${r.content}`
  ).join('\n\n---\n\n');
}

// PROMPT BUILDER
async function buildPrompt(org, websiteText, kbContext) {
  const { rows } = await db.query(
    `SELECT prompt_text FROM prompt_templates WHERE name = $1 AND active = TRUE`,
    [org.type]
  );
  let prompt = rows[0]?.prompt_text || getHardcodedPrompt(org.type);
  
  prompt = prompt
    .replace('{{org_name}}', org.name || '')
    .replace('{{district}}', org.district || org.location || 'Tamil Nadu')
    .replace('{{industry}}', org.industry || 'Unknown')
    .replace('{{website_text}}', websiteText || '')
    .replace('{{kb_context}}', kbContext || '');
  return prompt;
}

// Outreach message generator using Groq
async function generateOutreachMessage(org, result) {
  try {
    const prompt = `Write a short, highly professional, warm WhatsApp outreach message to a contact named ${org.contact_name || 'there'} at ${org.name} located in ${org.district || org.location || 'Tamil Nadu'}.
The goal is to propose our offer: "${result.offer_recommended}".
Use this personalization hook: "${result.personalisation_hook}".
The message must be friendly, concise (max 3 sentences), and encourage a reply. Do not use placeholders like [Your Name] or [Insert Date] in the output.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 150,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error('Error generating WhatsApp message:', err.message);
    return `Hi ${org.contact_name || 'Sir/Madam'}, I noticed ${org.name} in ${org.district || 'your area'}. We'd love to partner with you for our ${result.offer_recommended || 'placement training'}. Let us know if you're interested!`;
  }
}

// Meta Cloud WhatsApp sender
async function sendAutomatedWhatsApp(phone, message) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID || '123456789012345';
  if (!token || !phone) {
    console.log('Skipping WhatsApp send: Meta credentials or phone missing.');
    return null;
  }

  // If using placeholder ID, simulate/mock the WhatsApp request for testing
  if (phoneNumberId === '123456789012345') {
    const mockMsgId = 'mock_wa_msg_' + Math.random().toString(36).substr(2, 9);
    console.log(`[TEST MOCK] Simulated WhatsApp sent to ${phone}: "${message}" (ID: ${mockMsgId})`);
    return mockMsgId;
  }

  const cleanPhone = phone.replace(/\D/g, '');
  try {
    const waRes = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message }
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log(`✅ WhatsApp message sent to ${cleanPhone}: ${waRes.data.messages?.[0]?.id}`);
    return waRes.data.messages?.[0]?.id;
  } catch (err) {
    console.error('❌ Failed to send automated WhatsApp:', err.response?.data || err.message);
    return null;
  }
}

// MAIN ANALYZER
async function analyzeOrganisation(org) {
  const [websiteText, kbContext] = await Promise.all([
    scrapeWebsite(org.website),
    getKBContext(org.type)
  ]);
  
  const prompt = await buildPrompt(org, websiteText, kbContext);
  let raw, result;
  
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }]
    });
    
    raw = response.choices[0].message.content.trim();
    result = JSON.parse(raw);
  } catch (err) {
    console.error('Groq parse error:', err.message);
    result = {
      offer_recommended: 'Standard MoU — manual review needed',
      reason: 'AI analysis failed. Review manually.',
      personalisation_hook: '',
      training_potential: 'medium',
      placement_potential: 'medium',
      hiring_potential: 'medium',
      bm_course_match: '',
      core_talents_offer: ''
    };
  }
  
  // Save analysis to database
  await db.query(`
    INSERT INTO ai_analysis
    (org_id, score, offer_recommended, reason,
     bm_course_match, core_talents_offer,
     personalisation_hook, hiring_potential,
     training_potential, raw_json)
    VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT DO NOTHING
  `, [
    org.id,
    result.offer_recommended || '',
    result.reason || '',
    result.bm_course_match || result.skills_match || '',
    result.core_talents_offer || '',
    result.personalisation_hook || '',
    result.hiring_potential || 'medium',
    result.training_potential || 'medium',
    result
  ]);
  
  // Update org status
  await db.query(
    `UPDATE organisations SET status='analysed', updated_at=NOW() WHERE id=$1`,
    [org.id]
  );

  // Generate and Send WhatsApp outreach
  if (org.phone) {
    const outreachMessage = await generateOutreachMessage(org, result);
    const waMsgId = await sendAutomatedWhatsApp(org.phone, outreachMessage);
    
    await db.query(`
      INSERT INTO outreach (org_id, channel, msg_type, content, sent_at, delivered)
      VALUES ($1, 'whatsapp', 'text', $2, NOW(), $3)
    `, [org.id, outreachMessage, waMsgId ? true : false]);
  }
  
  // Telegram alert for analyzed leads
  const msg =
    `■ LEAD ANALYZED\n` +
    `Org: ${org.name}\n` +
    `Offer: ${result.offer_recommended}\n` +
    `Hook: ${result.personalisation_hook}\n` +
    `District: ${org.district}`;
  await sendTelegramAlert(msg);
  
  return result;
}

// BATCH ANALYZER
async function analyzeBatch(orgIds) {
  const results = [];
  const DELAY_MS = 1500;
  for (const id of orgIds) {
    const { rows } = await db.query('SELECT * FROM organisations WHERE id=$1', [id]);
    if (rows.length > 0) {
      const result = await analyzeOrganisation(rows[0]);
      results.push({ id, score: result.score });
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  return results;
}

// TELEGRAM ALERT
async function sendTelegramAlert(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  
  await axios.post(
    `https://api.telegram.org/bot${token}/sendMessage`,
    { chat_id: chatId, text: message, parse_mode: 'HTML' }
  ).catch(err => console.error('Telegram error:', err.message));
}

function getHardcodedPrompt(type) {
  return type === 'college'
    ? `Analyze this Tamil Nadu college. Return JSON with:
offer_recommended, reason, bm_course_match,
core_talents_offer, training_potential(high/medium/low),
placement_potential(high/medium/low), personalisation_hook.
College: {{org_name}}. District: {{district}}.
Website: {{website_text}}. Context: {{kb_context}}`
    : `Analyze this company for talent hiring partnership.
Return JSON with: offer_recommended(Free/Growth/Partner),
reason, skills_match, hiring_potential(high/medium/low),
personalisation_hook.
Company: {{org_name}}. District: {{district}}.
Website: {{website_text}}. Context: {{kb_context}}`;
}

async function suggestKeywords(clientName, clientType, clientCity) {
  try {
    const prompt = `Suggest exactly 4 highly relevant local SEO Google Maps search keywords for a business named "${clientName}" of type/category "${clientType || 'business'}" located in the city "${clientCity || 'Tamil Nadu'}".
For each keyword, also suggest a realistic monthly search volume (e.g., "~200/mo").
Return the result in JSON format only, structured as:
{
  "suggestions": [
    { "text": "keyword 1", "searchVolume": "200/mo" },
    { "text": "keyword 2", "searchVolume": "90/mo" }
  ]
}`;

    let raw;
    if (apiKey.startsWith('sk-')) {
      console.log('Using OpenAI (gpt-4o-mini) to suggest keywords...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }]
      });
      raw = response.choices[0].message.content.trim();
    } else {
      console.log('Using Groq (llama-3.3-70b-versatile) to suggest keywords...');
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 300,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }]
      });
      raw = response.choices[0].message.content.trim();
    }

    return JSON.parse(raw);
  } catch (err) {
    console.error('Error suggesting GMB keywords:', err.message);
    const city = clientCity || 'Pondicherry';
    const type = clientType || 'Digital Marketing';
    return {
      suggestions: [
        { text: `${type} course ${city}`, searchVolume: '250/mo' },
        { text: `best ${type.toLowerCase()} training in ${city}`, searchVolume: '120/mo' },
        { text: `${type} services near me`, searchVolume: '180/mo' },
        { text: `${type} agency ${city}`, searchVolume: '90/mo' }
      ]
    };
  }
}

module.exports = { analyzeOrganisation, analyzeBatch, getKBContext, suggestKeywords };

