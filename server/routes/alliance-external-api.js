const express = require('express');
const axios = require('axios');
const db = require('../db/connection');

const router = express.Router();

let isTableCreated = false;

// Auto-create tracking table if it doesn't exist
const initTrackerTable = async () => {
  if (isTableCreated) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS alliance_external_api_logs (
        id SERIAL PRIMARY KEY,
        project_name VARCHAR(255) DEFAULT 'Unknown',
        phone_number VARCHAR(255),
        message_type VARCHAR(50),
        template_name VARCHAR(255),
        sender_name VARCHAR(255),
        status VARCHAR(50),
        meta_message_id VARCHAR(255),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Ensure column exists if table was already created
    try {
      await db.query(`ALTER TABLE alliance_external_api_logs ADD COLUMN sender_name VARCHAR(255)`);
    } catch (e) {
      // Ignore error if column already exists
    }
    isTableCreated = true;
  } catch (err) {
    console.error('Failed to create alliance_external_api_logs table:', err);
  }
};

// 1. SEND WHATSAPP ROUTE
router.all('/whatsapp/send', async (req, res) => {
  await initTrackerTable();

  let project = 'Unknown';
  let phone_number = '';
  let msgType = 'text';
  let tplName = null;

  try {
    const data = { ...req.query, ...req.body };
    const { apikey, number, text, template, language, parameters, sender_name } = data;
    
    // Use project param to track who sent it (e.g. &project=BM_Academy)
    project = data.project || 'Unknown';
    phone_number = number || '';
    msgType = template ? 'template' : 'text';
    tplName = template || null;
    sender = sender_name || null;

    // Check API Key
    const validKey = process.env.ALLIANCE_EXTERNAL_API_KEY;
    if (!validKey) {
       return res.status(500).json({ success: false, error: 'ALLIANCE_EXTERNAL_API_KEY is not configured in .env' });
    }

    if (!apikey || apikey !== validKey) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Key' });
    }

    if (!number) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    if (!text && !template) {
      return res.status(400).json({ success: false, error: 'Either text or template is required' });
    }

    // Get active WhatsApp number from DB
    let settingsResult = await db.query('SELECT phone_number_id, access_token_env FROM alliance_inbox_settings WHERE active = true LIMIT 1');
    if (!settingsResult.rowCount) {
      settingsResult = await db.query('SELECT phone_number_id, access_token_env FROM alliance_inbox_settings LIMIT 1');
    }
    
    // Fallback to Environment Variables if DB is completely empty
    const dbSettings = settingsResult.rowCount ? settingsResult.rows[0] : null;
    const phone_number_id = dbSettings?.phone_number_id || process.env.ALLIANCE_WA_PHONE_NUMBER_ID;
    const token = process.env[dbSettings?.access_token_env || 'ALLIANCE_WA_ACCESS_TOKEN'];

    if (!phone_number_id) {
      throw new Error('No Alliance WhatsApp phone number ID found in DB or Environment');
    }

    if (!token) {
      throw new Error('WhatsApp Access Token is missing in environment');
    }

    let payload;
    if (template) {
      let comps = [];
      if (parameters) {
        const paramsArray = Array.isArray(parameters) ? parameters : String(parameters).split(',');
        comps = [
          {
            type: 'body',
            parameters: paramsArray.map((p) => ({ type: 'text', text: String(p).trim() })),
          }
        ];
      }
      payload = {
        messaging_product: 'whatsapp',
        to: String(number).replace(/\D/g, ''),
        type: 'template',
        template: {
          name: template,
          language: { code: language || 'en' },
          ...(comps.length ? { components: comps } : {})
        }
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to: String(number).replace(/\D/g, ''),
        type: 'text',
        text: { body: String(text) }
      };
    }

    const response = await axios.post(`https://graph.facebook.com/v19.0/${phone_number_id}/messages`, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 20000
    });

    const msgId = response.data?.messages?.[0]?.id;
    
    // Log Success
    await db.query(
      `INSERT INTO alliance_external_api_logs (project_name, phone_number, message_type, template_name, sender_name, status, meta_message_id) 
       VALUES ($1, $2, $3, $4, $5, 'success', $6)`,
      [project, phone_number, msgType, tplName, sender, msgId]
    );

    // Sync to Alliance Inbox
    try {
      const cleanPhone = String(number).replace(/\D/g, '');
      const defaultName = cleanPhone;
      
      const contactResult = await db.query(
        `INSERT INTO alliance_inbox_contacts (wa_id, phone, name, profile_name)
         VALUES ($1,$1,$2,$2)
         ON CONFLICT (wa_id) DO UPDATE SET updated_at = NOW()
         RETURNING id`, [cleanPhone, defaultName]
      );
      const contactId = contactResult.rows[0].id;
      
      const conversationResult = await db.query(
        `INSERT INTO alliance_inbox_conversations (contact_id, phone_number_id)
         VALUES ($1,$2) ON CONFLICT (contact_id) DO UPDATE SET updated_at = NOW() RETURNING id`,
        [contactId, phone_number_id]
      );
      const conversationId = conversationResult.rows[0].id;
      
      let msgContent = String(text);
      if (template) {
        const templateData = await db.query('SELECT body FROM templates WHERE name = $1 LIMIT 1', [template]);
        if (templateData.rowCount > 0 && templateData.rows[0].body) {
          let body = templateData.rows[0].body;
          if (parameters) {
            const paramsArray = Array.isArray(parameters) ? parameters : String(parameters).split(',');
            paramsArray.forEach((val, idx) => {
              body = body.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), String(val).trim());
            });
          }
          msgContent = body;
        } else {
          const paramStr = parameters ? (Array.isArray(parameters) ? parameters.join(', ') : String(parameters)) : '';
          msgContent = `[Template: ${template}] ${paramStr}`.trim();
        }
      }
      
      const msgResult = await db.query(
        `INSERT INTO alliance_inbox_messages
          (conversation_id, contact_id, wa_msg_id, direction, msg_type, content, status, sent_at)
         VALUES ($1, $2, $3, 'outbound', $4, $5, 'sent', NOW()) RETURNING *`,
        [conversationId, contactId, msgId, msgType, msgContent]
      );
      
      await db.query(
        `UPDATE alliance_inbox_conversations SET last_message=$1, last_message_at=NOW(), updated_at=NOW() WHERE id=$2`,
        [msgContent, conversationId]
      );

    } catch (inboxErr) {
      console.error('Failed to sync external message to alliance inbox:', inboxErr);
    }

    res.json({ success: true, message_id: msgId, data: response.data });

  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'WhatsApp send failed';
    
    // Log Failure
    await db.query(
      `INSERT INTO alliance_external_api_logs (project_name, phone_number, message_type, template_name, sender_name, status, error_message) 
       VALUES ($1, $2, $3, $4, $5, 'failed', $6)`,
      [project, phone_number, msgType, tplName, sender, String(errorMsg).slice(0, 2000)]
    ).catch(() => {}); // Catch silent db error if it fails

    res.status(500).json({ success: false, error: errorMsg });
  }
});


// 2. TRACKER ROUTE
router.get('/apitracker', async (req, res) => {
  await initTrackerTable();
  try {
    // Basic stats
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_sent,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM alliance_external_api_logs
    `);

    // Group by project
    const projectResult = await db.query(`
      SELECT project_name, COUNT(*) as messages_sent 
      FROM alliance_external_api_logs 
      GROUP BY project_name 
      ORDER BY messages_sent DESC
    `);

    // Group by sender
    const senderResult = await db.query(`
      SELECT sender_name, COUNT(*) as messages_sent 
      FROM alliance_external_api_logs 
      WHERE sender_name IS NOT NULL
      GROUP BY sender_name 
      ORDER BY messages_sent DESC
    `);

    // Recent 50 logs
    const logsResult = await db.query(`
      SELECT * FROM alliance_external_api_logs 
      ORDER BY created_at DESC 
      LIMIT 50
    `);

    res.json({
      success: true,
      summary: statsResult.rows[0],
      project_breakdown: projectResult.rows,
      sender_breakdown: senderResult.rows,
      recent_logs: logsResult.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
