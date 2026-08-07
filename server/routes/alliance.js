const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const db = require('../db/connection');
const ensureAllianceSchema = require('../db/alliance-schema');
const { processQueuedAllianceWelcomes } = require('../services/alliance-welcome');
const { publicAllianceEmailConfig, verifyAllianceEmailTransport, createAllianceEmailTransport, getAllianceEmailConfig } = require('../services/alliance-email');
const openRouter = require('../services/openrouter');
const { regenerateReplySuggestion } = require('../services/alliance-email-replies');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const CHANNELS = new Set(['auto', 'email', 'whatsapp']);
const TRUTHY = new Set(['true', 'yes', 'y', '1', 'opted_in', 'opt-in']);
const COMMON_FIELDS = new Set(['name', 'business_name', 'business name', 'organisation name', 'organization name', 'email', 'phone', 'mobile', 'audience', 'industry', 'location', 'source', 'channel_pref', 'channel preference', 'consent', 'whatsapp_consent', 'whatsapp consent', 'consent_source', 'consent source']);

function text(value) {
  return value == null ? '' : String(value).trim();
}

function normalizeEmail(value) {
  const email = text(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizePhone(value) {
  let phone = text(value).replace(/[^0-9]/g, '');
  if (phone.length === 10) phone = `91${phone}`;
  return phone.length >= 11 && phone.length <= 15 ? phone : null;
}

function valueFrom(row, names) {
  const entries = Object.entries(row);
  for (const name of names) {
    const found = entries.find(([key]) => key.trim().toLowerCase() === name);
    if (found) return found[1];
  }
  return '';
}

function parseRows(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const formattedRows = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });
  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: true });

  return formattedRows.map((formattedRow, index) => {
    const rawRow = rawRows[index] || {};
    const merged = { ...formattedRow };
    for (const key of Object.keys(formattedRow)) {
      const normalizedKey = key.trim().toLowerCase();
      if (!['phone', 'mobile'].includes(normalizedKey)) continue;
      const rawValue = rawRow[key];
      // Excel often displays long phone numbers as 9.18807E+11. The underlying
      // numeric cell still contains the full safe integer, so use that value.
      if (typeof rawValue === 'number' && Number.isSafeInteger(rawValue)) {
        merged[key] = String(rawValue);
      } else if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        merged[key] = String(rawValue).trim();
      }
    }
    return merged;
  });
}

function parseCustomValue(value, type) {
  const raw = text(value);
  if (!raw) return null;
  if (type === 'auto') {
    if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
    if (/^-?\d+\.\d+$/.test(raw)) return Number(raw);
    if (TRUTHY.has(raw.toLowerCase())) return true;
    if (['false', 'no', 'n', '0'].includes(raw.toLowerCase())) return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return raw;
  }
  if (type === 'integer') return /^-?\d+$/.test(raw) ? Number.parseInt(raw, 10) : undefined;
  if (type === 'number') return Number.isFinite(Number(raw)) ? Number(raw) : undefined;
  if (type === 'boolean') {
    if (TRUTHY.has(raw.toLowerCase())) return true;
    if (['false', 'no', 'n', '0'].includes(raw.toLowerCase())) return false;
    return undefined;
  }
  if (type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
  return raw;
}

async function buildAudienceTemplateData(code) {
  const result = await db.query(
    `SELECT a.*, COALESCE(json_agg(json_build_object(
       'field_key', f.field_key, 'label', f.label, 'data_type', f.data_type,
       'required', f.required, 'sample_value', f.sample_value, 'sort_order', f.sort_order
     ) ORDER BY f.sort_order, f.id) FILTER (WHERE f.id IS NOT NULL), '[]'::json) AS fields
     FROM alliance_audiences a
     LEFT JOIN alliance_audience_fields f ON f.audience_id = a.id AND f.active = TRUE
     WHERE a.code = $1 AND a.active = TRUE GROUP BY a.id`, [code]
  );
  if (!result.rowCount) return null;
  const audience = result.rows[0];
  const commonHeaders = ['name', 'business_name', 'email', 'phone', 'audience', 'industry', 'location', 'source', 'channel_pref', 'consent', 'consent_source'];
  const headers = [...commonHeaders, ...audience.fields.map((field) => field.field_key)];
  const generic = {
    name: 'Contact Name', business_name: `Example ${audience.label}`, email: 'contact@example.com', phone: '919876543210',
    audience: audience.code, industry: 'Industry', location: 'Chennai', source: 'manual_research',
    channel_pref: audience.default_channel, consent: audience.default_channel === 'whatsapp' ? 'true' : 'false',
    consent_source: audience.default_channel === 'whatsapp' ? 'click_to_whatsapp' : '',
  };
  const samples = (Array.isArray(audience.template_samples) && audience.template_samples.length ? audience.template_samples : [generic]).slice(0, 2);
  const rows = samples.map((sample) => {
    const values = { ...generic, ...sample, audience: audience.code };
    audience.fields.forEach((field) => { values[field.field_key] = sample[field.field_key] ?? field.sample_value ?? ''; });
    return headers.reduce((row, header) => ({ ...row, [header]: values[header] ?? '' }), {});
  });
  return { audience, headers, rows };
}

router.use(async (req, res, next) => {
  try {
    await ensureAllianceSchema();
    next();
  } catch (error) {
    console.error('Alliance schema initialization failed:', error);
    res.status(500).json({ error: 'AllianceOS database is not ready' });
  }
});

router.get('/audiences', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.code, a.label, a.brand, a.default_channel, a.active,
              COALESCE(json_agg(json_build_object(
                'id', f.id, 'field_key', f.field_key, 'label', f.label,
                'data_type', f.data_type, 'required', f.required, 'sample_value', f.sample_value, 'sort_order', f.sort_order
              ) ORDER BY f.sort_order, f.id) FILTER (WHERE f.id IS NOT NULL), '[]'::json) AS fields
       FROM alliance_audiences a
       LEFT JOIN alliance_audience_fields f ON f.audience_id = a.id AND f.active = TRUE
       WHERE a.active = TRUE
       GROUP BY a.id ORDER BY a.created_at, a.id`
    );
    res.json({ audiences: result.rows });
  } catch (error) {
    console.error('Alliance audience list failed:', error);
    res.status(500).json({ error: 'Failed to load audience configuration.' });
  }
});

router.get('/email-settings', async (_req, res) => {
  try {
    const senders = await db.query(
      `SELECT id, inbox_email, provider, credential_ref, warmup_stage, daily_cap,
              sent_today, reputation, status, last_reset, created_at
       FROM alliance_domains ORDER BY created_at DESC`
    );
    res.json({ config: publicAllianceEmailConfig(), senders: senders.rows });
  } catch (error) {
    console.error('Alliance email settings failed:', error);
    res.status(500).json({ error: 'Failed to load Alliance email settings.' });
  }
});

router.put('/email-settings', async (req, res) => {
  try {
    const config = publicAllianceEmailConfig();
    if (!config.from || !config.user || !config.host || !config.password_configured) {
      return res.status(400).json({ error: 'Complete the Alliance SMTP environment variables before activating this sender.' });
    }
    const dailyCap = Math.min(Math.max(Number(req.body.daily_cap) || 20, 1), 50);
    const warmupStage = Math.min(Math.max(Number(req.body.warmup_stage) || 1, 1), 4);
    const status = ['active', 'inactive', 'paused'].includes(req.body.status) ? req.body.status : 'inactive';
    const result = await db.query(
      `INSERT INTO alliance_domains
        (inbox_email, provider, credential_ref, warmup_stage, daily_cap, reputation, status)
       VALUES ($1,$2,'env:ALLIANCE_EMAIL_SMTP_PASSWORD',$3,$4,'unknown',$5)
       ON CONFLICT (inbox_email) DO UPDATE SET
         provider = EXCLUDED.provider, credential_ref = EXCLUDED.credential_ref,
         warmup_stage = EXCLUDED.warmup_stage, daily_cap = EXCLUDED.daily_cap,
         status = EXCLUDED.status
       RETURNING id, inbox_email, provider, credential_ref, warmup_stage, daily_cap,
                 sent_today, reputation, status, last_reset, created_at`,
      [config.from, config.provider, warmupStage, dailyCap, status]
    );
    res.json({ success: true, sender: result.rows[0] });
  } catch (error) {
    console.error('Alliance email sender save failed:', error);
    res.status(500).json({ error: 'Failed to save Alliance email sender.' });
  }
});

router.post('/email-settings/verify', async (_req, res) => {
  try {
    await verifyAllianceEmailTransport();
    res.json({ success: true, message: 'Zoho SMTP authentication succeeded. No email was sent.' });
  } catch (error) {
    console.error('Alliance SMTP verification failed:', error.message);
    res.status(502).json({ error: `Zoho SMTP verification failed: ${error.message}` });
  }
});

router.get('/audiences/:code/template', async (req, res) => {
  try {
    const template = await buildAudienceTemplateData(req.params.code);
    if (!template) return res.status(404).json({ error: 'Audience not found.' });
    const { audience, headers, rows } = template;
    const workbook = xlsx.utils.book_new();
    const leadsSheet = xlsx.utils.json_to_sheet(rows, { header: headers });
    leadsSheet['!cols'] = headers.map((header) => ({ wch: Math.max(14, header.length + 3) }));
    xlsx.utils.book_append_sheet(workbook, leadsSheet, 'Leads');
    const instructions = xlsx.utils.aoa_to_sheet([
      [`AllianceOS ${audience.label} upload template`],
      ['Instructions', 'Do not rename headers. Replace or delete sample rows before uploading.'],
      ['Required custom columns', audience.fields.filter((field) => field.required).map((field) => field.field_key).join(', ') || 'None'],
      ['Default channel', audience.default_channel],
      ['WhatsApp rule', 'phone, consent=true, and consent_source are mandatory.'],
    ]);
    instructions['!cols'] = [{ wch: 28 }, { wch: 90 }];
    xlsx.utils.book_append_sheet(workbook, instructions, 'Instructions');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="AllianceOS_${audience.code}_Lead_Template.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Alliance audience template failed:', error);
    res.status(500).json({ error: 'Failed to generate Excel template.' });
  }
});

router.get('/audiences/:code/template-preview', async (req, res) => {
  try {
    const template = await buildAudienceTemplateData(req.params.code);
    if (!template) return res.status(404).json({ error: 'Audience not found.' });
    res.json({
      audience: { code: template.audience.code, label: template.audience.label, default_channel: template.audience.default_channel },
      columns: template.headers,
      rows: template.rows.slice(0, 2),
    });
  } catch (error) {
    console.error('Alliance audience preview failed:', error);
    res.status(500).json({ error: 'Failed to load template preview.' });
  }
});

router.post('/audiences', async (req, res) => {
  const code = text(req.body.code).toLowerCase();
  const label = text(req.body.label);
  const brand = text(req.body.brand);
  const defaultChannel = text(req.body.default_channel || 'email').toLowerCase();
  const fields = Array.isArray(req.body.fields) ? req.body.fields : [];
  if (!/^[a-z][a-z0-9_]*$/.test(code)) return res.status(400).json({ error: 'Audience code must use lowercase letters, numbers, and underscores.' });
  if (!label) return res.status(400).json({ error: 'Audience label is required.' });
  if (!['email', 'whatsapp'].includes(defaultChannel)) return res.status(400).json({ error: 'Default channel must be email or whatsapp.' });
  if (fields.length > 50) return res.status(400).json({ error: 'A maximum of 50 custom fields is allowed.' });

  const normalizedFields = [];
  const seen = new Set();
  for (const [index, field] of fields.entries()) {
    const fieldKey = text(field.field_key).toLowerCase();
    const dataType = text(field.data_type || 'text').toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(fieldKey) || COMMON_FIELDS.has(fieldKey) || seen.has(fieldKey)) {
      return res.status(400).json({ error: `Invalid or duplicate custom field: ${fieldKey || index + 1}` });
    }
    if (!['auto', 'text', 'integer', 'number', 'boolean', 'date'].includes(dataType)) return res.status(400).json({ error: `Invalid data type for ${fieldKey}.` });
    if (!text(field.sample_value)) return res.status(400).json({ error: `Add a sample value for ${fieldKey}.` });
    seen.add(fieldKey);
    normalizedFields.push({ fieldKey, label: text(field.label) || fieldKey, dataType, required: Boolean(field.required), sampleValue: text(field.sample_value), sortOrder: index });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const audienceResult = await client.query(
      `INSERT INTO alliance_audiences (code, label, brand, default_channel)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [code, label, brand || null, defaultChannel]
    );
    for (const field of normalizedFields) {
      await client.query(
        `INSERT INTO alliance_audience_fields (audience_id, field_key, label, data_type, required, sample_value, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [audienceResult.rows[0].id, field.fieldKey, field.label, field.dataType, field.required, field.sampleValue || null, field.sortOrder]
      );
    }
    const cadence = defaultChannel === 'email'
      ? [[1, 0, 'Introduction and one clear ask'], [2, 2, 'Short friendly reminder'], [3, 5, 'New angle and proof'], [4, 9, 'Polite break-up message']]
      : [[1, 0, 'Approved introduction template'], [2, 4, 'One gentle follow-up']];
    for (const [touchNo, delayDays, purpose] of cadence) {
      await client.query(
        `INSERT INTO alliance_sequences (audience, channel, touch_no, delay_days, purpose)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (audience, channel, touch_no) DO NOTHING`,
        [code, defaultChannel, touchNo, delayDays, purpose]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ audience: { ...audienceResult.rows[0], fields: normalizedFields } });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'That audience code already exists.' });
    console.error('Alliance audience create failed:', error);
    res.status(500).json({ error: 'Failed to create audience.' });
  } finally {
    client.release();
  }
});

router.post('/prospects/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Select a CSV or XLSX file.' });

  const defaultAudience = text(req.body.audience || req.body.type).toLowerCase();
  const requestedChannel = text(req.body.channel || 'auto').toLowerCase();
  if (!CHANNELS.has(requestedChannel)) return res.status(400).json({ error: 'Select a valid channel.' });

  const audienceResult = await db.query(
    `SELECT a.*, COALESCE(json_agg(json_build_object(
       'field_key', f.field_key, 'data_type', f.data_type, 'required', f.required
     ) ORDER BY f.sort_order) FILTER (WHERE f.id IS NOT NULL), '[]'::json) AS fields
     FROM alliance_audiences a
     LEFT JOIN alliance_audience_fields f ON f.audience_id = a.id AND f.active = TRUE
     WHERE a.code = $1 AND a.active = TRUE GROUP BY a.id`,
    [defaultAudience]
  );
  if (!audienceResult.rowCount) return res.status(400).json({ error: 'Select a valid audience.' });
  const audienceConfig = audienceResult.rows[0];

  let rows;
  try {
    rows = parseRows(req.file.buffer);
  } catch (error) {
    return res.status(400).json({ error: 'The uploaded spreadsheet could not be read.' });
  }
  if (!rows.length) return res.status(400).json({ error: 'The uploaded file has no prospect rows.' });
  if (rows.length > 5000) return res.status(400).json({ error: 'A maximum of 5,000 rows is allowed per upload.' });

  const client = await db.connect();
  const report = {
    total: rows.length,
    imported: 0,
    duplicates: 0,
    suppressed: 0,
    invalid: 0,
    welcome_queued: 0,
    welcome_not_eligible: 0,
    welcome_missing_template: 0,
    errors: [],
  };
  try {
    await client.query('BEGIN');
    const campaignName = text(req.body.campaign) || `Import ${new Date().toISOString().slice(0, 10)}`;
    const campaignResult = await client.query(
      `INSERT INTO alliance_campaigns (name, audience, channel, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id, name`,
      [campaignName, defaultAudience, requestedChannel, req.user?.id || null]
    );
    const campaign = campaignResult.rows[0];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNo = index + 2;
      const businessName = text(valueFrom(row, ['business_name', 'business name', 'organisation name', 'organization name']));
      const name = text(valueFrom(row, ['name', 'contact name', 'principal name']));
      const audience = text(valueFrom(row, ['audience'])).toLowerCase() || defaultAudience;
      const emailRaw = text(valueFrom(row, ['email']));
      const phoneRaw = text(valueFrom(row, ['phone', 'mobile']));
      const email = normalizeEmail(emailRaw);
      const phone = normalizePhone(phoneRaw);
      const rowChannel = text(valueFrom(row, ['channel_pref', 'channel preference'])).toLowerCase();
      const consent = TRUTHY.has(text(valueFrom(row, ['consent', 'whatsapp_consent', 'whatsapp consent'])).toLowerCase());
      const consentSource = text(valueFrom(row, ['consent_source', 'consent source']));
      const channelPref = rowChannel || (requestedChannel === 'auto' ? '' : requestedChannel);
      const channel = channelPref || audienceConfig.default_channel;
      const problems = [];

      if (!businessName) problems.push('business_name is required');
      if (audience !== defaultAudience) problems.push(`audience must be ${defaultAudience} for this campaign`);
      if (rowChannel && !['email', 'whatsapp'].includes(rowChannel)) problems.push('invalid channel_pref');
      if (emailRaw && !email) problems.push('invalid email');
      if (phoneRaw && !phone) problems.push('invalid mobile number');
      if (channel === 'email' && !email) problems.push('email is required for email outreach');
      if (channel === 'whatsapp' && !phone) problems.push('mobile number is required for WhatsApp');
      if (channel === 'whatsapp' && !consent) problems.push('WhatsApp consent is required');
      if (channel === 'whatsapp' && !consentSource) problems.push('consent_source is required for WhatsApp');

      const customFields = {};
      for (const field of audienceConfig.fields) {
        const rawValue = valueFrom(row, [field.field_key]);
        const parsedValue = parseCustomValue(rawValue, field.data_type);
        if (field.required && (parsedValue === null || parsedValue === undefined)) problems.push(`${field.field_key} is required`);
        else if (parsedValue === undefined) problems.push(`${field.field_key} must be ${field.data_type}`);
        else if (parsedValue !== null) customFields[field.field_key] = parsedValue;
      }

      if (problems.length) {
        report.invalid += 1;
        if (report.errors.length < 100) report.errors.push({ row: rowNo, business_name: businessName, reasons: problems });
        continue;
      }

      const suppression = await client.query(
        `SELECT 1 FROM alliance_suppression
         WHERE ($1::text IS NOT NULL AND LOWER(email) = LOWER($1))
            OR ($2::text IS NOT NULL AND phone = $2)
         LIMIT 1`,
        [email, phone]
      );
      if (suppression.rowCount) {
        report.suppressed += 1;
        continue;
      }

      const duplicate = await client.query(
        `SELECT 1 FROM alliance_prospects
         WHERE ($1::text IS NOT NULL AND LOWER(email) = LOWER($1))
            OR ($2::text IS NOT NULL AND phone = $2)
         LIMIT 1`,
        [email, phone]
      );
      if (duplicate.rowCount) {
        report.duplicates += 1;
        continue;
      }

      const prospectResult = await client.query(
        `INSERT INTO alliance_prospects
          (campaign_id, audience, name, business_name, phone, email, industry, location,
           channel_pref, channel, consent, consent_source, consent_at, source, custom_fields)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING id`,
        [campaign.id, audience, name || null, businessName, phone, email,
          text(valueFrom(row, ['industry'])) || null, text(valueFrom(row, ['location'])) || null,
          channelPref || null, channel, consent,
          consent ? consentSource : null,
          consent ? new Date() : null, text(valueFrom(row, ['source'])) || 'file_upload', customFields]
      );
      const prospectId = prospectResult.rows[0].id;
      await client.query(
        `INSERT INTO alliance_campaign_prospects (campaign_id, prospect_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [campaign.id, prospectId]
      );
      let contactResult;
      if (phone) {
        contactResult = await client.query(`SELECT id FROM alliance_inbox_contacts WHERE phone = $1 LIMIT 1`, [phone]);
      }
      if (contactResult?.rowCount) {
        contactResult = await client.query(
          `UPDATE alliance_inbox_contacts
           SET prospect_id = $1, wa_id = COALESCE(wa_id, $2), name = COALESCE($3, name),
               source = 'file_upload', custom_fields = custom_fields || $4::jsonb, updated_at = NOW()
           WHERE id = $5 RETURNING *`,
          [prospectId, phone, name || null, JSON.stringify({ business_name: businessName, audience, email }), contactResult.rows[0].id]
        );
      } else {
        contactResult = await client.query(
          `INSERT INTO alliance_inbox_contacts (prospect_id, wa_id, phone, name, profile_name, source, custom_fields)
           VALUES ($1,$2,$2,$3,$3,'file_upload',$4::jsonb) RETURNING *`,
          [prospectId, phone, name || businessName, JSON.stringify({ business_name: businessName, audience, email })]
        );
      }
      const contact = contactResult.rows[0];
      const settingsResult = await client.query(`SELECT phone_number_id FROM alliance_inbox_settings WHERE active = TRUE ORDER BY id LIMIT 1`);
      const phoneNumberId = settingsResult.rows[0]?.phone_number_id || process.env.ALLIANCE_WA_PHONE_NUMBER_ID || 'unconfigured';
      const welcomeEligible = Boolean(phone && consent);
      const conversationResult = await client.query(
        `INSERT INTO alliance_inbox_conversations (contact_id, phone_number_id, welcome_status)
         VALUES ($1,$2,$3)
         ON CONFLICT (contact_id) DO UPDATE SET phone_number_id = EXCLUDED.phone_number_id, updated_at = NOW()
         RETURNING *`,
        [contact.id, phoneNumberId, welcomeEligible ? 'queued' : 'not_eligible']
      );
      if (welcomeEligible) {
        const templateResult = await client.query(
          `SELECT template_name, body, language FROM alliance_templates
           WHERE audience = $1 AND channel = 'whatsapp' AND touch_no = 1 AND active = TRUE
             AND template_name IS NOT NULL AND LOWER(COALESCE(provider_status, 'approved')) = 'approved'
           ORDER BY updated_at DESC LIMIT 1`,
          [audience]
        );
        if (templateResult.rowCount) {
          const template = templateResult.rows[0];
          await client.query(
            `INSERT INTO alliance_inbox_messages
              (conversation_id, contact_id, direction, msg_type, content, status, raw_payload)
             VALUES ($1,$2,'outbound','template',$3,'queued',$4::jsonb)`,
            [conversationResult.rows[0].id, contact.id, template.body,
              JSON.stringify({ purpose: 'welcome', template_name: template.template_name, language: template.language || 'en', prospect_id: prospectId })]
          );
          await client.query(
            `UPDATE alliance_inbox_conversations SET welcome_template_name = $1 WHERE id = $2`,
            [template.template_name, conversationResult.rows[0].id]
          );
          report.welcome_queued = (report.welcome_queued || 0) + 1;
        } else {
          await client.query(
            `UPDATE alliance_inbox_conversations SET welcome_status = 'missing_template', welcome_error = $1 WHERE id = $2`,
            ['No approved WhatsApp touch-1 template is configured for this audience.', conversationResult.rows[0].id]
          );
          report.welcome_missing_template = (report.welcome_missing_template || 0) + 1;
        }
      } else {
        report.welcome_not_eligible = (report.welcome_not_eligible || 0) + 1;
      }
      report.imported += 1;
    }

    await client.query('COMMIT');
    req.app.get('io')?.emit('alliance_contacts_changed', { campaign_id: campaign.id, imported: report.imported });
    setImmediate(() => processQueuedAllianceWelcomes(req.app.get('io')).catch((error) => {
      console.error('[Alliance welcome queue]', error);
    }));
    res.status(201).json({
      success: true,
      campaign,
      report,
      message: `Imported ${report.imported} of ${report.total} prospects.`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Alliance prospect import failed:', error);
    res.status(500).json({ error: 'Failed to import AllianceOS prospects.' });
  } finally {
    client.release();
  }
});

router.get('/prospects', async (req, res) => {
  const values = [];
  const where = [];
  const add = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };
  if (req.query.audience) add('p.audience = ?', req.query.audience);
  if (req.query.status) add('p.status = ?', req.query.status);
  if (req.query.channel && ['email', 'whatsapp'].includes(req.query.channel)) add('p.channel = ?', req.query.channel);
  if (req.query.search) {
    values.push(req.query.search);
    const searchParam = `$${values.length}`;
    where.push(`(p.business_name ILIKE '%' || ${searchParam} || '%'
      OR p.name ILIKE '%' || ${searchParam} || '%'
      OR p.email ILIKE '%' || ${searchParam} || '%'
      OR (REGEXP_REPLACE(${searchParam}, '[^0-9]', '', 'g') <> '' AND
          REGEXP_REPLACE(COALESCE(p.phone, ''), '[^0-9]', '', 'g') LIKE '%' ||
          REGEXP_REPLACE(${searchParam}, '[^0-9]', '', 'g') || '%'))`);
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  try {
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM alliance_prospects p
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
      values
    );
    values.push(limit);
    const limitParam = `$${values.length}`;
    values.push(offset);
    const offsetParam = `$${values.length}`;
    const result = await db.query(
      `SELECT p.id, p.name, p.business_name, p.location, p.industry, p.audience, p.channel,
              p.status, p.current_touch, p.ai_score, p.email, p.phone, p.source,
              p.consent, p.consent_source, p.custom_fields, p.updated_at,
              c.id AS campaign_id, c.name AS campaign_name, p.created_at
       FROM alliance_prospects p
       LEFT JOIN alliance_campaigns c ON c.id = p.campaign_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY p.created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values
    );
    res.json({ prospects: result.rows, count: result.rowCount, total: countResult.rows[0].total, limit, offset });
  } catch (error) {
    console.error('Alliance prospect list failed:', error);
    res.status(500).json({ error: 'Failed to load AllianceOS prospects.' });
  }
});

router.patch('/prospects/:id', async (req, res) => {
  try {
    const existingResult = await db.query(`SELECT * FROM alliance_prospects WHERE id = $1`, [req.params.id]);
    if (!existingResult.rowCount) return res.status(404).json({ error: 'Prospect not found.' });
    const existing = existingResult.rows[0];
    const audience = text(req.body.audience ?? existing.audience).toLowerCase();
    const audienceExists = await db.query(`SELECT 1 FROM alliance_audiences WHERE code = $1 AND active = TRUE`, [audience]);
    if (!audienceExists.rowCount) return res.status(400).json({ error: 'Select a valid audience.' });
    const emailInput = req.body.email !== undefined ? text(req.body.email) : existing.email;
    const phoneInput = req.body.phone !== undefined ? text(req.body.phone) : existing.phone;
    const email = emailInput ? normalizeEmail(emailInput) : null;
    const phone = phoneInput ? normalizePhone(phoneInput) : null;
    const channel = text(req.body.channel ?? existing.channel).toLowerCase();
    const consent = req.body.consent !== undefined ? Boolean(req.body.consent) : existing.consent;
    const consentSource = req.body.consent_source !== undefined ? text(req.body.consent_source) : existing.consent_source;
    if (!['email', 'whatsapp'].includes(channel)) return res.status(400).json({ error: 'Channel must be email or whatsapp.' });
    if (emailInput && !email) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (phoneInput && !phone) return res.status(400).json({ error: 'Enter a valid mobile number.' });
    if (channel === 'email' && !email) return res.status(400).json({ error: 'Email is required for email outreach.' });
    if (channel === 'whatsapp' && (!phone || !consent || !consentSource)) return res.status(400).json({ error: 'WhatsApp requires phone, consent, and consent source.' });
    const businessName = text(req.body.business_name ?? existing.business_name);
    if (!businessName) return res.status(400).json({ error: 'Business name is required.' });

    const result = await db.query(
      `UPDATE alliance_prospects SET audience=$1, name=$2, business_name=$3, email=$4, phone=$5,
       industry=$6, location=$7, source=$8, channel=$9, channel_pref=$9, consent=$10,
       consent_source=$11, consent_at=CASE WHEN $10 THEN COALESCE(consent_at,NOW()) ELSE NULL END,
       custom_fields=$12, updated_at=NOW() WHERE id=$13 RETURNING *`,
      [audience, text(req.body.name ?? existing.name) || null, businessName, email, phone,
        text(req.body.industry ?? existing.industry) || null, text(req.body.location ?? existing.location) || null,
        text(req.body.source ?? existing.source) || 'manual_edit', channel, consent, consent ? consentSource : null,
        req.body.custom_fields && typeof req.body.custom_fields === 'object' ? req.body.custom_fields : existing.custom_fields,
        req.params.id]
    );
    res.json({ prospect: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Another prospect already uses this email or phone.' });
    console.error('Alliance prospect update failed:', error);
    res.status(500).json({ error: 'Failed to update prospect.' });
  }
});

router.delete('/prospects/:id', async (req, res) => {
  try {
    const result = await db.query(`DELETE FROM alliance_prospects WHERE id = $1 RETURNING id, business_name`, [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Prospect not found.' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Alliance prospect delete failed:', error);
    res.status(500).json({ error: 'Failed to delete prospect.' });
  }
});

function campaignProspectFilters(query) {
  const values = [];
  const where = [`p.email IS NOT NULL`, `p.suppressed = FALSE`, `p.status NOT IN ('converted','closed','not_interested','unsubscribed')`];
  const add = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };
  if (query.audience) add('p.audience = ?', text(query.audience).toLowerCase());
  if (query.industry) add('p.industry = ?', text(query.industry));
  if (query.status) add('p.status = ?', text(query.status));
  if (query.source) add('p.source = ?', text(query.source));
  if (query.location) add('p.location = ?', text(query.location));
  if (query.tag) add('? = ANY(p.tags)', text(query.tag));
  if (query.search) {
    values.push(text(query.search));
    const param = `$${values.length}`;
    where.push(`(p.name ILIKE '%' || ${param} || '%' OR p.business_name ILIKE '%' || ${param} || '%' OR p.email ILIKE '%' || ${param} || '%')`);
  }
  return { values, where };
}

router.get('/campaign-builder/options', async (_req, res) => {
  try {
    const [audiences, facets, senders] = await Promise.all([
      db.query(`SELECT code, label, brand FROM alliance_audiences WHERE active = TRUE ORDER BY label`),
      db.query(`SELECT
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT industry ORDER BY industry), NULL) AS industries,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT status ORDER BY status), NULL) AS statuses,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT source ORDER BY source), NULL) AS sources,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT location ORDER BY location), NULL) AS locations
        FROM alliance_prospects`),
      db.query(`SELECT id, inbox_email, provider, daily_cap, sent_today, status FROM alliance_domains WHERE status = 'active' ORDER BY inbox_email`),
    ]);
    res.json({ audiences: audiences.rows, ...(facets.rows[0] || {}), senders: senders.rows });
  } catch (error) {
    console.error('Alliance campaign options failed:', error);
    res.status(500).json({ error: 'Failed to load campaign builder options.' });
  }
});

router.get('/replies', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const conditions = [`r2.channel='email'`];
    const values = [];
    const add = (sql, value) => { values.push(value); conditions.push(sql.replace('?', `$${values.length}`)); };
    const search = text(req.query.search).toLowerCase();
    if (search) add(`(LOWER(COALESCE(p.name,'')) LIKE ? OR LOWER(COALESCE(p.business_name,'')) LIKE ? OR LOWER(COALESCE(p.email,'')) LIKE ? OR COALESCE(p.phone,'') LIKE ?)`, `%${search}%`);
    if (search) { const value = values.at(-1); values.push(value, value, value); conditions[conditions.length - 1] = conditions.at(-1).replace('$' + (values.length - 3), '$' + (values.length - 3)).replace('?', `$${values.length - 2}`).replace('?', `$${values.length - 1}`).replace('?', `$${values.length}`); }
    if (req.query.campaign) add(`ei2.campaign_id=?`, Number(req.query.campaign));
    if (req.query.audience) add(`p.audience=?`, text(req.query.audience));
    if (req.query.reply_status) add(`(r2.status=? OR r2.ai_intent=?)`, text(req.query.reply_status));
    if (req.query.reply_status) { values.push(values.at(-1)); conditions[conditions.length - 1] = conditions.at(-1).replace('?', `$${values.length}`); }
    if (req.query.date_from) add(`ei2.received_at>=?::date`, req.query.date_from);
    if (req.query.date_to) add(`ei2.received_at<(?::date + INTERVAL '1 day')`, req.query.date_to);
    const exists = `EXISTS (SELECT 1 FROM alliance_replies r2 LEFT JOIN alliance_email_inbound ei2 ON ei2.id=r2.email_inbound_id WHERE r2.prospect_id=p.id AND ${conditions.join(' AND ')})`;
    const count = await db.query(`SELECT COUNT(*)::int AS total FROM alliance_prospects p WHERE ${exists}`, values);
    const listValues = [...values, limit, (page - 1) * limit];
    const result = await db.query(
      `SELECT p.id AS prospect_id,p.name,p.business_name,p.email,p.phone,p.audience,p.status AS lead_status,a.label AS audience_label,a.brand,
              latest.reply_status,latest.ai_intent,latest.last_reply_received,latest.last_subject,
              sent.last_email_sent,
              GREATEST(COALESCE(latest.last_reply_received,'epoch'),COALESCE(sent.last_email_sent,'epoch')) AS last_activity
       FROM alliance_prospects p
       LEFT JOIN alliance_audiences a ON a.code=p.audience
       LEFT JOIN LATERAL (
         SELECT r.status AS reply_status,r.ai_intent,ei.received_at AS last_reply_received,ei.subject AS last_subject
         FROM alliance_replies r LEFT JOIN alliance_email_inbound ei ON ei.id=r.email_inbound_id
         WHERE r.prospect_id=p.id AND r.channel='email' ORDER BY COALESCE(ei.received_at,r.created_at) DESC LIMIT 1
       ) latest ON TRUE
       LEFT JOIN LATERAL (
         SELECT MAX(t.sent_at) AS last_email_sent FROM alliance_touches t
         WHERE t.prospect_id=p.id AND t.channel='email' AND t.status='sent'
       ) sent ON TRUE
       WHERE ${exists}
       ORDER BY last_activity DESC,p.id DESC LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
      listValues
    );
    const [sync, campaigns, audiences] = await Promise.all([
      db.query(`SELECT mailbox,last_checked_at,last_success_at,last_error FROM alliance_email_sync_state ORDER BY updated_at DESC LIMIT 1`),
      db.query(`SELECT DISTINCT c.id,c.name FROM alliance_campaigns c JOIN alliance_email_inbound ei ON ei.campaign_id=c.id ORDER BY c.name`),
      db.query(`SELECT code,label FROM alliance_audiences WHERE active=TRUE ORDER BY label`),
    ]);
    res.json({ conversations: result.rows, total: count.rows[0]?.total || 0, page, limit, sync: sync.rows[0] || null,
      filters: { campaigns: campaigns.rows, audiences: audiences.rows, statuses: ['new','drafted','sent','interested','question','objection','not_interested','other'] } });
  } catch (error) {
    console.error('Alliance email replies failed:', error);
    res.status(500).json({ error: 'Failed to load Alliance email replies.' });
  }
});

router.get('/reply-conversations/:prospectId', async (req, res) => {
  try {
    const prospect = await db.query(
      `SELECT p.id,p.name,p.business_name,p.email,p.phone,p.audience,p.status,a.label AS audience_label,a.brand
       FROM alliance_prospects p LEFT JOIN alliance_audiences a ON a.code=p.audience WHERE p.id=$1`,
      [req.params.prospectId]
    );
    if (!prospect.rowCount) return res.status(404).json({ error: 'Lead not found.' });
    const [sent, inbound, approved] = await Promise.all([
      db.query(
        `SELECT 'outbound' AS direction,'campaign' AS message_type,t.id,t.subject,t.message_body AS body,t.sent_at AS occurred_at,
                t.status,t.provider_message_id,t.touch_no,c.name AS campaign_name,
                COALESCE((SELECT ARRAY_AGG(DISTINCT e.event_type) FROM alliance_email_events e WHERE e.touch_id=t.id),ARRAY[]::varchar[]) AS events
         FROM alliance_touches t LEFT JOIN alliance_campaigns c ON c.id=t.campaign_id
         WHERE t.prospect_id=$1 AND t.channel='email' AND t.sent_at IS NOT NULL`, [req.params.prospectId]),
      db.query(
        `SELECT 'inbound' AS direction,'reply' AS message_type,ei.id,ei.subject,COALESCE(r.body,ei.text_body) AS body,
                ei.received_at AS occurred_at,COALESCE(r.status,ei.processing_status) AS status,ei.message_id AS provider_message_id,
                ei.campaign_id,c.name AS campaign_name,r.id AS reply_id,r.ai_intent,r.ai_draft,
                COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',att.id,'filename',att.filename,'content_type',att.content_type,'size_bytes',att.size_bytes) ORDER BY att.attachment_index) FROM alliance_email_attachments att WHERE att.inbound_id=ei.id),'[]'::json) AS attachments
         FROM alliance_email_inbound ei LEFT JOIN alliance_replies r ON r.email_inbound_id=ei.id
         LEFT JOIN alliance_campaigns c ON c.id=ei.campaign_id WHERE ei.prospect_id=$1`, [req.params.prospectId]),
      db.query(
        `SELECT 'outbound' AS direction,'approved_reply' AS message_type,r.id,CASE WHEN ei.subject ILIKE 'Re:%' THEN ei.subject ELSE 'Re: '||COALESCE(ei.subject,'Your reply') END AS subject,
                r.ai_draft AS body,r.approved_at AS occurred_at,r.status,NULL::varchar AS provider_message_id,
                ei.campaign_id,c.name AS campaign_name,ARRAY['sent']::varchar[] AS events
         FROM alliance_replies r JOIN alliance_email_inbound ei ON ei.id=r.email_inbound_id
         LEFT JOIN alliance_campaigns c ON c.id=ei.campaign_id
         WHERE r.prospect_id=$1 AND r.channel='email' AND r.status='sent' AND r.approved_at IS NOT NULL`, [req.params.prospectId]),
    ]);
    const messages = [...sent.rows, ...inbound.rows, ...approved.rows].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));
    res.json({ prospect: prospect.rows[0], messages });
  } catch (error) {
    console.error('Alliance conversation failed:', error);
    res.status(500).json({ error: 'Failed to load email conversation.' });
  }
});

router.get('/reply-attachments/:id', async (req, res) => {
  try {
    const result = await db.query(`SELECT filename,content_type,content FROM alliance_email_attachments WHERE id=$1`, [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Attachment not found.' });
    const attachment = result.rows[0];
    res.setHeader('Content-Type', attachment.content_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${String(attachment.filename).replace(/["\r\n]/g, '_')}"`);
    res.send(attachment.content);
  } catch (error) { res.status(500).json({ error: 'Failed to download attachment.' }); }
});

router.post('/replies/:id/suggest', async (req, res) => {
  try {
    const suggestion = await regenerateReplySuggestion(req.params.id);
    res.json({ success: true, suggestion });
  } catch (error) {
    console.error('Alliance reply suggestion failed:', error.message);
    res.status(error.message === 'Reply record not found.' ? 404 : 502).json({ error: error.message || 'Failed to generate reply suggestion.' });
  }
});

router.post('/replies/:id/send', async (req, res) => {
  try {
    const body = text(req.body.body);
    if (!body) return res.status(400).json({ error: 'Reply body is required.' });
    const result = await db.query(
      `SELECT r.id, r.status, r.prospect_id, p.email, p.name, p.business_name,
              ei.message_id, ei.message_references, ei.subject, ei.campaign_id,
              c.sender_domain_id, d.inbox_email, d.status AS sender_status
       FROM alliance_replies r
       JOIN alliance_prospects p ON p.id = r.prospect_id
       JOIN alliance_email_inbound ei ON ei.id = r.email_inbound_id
       JOIN alliance_campaigns c ON c.id = ei.campaign_id
       JOIN alliance_domains d ON d.id = c.sender_domain_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Reply record not found.' });
    const reply = result.rows[0];
    if (reply.status === 'sent') return res.status(409).json({ error: 'This reply has already been sent.' });
    if (reply.sender_status !== 'active') return res.status(409).json({ error: 'The campaign email sender is not active.' });
    const config = getAllianceEmailConfig();
    if (normalizeEmail(config.from) !== normalizeEmail(reply.inbox_email)) return res.status(409).json({ error: 'Selected sender does not match ALLIANCE_EMAIL_FROM.' });
    const subject = /^re:/i.test(reply.subject || '') ? reply.subject : `Re: ${reply.subject || 'Your reply'}`;
    const html = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const originalId = String(reply.message_id || '').replace(/^<|>$/g, '');
    const references = [...(reply.message_references || []), originalId].filter(Boolean).map((id) => `<${String(id).replace(/^<|>$/g, '')}>`);
    const sent = await createAllianceEmailTransport().sendMail({
      from: { name: config.fromName, address: config.from }, to: reply.email,
      replyTo: config.replyTo, subject, text: body,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${html}</div>`,
      inReplyTo: originalId ? `<${originalId}>` : undefined,
      references,
    });
    await db.query(
      `UPDATE alliance_replies SET ai_draft=$1, status='sent', approved_by=$2, approved_at=NOW() WHERE id=$3`,
      [body, req.user?.id || null, reply.id]
    );
    await db.query(
      `INSERT INTO alliance_email_events (campaign_id,prospect_id,provider_message_id,event_type,event_payload)
       VALUES ($1,$2,$3,'reply_sent',$4::jsonb)`,
      [reply.campaign_id, reply.prospect_id, sent.messageId || null,
        JSON.stringify({ recipient: reply.email, accepted: sent.accepted, rejected: sent.rejected, response: sent.response, reply_id: reply.id })]
    );
    res.json({ success: true, message: `Reply submitted to Zoho for ${reply.email}.`, provider_message_id: sent.messageId || null });
  } catch (error) {
    console.error('Alliance approved email reply failed:', error.response || error.message);
    res.status(502).json({ error: error.response || error.message || 'Failed to send approved reply.' });
  }
});

router.get('/campaign-builder/prospects', async (req, res) => {
  try {
    const { values, where } = campaignProspectFilters(req.query);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 5000);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const count = await db.query(`SELECT COUNT(*)::int AS total FROM alliance_prospects p WHERE ${where.join(' AND ')}`, values);
    values.push(limit, offset);
    const result = await db.query(
      `SELECT p.id, p.name, p.business_name, p.email, p.audience, p.industry, p.location,
              p.status, p.source, p.tags, p.ai_score, p.created_at
       FROM alliance_prospects p WHERE ${where.join(' AND ')}
       ORDER BY p.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    res.json({ prospects: result.rows, total: count.rows[0].total, limit, offset });
  } catch (error) {
    console.error('Alliance campaign prospect selection failed:', error);
    res.status(500).json({ error: 'Failed to load eligible email prospects.' });
  }
});

async function baseEmailSequence(audience) {
  const result = await db.query(
    `SELECT s.touch_no, s.delay_days, s.purpose, t.subject, t.body
     FROM alliance_sequences s
     JOIN alliance_templates t ON t.audience = s.audience AND t.channel = s.channel AND t.touch_no = s.touch_no AND t.active = TRUE
     WHERE s.audience = $1 AND s.channel = 'email' AND s.active = TRUE
     ORDER BY s.touch_no`,
    [audience]
  );
  return result.rows;
}

router.get('/campaign-builder/templates', async (req, res) => {
  try {
    const audience = text(req.query.audience).toLowerCase();
    const audienceResult = await db.query(`SELECT code, label, brand FROM alliance_audiences WHERE code = $1 AND active = TRUE`, [audience]);
    if (!audienceResult.rowCount) return res.status(400).json({ error: 'Select a valid audience.' });
    res.json({ audience: audienceResult.rows[0], templates: await baseEmailSequence(audience), ai_configured: openRouter.isConfigured });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load email sequence templates.' });
  }
});

router.post('/campaign-builder/ai-suggestion', async (req, res) => {
  try {
    const audience = text(req.body.audience).toLowerCase();
    const objective = text(req.body.objective);
    const audienceResult = await db.query(`SELECT code, label, brand FROM alliance_audiences WHERE code = $1 AND active = TRUE`, [audience]);
    if (!audienceResult.rowCount) return res.status(400).json({ error: 'Select a valid audience.' });
    const base = await baseEmailSequence(audience);
    if (!base.length) return res.status(409).json({ error: 'No base email templates are configured for this audience.' });
    if (!openRouter.isConfigured) return res.json({ templates: base, ai_generated: false, warning: 'OpenRouter is not configured; base templates were returned.' });
    const knowledge = await db.query(
      `SELECT fact_key, fact_value FROM alliance_kb WHERE audience = $1 AND active = TRUE ORDER BY fact_key`,
      [audience]
    );
    const prompt = `You are AllianceOS's B2B cold-email campaign editor. Create exactly four concise emails for human review.
Brand: ${audienceResult.rows[0].brand || 'ABM Groups'}
Audience: ${audienceResult.rows[0].label}
Campaign objective: ${objective || 'Start a relevant business conversation'}
Approved facts: ${JSON.stringify(knowledge.rows)}
Base sequence: ${JSON.stringify(base)}
Rules: preserve {{name}}, {{org}}, and {{location}} variables; one clear CTA; no invented claims; include the existing unsubscribe instruction; do not exceed 100 words per email.
Return JSON only: {"templates":[{"touch_no":1,"delay_days":0,"purpose":"...","subject":"...","body":"..."}, ...]}`;
    const generated = await openRouter.generateContent({ contents: prompt, config: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 2400 } });
    const parsed = JSON.parse(String(generated.text).replace(/^```json\s*|\s*```$/g, ''));
    if (!Array.isArray(parsed.templates) || parsed.templates.length !== 4) throw new Error('AI returned an invalid sequence.');
    res.json({ templates: parsed.templates, ai_generated: true });
  } catch (error) {
    console.error('Alliance AI campaign suggestion failed:', error);
    res.status(502).json({ error: error.message || 'AI suggestion failed.' });
  }
});

router.post('/campaigns', async (req, res) => {
  const name = text(req.body.name);
  const audience = text(req.body.audience).toLowerCase();
  const prospectIds = [...new Set((Array.isArray(req.body.prospect_ids) ? req.body.prospect_ids : []).map(Number).filter(Number.isInteger))];
  const templates = Array.isArray(req.body.templates) ? req.body.templates : [];
  if (!name) return res.status(400).json({ error: 'Campaign name is required.' });
  if (!audience) return res.status(400).json({ error: 'Audience is required.' });
  if (!prospectIds.length) return res.status(400).json({ error: 'Select at least one lead.' });
  if (templates.length !== 4) return res.status(400).json({ error: 'Review all four email touches before creating the campaign.' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const eligible = await client.query(
      `SELECT id FROM alliance_prospects
       WHERE id = ANY($1::bigint[]) AND audience = $2 AND email IS NOT NULL AND suppressed = FALSE
         AND status NOT IN ('converted','closed','not_interested','unsubscribed')`,
      [prospectIds, audience]
    );
    if (eligible.rowCount !== prospectIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Some selected leads are no longer eligible or do not match the selected audience.' });
    }
    const senderId = Number(req.body.sender_domain_id);
    const sender = await client.query(`SELECT id FROM alliance_domains WHERE id = $1 AND status = 'active'`, [senderId]);
    if (!sender.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Select an active email sender.' });
    }
    const campaignResult = await client.query(
      `INSERT INTO alliance_campaigns (name, audience, channel, objective, sender_domain_id, created_by)
       VALUES ($1,$2,'email',$3,$4,$5) RETURNING *`,
      [name, audience, text(req.body.objective) || null, senderId, req.user?.id || null]
    );
    const campaign = campaignResult.rows[0];
    await client.query(
      `INSERT INTO alliance_campaign_prospects (campaign_id, prospect_id)
       SELECT $1, UNNEST($2::bigint[])`,
      [campaign.id, prospectIds]
    );
    for (const [index, template] of templates.entries()) {
      const touchNo = index + 1;
      const subject = text(template.subject);
      const body = text(template.body);
      if (!subject || !body) throw new Error(`Touch ${touchNo} subject and body are required.`);
      await client.query(
        `INSERT INTO alliance_campaign_templates (campaign_id, touch_no, delay_days, subject, body, ai_generated)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [campaign.id, touchNo, Math.min(Math.max(Number(template.delay_days) || 0, 0), 30), subject, body, Boolean(req.body.ai_generated)]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, campaign, selected_count: prospectIds.length, message: 'Draft email campaign created. Review readiness before starting.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Alliance email campaign create failed:', error);
    res.status(500).json({ error: error.message || 'Failed to create email campaign.' });
  } finally {
    client.release();
  }
});

async function getCampaignReadiness(queryable, campaignId) {
  const campaignResult = await queryable.query(
    `SELECT * FROM alliance_campaigns WHERE id = $1`,
    [campaignId]
  );
  if (!campaignResult.rowCount) return null;
  const campaign = campaignResult.rows[0];
  const statsResult = await queryable.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE suppressed = FALSE)::int AS eligible,
            COUNT(*) FILTER (WHERE (CASE WHEN c.channel = 'auto' THEN p.channel ELSE c.channel END) = 'email' AND p.email IS NOT NULL AND suppressed = FALSE)::int AS email,
            COUNT(*) FILTER (WHERE (CASE WHEN c.channel = 'auto' THEN p.channel ELSE c.channel END) = 'whatsapp' AND consent = TRUE AND suppressed = FALSE)::int AS whatsapp
     FROM alliance_campaign_prospects cp
     JOIN alliance_prospects p ON p.id = cp.prospect_id
     JOIN alliance_campaigns c ON c.id = cp.campaign_id
     WHERE cp.campaign_id = $1`,
    [campaignId]
  );
  const channelsResult = await queryable.query(
    `SELECT DISTINCT CASE WHEN c.channel = 'auto' THEN p.channel ELSE c.channel END AS channel
     FROM alliance_campaign_prospects cp
     JOIN alliance_prospects p ON p.id = cp.prospect_id
     JOIN alliance_campaigns c ON c.id = cp.campaign_id
     WHERE cp.campaign_id = $1 AND p.suppressed = FALSE`,
    [campaignId]
  );
  const missingTemplates = [];
  const missingSenders = [];
  const missingSequences = [];
  for (const { channel } of channelsResult.rows) {
    const sequenceResult = await queryable.query(
      `SELECT COUNT(*)::int AS expected FROM alliance_sequences
       WHERE audience = $1 AND channel = $2 AND active = TRUE`,
      [campaign.audience, channel]
    );
    const templateResult = channel === 'email'
      ? await queryable.query(`SELECT COUNT(*)::int AS available FROM alliance_campaign_templates WHERE campaign_id = $1`, [campaignId])
      : await queryable.query(
        `SELECT COUNT(*)::int AS available FROM alliance_templates WHERE audience = $1 AND channel = $2 AND active = TRUE`,
        [campaign.audience, channel]
      );
    if (!sequenceResult.rows[0].expected) missingSequences.push(channel);
    if (templateResult.rows[0].available < sequenceResult.rows[0].expected) missingTemplates.push(channel);

    const senderResult = channel === 'email'
      ? await queryable.query(`SELECT 1 FROM alliance_domains WHERE status = 'active' AND sent_today < daily_cap LIMIT 1`)
      : await queryable.query(`SELECT 1 FROM alliance_numbers WHERE status = 'active' AND quality_rating = 'green' AND sent_today < daily_cap LIMIT 1`);
    if (!senderResult.rowCount) missingSenders.push(channel);
  }
  const stats = statsResult.rows[0];
  const blockers = [];
  if (!stats.eligible) blockers.push('Campaign has no eligible prospects.');
  if (missingSequences.length) blockers.push(`Missing ${missingSequences.join(' and ')} sequence configuration.`);
  if (missingTemplates.length) blockers.push(`Missing complete ${missingTemplates.join(' and ')} template set.`);
  if (missingSenders.length) blockers.push(`No active ${missingSenders.join(' or ')} sender with available capacity.`);
  return { campaign, stats, missing_sequences: missingSequences, missing_templates: missingTemplates, missing_senders: missingSenders, blockers, ready: blockers.length === 0 };
}

router.get('/campaigns', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.audience, c.channel, c.status, c.created_at, c.started_at, c.completed_at,
              COUNT(DISTINCT p.id)::int AS prospects,
              COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'in_sequence')::int AS in_sequence,
              COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('replied','interested','not_interested'))::int AS replied,
              COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'interested')::int AS interested,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'sent')::int AS sent
       FROM alliance_campaigns c
       LEFT JOIN alliance_campaign_prospects cp ON cp.campaign_id = c.id
       LEFT JOIN alliance_prospects p ON p.id = cp.prospect_id
       LEFT JOIN alliance_touches t ON t.campaign_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT 100`
    );
    res.json({ campaigns: result.rows });
  } catch (error) {
    console.error('Alliance campaign list failed:', error);
    res.status(500).json({ error: 'Failed to load AllianceOS campaigns.' });
  }
});

router.get('/campaigns/:id', async (req, res) => {
  try {
    const readiness = await getCampaignReadiness(db, req.params.id);
    if (!readiness) return res.status(404).json({ error: 'Campaign not found.' });
    const touches = await db.query(
      `SELECT touch_no, channel, status, COUNT(*)::int AS count
       FROM alliance_touches WHERE campaign_id = $1
       GROUP BY touch_no, channel, status ORDER BY touch_no, channel, status`,
      [req.params.id]
    );
    const failures = await db.query(
      `SELECT t.id, t.touch_no, t.error_message, p.email, p.business_name
       FROM alliance_touches t JOIN alliance_prospects p ON p.id = t.prospect_id
       WHERE t.campaign_id = $1 AND t.status = 'failed'
       ORDER BY t.id DESC LIMIT 20`,
      [req.params.id]
    );
    const deliveries = await db.query(
      `SELECT t.id, t.touch_no, t.status, t.sent_at, t.provider_message_id,
              p.email, p.business_name, e.event_payload
       FROM alliance_touches t
       JOIN alliance_prospects p ON p.id = t.prospect_id
       LEFT JOIN LATERAL (
         SELECT event_payload FROM alliance_email_events
         WHERE touch_id = t.id AND event_type = 'sent' ORDER BY id DESC LIMIT 1
       ) e ON TRUE
       WHERE t.campaign_id = $1 AND t.channel = 'email' AND t.status = 'sent'
       ORDER BY t.sent_at DESC LIMIT 20`,
      [req.params.id]
    );
    res.json({ ...readiness, touches: touches.rows, failures: failures.rows, deliveries: deliveries.rows });
  } catch (error) {
    console.error('Alliance campaign detail failed:', error);
    res.status(500).json({ error: 'Failed to load campaign details.' });
  }
});

router.post('/campaigns/:id/start', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT id FROM alliance_campaigns WHERE id = $1 FOR UPDATE`, [req.params.id]);
    const readiness = await getCampaignReadiness(client, req.params.id);
    if (!readiness) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Campaign not found.' });
    }
    if (!readiness.ready) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Campaign is not ready to start.', readiness });
    }
    if (!['draft', 'ready', 'paused'].includes(readiness.campaign.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Campaign cannot start from ${readiness.campaign.status} status.` });
    }

    const resuming = readiness.campaign.status === 'paused';
    if (resuming) {
      await client.query(
        `UPDATE alliance_touches SET status = 'scheduled', error_message = NULL
         WHERE campaign_id = $1 AND status = 'paused' AND sent_at IS NULL`,
        [req.params.id]
      );
    } else {
      await client.query(
        `INSERT INTO alliance_touches (prospect_id, campaign_id, touch_no, channel, subject, message_body, status, scheduled_at)
         SELECT p.id, cp.campaign_id, 1, CASE WHEN c.channel = 'auto' THEN p.channel ELSE c.channel END,
                COALESCE(ct.subject, template.subject), COALESCE(ct.body, template.body), 'scheduled', NOW()
         FROM alliance_campaign_prospects cp
         JOIN alliance_prospects p ON p.id = cp.prospect_id
         JOIN alliance_campaigns c ON c.id = cp.campaign_id
         LEFT JOIN alliance_campaign_templates ct ON ct.campaign_id = cp.campaign_id AND ct.touch_no = 1 AND c.channel = 'email'
         LEFT JOIN alliance_templates template
           ON template.audience = p.audience AND template.channel = (CASE WHEN c.channel = 'auto' THEN p.channel ELSE c.channel END) AND template.touch_no = 1 AND template.active = TRUE
         WHERE cp.campaign_id = $1 AND p.suppressed = FALSE
         ON CONFLICT (campaign_id, prospect_id, touch_no) DO NOTHING`,
        [req.params.id]
      );
    }
    await client.query(
      `UPDATE alliance_prospects p SET status = 'in_sequence', updated_at = NOW()
       FROM alliance_campaign_prospects cp
       WHERE cp.campaign_id = $1 AND cp.prospect_id = p.id AND p.suppressed = FALSE`,
      [req.params.id]
    );
    await client.query(`UPDATE alliance_campaign_prospects SET enrollment_status = 'in_sequence' WHERE campaign_id = $1 AND enrollment_status <> 'stopped'`, [req.params.id]);
    await client.query(`UPDATE alliance_campaigns SET status = 'running', started_at = COALESCE(started_at, NOW()) WHERE id = $1`, [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, resumed: resuming, message: resuming ? 'Campaign resumed. Only unsent paused touches were restored.' : 'Campaign started and first touches scheduled.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Alliance campaign start failed:', error);
    res.status(500).json({ error: 'Failed to start campaign.' });
  } finally {
    client.release();
  }
});

router.post('/campaigns/:id/pause', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE alliance_campaigns SET status = 'paused' WHERE id = $1 AND status = 'running' RETURNING id`,
      [req.params.id]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only a running campaign can be paused.' });
    }
    await client.query(`UPDATE alliance_touches SET status = 'paused' WHERE campaign_id = $1 AND status = 'scheduled'`, [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Campaign paused. Scheduled touches will not send.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Alliance campaign pause failed:', error);
    res.status(500).json({ error: 'Failed to pause campaign.' });
  } finally {
    client.release();
  }
});

router.post('/campaigns/:id/stop', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE alliance_campaigns SET status = 'cancelled', completed_at = NOW()
       WHERE id = $1 AND status IN ('draft','ready','running','paused') RETURNING id`,
      [req.params.id]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This campaign cannot be stopped from its current status.' });
    }
    await client.query(
      `UPDATE alliance_touches SET status = 'cancelled', error_message = 'Campaign stopped by user.'
       WHERE campaign_id = $1 AND status IN ('scheduled','paused') AND sent_at IS NULL`,
      [req.params.id]
    );
    await client.query(
      `UPDATE alliance_campaign_prospects
       SET enrollment_status = 'stopped', stopped_at = NOW(), stop_reason = 'campaign_stopped'
       WHERE campaign_id = $1 AND enrollment_status <> 'completed'`,
      [req.params.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Campaign stopped permanently. All unsent touches were cancelled.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Alliance campaign stop failed:', error);
    res.status(500).json({ error: 'Failed to stop campaign.' });
  } finally {
    client.release();
  }
});

router.post('/campaigns/:id/test-email', async (req, res) => {
  try {
    const recipient = normalizeEmail(req.body.email);
    const touchNo = Math.min(Math.max(Number(req.body.touch_no) || 1, 1), 4);
    if (!recipient) return res.status(400).json({ error: 'Enter a valid test email address.' });
    const result = await db.query(
      `SELECT c.id AS campaign_id, c.name AS campaign_name, c.audience, c.sender_domain_id,
              d.inbox_email, d.status AS sender_status,
              COALESCE(ct.subject, t.subject) AS subject, COALESCE(ct.body, t.body) AS body,
              p.id AS prospect_id, p.name, p.business_name, p.location
       FROM alliance_campaigns c
       JOIN alliance_domains d ON d.id = c.sender_domain_id
       LEFT JOIN alliance_campaign_templates ct ON ct.campaign_id = c.id AND ct.touch_no = $2
       LEFT JOIN alliance_templates t ON t.audience = c.audience AND t.channel = 'email' AND t.touch_no = $2 AND t.active = TRUE
       LEFT JOIN LATERAL (
         SELECT p.* FROM alliance_campaign_prospects cp
         JOIN alliance_prospects p ON p.id = cp.prospect_id
         WHERE cp.campaign_id = c.id ORDER BY cp.created_at LIMIT 1
       ) p ON TRUE
       WHERE c.id = $1`,
      [req.params.id, touchNo]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Campaign not found.' });
    const preview = result.rows[0];
    if (preview.sender_status !== 'active') return res.status(409).json({ error: 'Activate the selected email sender before testing.' });
    if (!preview.subject || !preview.body) return res.status(409).json({ error: `Touch ${touchNo} template is not configured.` });
    const replace = (value) => String(value || '')
      .replace(/\{\{name\}\}/gi, preview.name || 'Test Contact')
      .replace(/\{\{org\}\}/gi, preview.business_name || 'Test Organisation')
      .replace(/\{\{location\}\}/gi, preview.location || 'Test Location');
    const subject = `[TEST] ${replace(preview.subject)}`;
    const body = replace(preview.body);
    const html = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const config = getAllianceEmailConfig();
    if (String(config.from).toLowerCase() !== String(preview.inbox_email).toLowerCase()) {
      return res.status(409).json({ error: 'Selected sender does not match ALLIANCE_EMAIL_FROM.' });
    }
    const sent = await createAllianceEmailTransport().sendMail({
      from: { name: config.fromName, address: config.from }, to: recipient,
      replyTo: config.replyTo, subject, text: body,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${html}</div>`,
      headers: { 'X-Alliance-Test': 'true' },
    });
    await db.query(
      `INSERT INTO alliance_email_events (campaign_id, prospect_id, provider_message_id, event_type, event_payload)
       VALUES ($1,$2,$3,'test_sent',$4::jsonb)`,
      [preview.campaign_id, preview.prospect_id || null, sent.messageId || null,
        JSON.stringify({ recipient, touch_no: touchNo, accepted: sent.accepted, rejected: sent.rejected, response: sent.response })]
    );
    res.json({ success: true, message: `Test touch ${touchNo} submitted to Zoho for ${recipient}.`, provider_message_id: sent.messageId || null });
  } catch (error) {
    console.error('Alliance campaign test email failed:', error.response || error.message);
    res.status(502).json({ error: error.response || error.message || 'Failed to send test email.' });
  }
});

module.exports = router;
