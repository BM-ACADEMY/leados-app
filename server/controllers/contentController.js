// server/controllers/contentController.js
// All Content OS approval-dashboard logic + SQL.
// Source of truth: the content_queue table. No mock data anywhere.

const pool = require("../db/connection"); // reuse your existing LeadOS pool if you have one
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.OPENAI_API_KEY || "dummy_key" });
const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Jimp = require("jimp");
const { google } = require("googleapis");
const cryptoHelper = require("../utils/crypto");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
ffmpeg.setFfmpegPath(ffmpegPath);


function extractDriveFileId(url) {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function getGoogleAuth(scopes = ['https://www.googleapis.com/auth/drive.readonly']) {
  const credPath = path.join(__dirname, '../credentials/jobportal-492311-465d0e8c2633.json');
  
  if (fs.existsSync(credPath)) {
    return new google.auth.GoogleAuth({
      keyFile: credPath,
      scopes
    });
  }
  
  const envCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_CREDS_JSON;
  if (envCreds) {
    try {
      const credentials = typeof envCreds === 'string' ? JSON.parse(envCreds) : envCreds;
      return new google.auth.GoogleAuth({
        credentials,
        scopes
      });
    } catch (e) {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON from environment:", e.message);
    }
  }
  
  return null;
}

async function downloadDriveFileServiceAccount(fileId, destPath) {
  const auth = getGoogleAuth();
  if (!auth) {
    throw new Error('Google Drive credentials are not available (neither credentials file nor environment variable is set).');
  }
  const drive = google.drive({ version: 'v3', auth });
  
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

function transcodeVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-map 0:v',
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-r 30',
        '-pix_fmt yuv420p',
        '-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
        '-map 0:a?',
        '-c:a aac',
        '-b:a 128k',
        '-ac 2'
      ])
      .output(outputPath)
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(1)
      .frames(1)
      .output(outputPath)
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        '-vn',
        '-acodec libmp3lame',
        '-b:a 64k',
        '-ac 1',
        '-ar 16000'
      ])
      .output(audioPath)
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

async function fetchDriveVideoName(url) {
  const fileId = extractDriveFileId(url);
  if (!fileId) return "Social Media Video";
  try {
    const auth = getGoogleAuth();
    if (!auth) {
      throw new Error('Google Drive credentials are not available.');
    }
    const drive = google.drive({ version: 'v3', auth });
    const res = await drive.files.get({
      fileId,
      fields: 'name'
    });
    let title = res.data.name || "Social Media Video";
    title = title.replace(/\.(mp4|mov|avi|mkv|wmv|flv|webm)$/i, "");
    return title;
  } catch (err) {
    console.error("Failed to fetch Google Drive metadata via service account:", err.message);
  }
  return "Social Media Video";
}




// Columns the dashboard needs. Keep in sync with the JSX.
const CONTENT_COLUMNS = `
  id, brand_name, file_name, video_url, public_video_url, thumbnail_url,
  caption, x_caption, linkedin_caption, thumbnail_title,
  story_1, story_2, story_3,
  platforms, selected_accounts, scheduled_at, status,
  approved_by, approved_at, rejected_by, rejected_at, rejection_reason,
  error_message, created_at, description, hashtags, thumbnail_options,
  key_moments, drive_file_id, brand_id, video_name
`;

// ---------------------------------------------------------------
// GET /api/content?status=PENDING|APPROVED|REJECTED|ALL
// Supports filtering by search query, brand, and date ranges.
// ---------------------------------------------------------------
async function getContent(req, res) {
  try {
    const status = req.query.status || "pending_approval";
    const { search, brand, startDate, endDate, limit = 200, offset = 0 } = req.query;

    let query = `SELECT ${CONTENT_COLUMNS} FROM content_queue WHERE 1=1`;
    const params = [];

    if (status !== "all" && status !== "ALL") {
      if (status.toLowerCase() === "published") {
        query += ` AND status IN ('published', 'PUBLISHED', 'partial', 'PARTIAL')`;
      } else if (status.toLowerCase() === "failed") {
        query += ` AND status IN ('failed', 'FAILED', 'partial', 'PARTIAL')`;
      } else {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
    }

    if (brand && brand !== "All Brands" && brand !== "all") {
      params.push(`%${brand}%`);
      query += ` AND brand_name ILIKE $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (thumbnail_title ILIKE $${params.length} OR brand_name ILIKE $${params.length} OR caption ILIKE $${params.length} OR file_name ILIKE $${params.length})`;
    }

    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND created_at BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, params);
    
    // Dynamically resolve localhost/relative paths to the current public base URL of the incoming request
    const resolvedItems = rows.map(item => ({
      ...item,
      public_video_url: resolvePublicUrl(item.public_video_url, req),
      thumbnail_url: resolvePublicUrl(item.thumbnail_url, req)
    }));

    res.json({ success: true, items: resolvedItems });
  } catch (err) {
    console.error("getContent error:", err);
    res.status(500).json({ success: false, error: "Failed to load content" });
  }
}

// ---------------------------------------------------------------
// GET /api/content/stats
// Returns: total, pending, published_today, failed_today
// ---------------------------------------------------------------
async function getStats(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'pending_approval'))::int AS pending,
        COUNT(*) FILTER (WHERE status IN ('APPROVED', 'approved'))::int AS approved,
        COUNT(*) FILTER (WHERE status IN ('REJECTED', 'rejected'))::int AS rejected,
        COUNT(*) FILTER (WHERE status IN ('PUBLISHED', 'published', 'PARTIAL', 'partial')
                         AND published_at::date = CURRENT_DATE)::int AS published_today,
        COUNT(*) FILTER (WHERE status IN ('FAILED', 'failed', 'PARTIAL', 'partial')
                         AND COALESCE(failed_at, created_at)::date = CURRENT_DATE)::int AS failed_today
      FROM content_queue
    `);
    res.json({ success: true, stats: rows[0] });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ success: false, error: "Failed to load stats" });
  }
}

// ---------------------------------------------------------------
// POST /api/content/:id/approve
// Body (optional): { approved_by: "Kamar" }
// ---------------------------------------------------------------
async function approveContent(req, res) {
  const { id } = req.params;
  const approvedBy = (req.body && req.body.approved_by) || "Kamar";
  try {
    const { rows } = await pool.query(
      `UPDATE content_queue
         SET status = 'approved', approved_by = $2, approved_at = NOW()
       WHERE id = $1 AND status IN ('PENDING', 'pending_approval')
       RETURNING id, brand_name, status`,
      [id, approvedBy]
    );

    if (rows.length === 0) {
      return res.status(409).json({ success: false, error: "Item not found or not in pending state" });
    }



    res.json({ success: true, item: rows[0] });
  } catch (err) {
    console.error("approveContent error:", err);
    res.status(500).json({ success: false, error: "Failed to approve" });
  }
}

// ---------------------------------------------------------------
// POST /api/content/:id/reject
// Body (optional): { rejected_by, rejection_reason }
// ---------------------------------------------------------------
async function rejectContent(req, res) {
  const { id } = req.params;
  const rejectedBy = (req.body && req.body.rejected_by) || "Kamar";
  const reason = (req.body && req.body.rejection_reason) || null;
  try {
    const { rows } = await pool.query(
      `UPDATE content_queue
         SET status = 'rejected', rejected_by = $2, rejected_at = NOW(), rejection_reason = $3
       WHERE id = $1 AND status IN ('PENDING', 'pending_approval')
       RETURNING id, brand_name, status`,
      [id, rejectedBy, reason]
    );

    if (rows.length === 0) {
      return res.status(409).json({ success: false, error: "Item not found or not in pending state" });
    }
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    console.error("rejectContent error:", err);
    res.status(500).json({ success: false, error: "Failed to reject" });
  }
}

// ---------------------------------------------------------------
// PATCH /api/content/:id
// Saves caption/schedule/platform edits from the dashboard edit mode.
// ---------------------------------------------------------------
async function updateContent(req, res) {
  const { id } = req.params;
  const allowed = [
    "caption", "x_caption", "linkedin_caption", "thumbnail_title", "scheduled_at", 
    "platforms", "selected_channels", "selected_accounts", "video_url", "public_video_url", "description", "hashtags", 
    "thumbnail_options", "key_moments", "thumbnail_url", "brand_id", "video_name", "status",
    "story_1", "story_2", "story_3"
  ];
  const sets = [];
  const params = [id];
  let i = 2;

  // Keep platforms and selected_channels in sync
  if (req.body.platforms !== undefined && req.body.selected_channels === undefined) {
    req.body.selected_channels = req.body.platforms;
  } else if (req.body.selected_channels !== undefined && req.body.platforms === undefined) {
    req.body.platforms = req.body.selected_channels;
  }

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      const isJson = ["platforms", "selected_channels", "selected_accounts", "thumbnail_options", "key_moments"].includes(key);
      let val = isJson ? JSON.stringify(req.body[key]) : req.body[key];
      
      // Convert empty timestamp string to null
      if (key === "scheduled_at" && val === "") {
        val = null;
      }
      
      sets.push(`${key} = $${i}${isJson ? "::jsonb" : ""}`);
      params.push(val);
      i++;
    }
  }

  if (sets.length === 0) {
    return res.status(400).json({ success: false, error: "No editable fields provided" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE content_queue SET ${sets.join(", ")} WHERE id = $1 RETURNING ${CONTENT_COLUMNS}`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Item not found" });
    
    // Dynamically resolve localhost/relative paths to the current public base URL of the incoming request
    const item = rows[0];
    const resolvedItem = {
      ...item,
      public_video_url: resolvePublicUrl(item.public_video_url, req),
      thumbnail_url: resolvePublicUrl(item.thumbnail_url, req)
    };

    res.json({ success: true, item: resolvedItem });
  } catch (err) {
    console.error("updateContent error:", err);
    res.status(500).json({ success: false, error: "Failed to update" });
  }
}

// ---------------------------------------------------------------
// GET /api/content/social-accounts
// Fetch active brand social accounts (relocated here to unify Content OS APIs)
// ---------------------------------------------------------------
async function getSocialAccounts(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM brand_social_accounts WHERE is_active = true ORDER BY brand_name, platform"
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch social accounts error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}

const BRAND_VOICES = {
  "BM Academy": {
    tag: "Learn with Kamar",
    voice: "Tamil-English mix (Tanglish), energetic, student-focused. Hooks: '3 மாதத்தில் job', '20% refund if not placed'. CTA: WhatsApp 94038 92971. Audience: college students, freshers, career switchers in TN/Pondicherry."
  },
  "BM TechX": {
    tag: "Grow with Kamar",
    voice: "Professional yet local, ROI-focused. For SMEs. Stats: 750+ businesses, ₹50Cr+ revenue. Services: LeadOS, Meta Ads, GMB, SEO. CTA: WhatsApp 99442 88271."
  },
  "Namma Pondy Properties": {
    tag: "Invest with Confidence",
    voice: "Trust-building, investment-focused. NEVER use 'farmland' — always 'Chennai-Pondicherry Growth Corridor investment'. ₹999/sq.ft. Urgency: limited plots, price hike. Push site visits."
  },
  "Dada's Kitchen": {
    tag: "Taste the Tradition",
    voice: "Warm, appetizing, family-oriented. Firewood cooking, authentic Tamil cuisine. For weddings, events, corporate. Push bulk orders and early booking."
  },
  "ABM Groups": {
    tag: "Integrity & Excellence",
    voice: "Corporate, group-level overview, trust-focused, diversified business portfolio in TN and Pondicherry."
  }
};

// ---------------------------------------------------------------
// POST /api/content/generate-captions
// Generates platform-specific captions via Groq AI
// ---------------------------------------------------------------
async function generateCaptions(req, res) {
  const { brand_name, topic, video_url, platforms } = req.body;
  
  if (!brand_name || (!topic && !video_url) || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ success: false, error: "Missing required fields: brand_name, platforms, and either topic or video_url" });
  }

  let inferredTopic = topic || "";
  let extractedTitle = "Social Media Video";
  let transcript = "";

  if (video_url) {
    extractedTitle = await fetchDriveVideoName(video_url);
    const fileId = extractDriveFileId(video_url);
    if (fileId) {
      const tempFilePath = path.join(os.tmpdir(), `drive_video_${fileId}.mp4`);
      const tempAudioPath = path.join(os.tmpdir(), `drive_audio_${fileId}.mp3`);
      try {
        console.log(`Downloading Google Drive video ${fileId}...`);
        await downloadDriveFileServiceAccount(fileId, tempFilePath);
        
        console.log("Extracting audio from video for Whisper...");
        await extractAudio(tempFilePath, tempAudioPath);
        
        console.log("Transcribing video audio via Groq Whisper...");
        const transcriptionResult = await groq.audio.transcriptions.create({
          file: fs.createReadStream(tempAudioPath),
          model: "whisper-large-v3"
        });
        
        transcript = transcriptionResult.text || "";
        console.log("Transcription successful:", transcript);
      } catch (transcribeErr) {
        console.error("Transcription failed, falling back to filename context:", transcribeErr.message);
      } finally {
        if (fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (unlinkErr) {
            console.error("Failed to delete temp file:", unlinkErr);
          }
        }
        if (fs.existsSync(tempAudioPath)) {
          try {
            fs.unlinkSync(tempAudioPath);
          } catch (unlinkErr) {
            console.error("Failed to delete temp audio file:", unlinkErr);
          }
        }
      }
    }
  }

  if (transcript) {
    inferredTopic = inferredTopic 
      ? `${inferredTopic} (Video Transcript: "${transcript}")`
      : `Video Transcript: "${transcript}"`;
  } else {
    inferredTopic = inferredTopic
      ? `${inferredTopic} (Video Title: ${extractedTitle})`
      : `Video Title: ${extractedTitle}`;
  }

  const brandInfo = BRAND_VOICES[brand_name] || { tag: brand_name, voice: `Professional voice for ${brand_name}` };
  
  const platformList = platforms.map(p => {
    const mapping = {
      instagram: "Instagram",
      facebook: "Facebook",
      linkedin: "LinkedIn",
      x_twitter: "X (Twitter)",
      youtube: "YouTube"
    };
    return mapping[p.toLowerCase()] || p;
  }).join(", ");

  const prompt = `You are the social media content writer for "${brand_name}" (${brandInfo.tag}).

BRAND VOICE GUIDE:
${brandInfo.voice}

VIDEO TRANSCRIPT OR CONTEXT:
${inferredTopic}

Generate ONE caption for EACH of these platforms: ${platformList}.

Rules:
- For Instagram / Facebook: Use emojis, Tanglish (Tamil-English mix) where the brand voice guide indicates, strong hook + CTA. 3-5 lines.
- For LinkedIn: Professional, no excessive emojis, English. 2-4 lines.
- For X (Twitter): Punchy, under 240 characters.
- For YouTube: Title-style + short description.
- Match the brand voice guide exactly.
- Do NOT use markdown code blocks. Do NOT output any conversational text before or after the JSON.
- Respond ONLY with a valid JSON array matching this format:
[
  {"platform": "instagram", "caption": "..."},
  {"platform": "facebook", "caption": "..."}
]`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.choices[0].message.content.trim();
    const result = JSON.parse(content);
    
    const arrayResult = Array.isArray(result) ? result : (result.results || result.captions || Object.values(result)[0]);
    if (!Array.isArray(arrayResult)) {
      throw new Error("Response is not an array");
    }

    res.json({ 
      success: true, 
      results: arrayResult, 
      video_title: extractedTitle,
      transcript: transcript || null
    });
  } catch (err) {
    console.error("generateCaptions error:", err);
    res.status(500).json({ success: false, error: "AI caption generation failed: " + err.message });
  }
}

// ---------------------------------------------------------------
// POST /api/content/batch
// Create multiple content queue items
// ---------------------------------------------------------------
async function createBatchContent(req, res) {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, error: "Invalid items format" });
  }
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const created = [];
    const { rows: allClients } = await client.query("SELECT name FROM clients");
    const BRAND_NAME_TO_SLUG = {};
    for (const c of allClients) {
      const known = {
        "BM Academy": "bm_academy",
        "BM TechX": "bm_techx",
        "Namma Pondy Properties": "namma_pondy_properties",
        "Dada's Kitchen": "dadas_kitchen",
        "ABM Groups": "abm_groups"
      };
      BRAND_NAME_TO_SLUG[c.name] = known[c.name] || c.name.toLowerCase()
        .replace(/'/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    for (const item of items) {
      const { brand_name, platforms, selected_accounts, caption, x_caption, linkedin_caption, thumbnail_title, scheduled_at, file_name } = item;
      const brand_id = BRAND_NAME_TO_SLUG[brand_name] || brand_name.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

      const { rows } = await client.query(`
        INSERT INTO content_queue (
          brand_name, platforms, selected_accounts, caption, x_caption, linkedin_caption, thumbnail_title, scheduled_at, file_name, status,
          brand_id, video_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_approval', $10, $11)
        RETURNING *
      `, [
        brand_name,
        platforms ? JSON.stringify(platforms) : '[]',
        selected_accounts ? JSON.stringify(selected_accounts) : '{}',
        caption || '',
        x_caption || '',
        linkedin_caption || '',
        thumbnail_title || '',
        scheduled_at || null,
        file_name || 'pending_upload.mp4',
        brand_id,
        file_name || 'pending_upload.mp4'
      ]);
      created.push(rows[0]);
    }
    await client.query("COMMIT");
    res.status(201).json({ success: true, items: created });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createBatchContent error:", err);
    res.status(500).json({ success: false, error: "Failed to create content batch" });
  } finally {
    client.release();
  }
}

async function getFolderMonitors(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT brand_slug AS "brandSlug", folder_id AS "folderId" 
       FROM drive_folder_monitors 
       WHERE is_active = true 
       ORDER BY brand_slug`
    );
    res.json(rows);
  } catch (err) {
    console.error("getFolderMonitors error:", err);
    res.status(500).json({ error: "Failed to retrieve monitors" });
  }
}

async function upsertFolderMonitor(req, res) {
  const { brandSlug, folderId } = req.body;
  if (!brandSlug || !folderId) {
    return res.status(400).json({ error: "Missing required fields: brandSlug, folderId" });
  }
  try {
    await pool.query(
      `INSERT INTO drive_folder_monitors (brand_slug, folder_id, last_checked_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (brand_slug) DO UPDATE SET folder_id = $2, last_checked_at = NOW()`,
      [brandSlug, folderId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("upsertFolderMonitor error:", err);
    res.status(500).json({ error: "Failed to save monitor" });
  }
}

async function checkNewDriveVideos() {
  console.log("DrivePoller: Checking Google Drive folders for new videos...");
  const auth = getGoogleAuth();
  if (!auth) {
    console.warn(`DrivePoller: Google Drive credentials not found. Ingestion skipped.`);
    return;
  }

  try {
    const drive = google.drive({ version: 'v3', auth });

    const { rows: monitors } = await pool.query("SELECT brand_slug, folder_id FROM drive_folder_monitors WHERE is_active = true");
    
    const { rows: allClients } = await pool.query("SELECT name FROM clients");
    const SLUG_TO_BRAND = {};
    for (const c of allClients) {
      const known = {
        "BM Academy": "bm_academy",
        "BM TechX": "bm_techx",
        "Namma Pondy Properties": "namma_pondy_properties",
        "Dada's Kitchen": "dadas_kitchen",
        "ABM Groups": "abm_groups"
      };
      const slug = known[c.name] || c.name.toLowerCase()
        .replace(/'/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      SLUG_TO_BRAND[slug] = c.name;
    }

    for (const monitor of monitors) {
      const { brand_slug, folder_id } = monitor;
      const brand_name = SLUG_TO_BRAND[brand_slug] || brand_slug;
      console.log(`DrivePoller: Querying folder ${folder_id} for ${brand_name} (${brand_slug})...`);
      
      let files = [];
      try {
        const res = await drive.files.list({
          q: `'${folder_id}' in parents and mimeType contains 'video' and trashed = false`,
          fields: 'files(id, name, mimeType, createdTime)'
        });
        files = res.data.files || [];
      } catch (reqErr) {
        console.error(`DrivePoller: Failed to fetch files for folder ${folder_id}:`, reqErr.message);
        continue;
      }

      console.log(`DrivePoller: Found ${files.length} videos in folder.`);

      // Soft-delete: check for files deleted from Google Drive
      const currentDriveFileIds = new Set(files.map(f => f.id));
      const { rows: dbPendingFiles } = await pool.query(
        "SELECT id, drive_file_id, file_name FROM content_queue WHERE brand_id = $1 AND drive_file_id IS NOT NULL AND status IN ('pending_approval', 'draft')",
        [brand_slug]
      );
      for (const dbFile of dbPendingFiles) {
        if (!currentDriveFileIds.has(dbFile.drive_file_id)) {
          console.log(`DrivePoller: File ${dbFile.file_name} (ID: ${dbFile.drive_file_id}) was deleted from Google Drive. Marking status as 'deleted_from_drive'.`);
          await pool.query(
            "UPDATE content_queue SET status = 'deleted_from_drive', updated_at = NOW() WHERE id = $1",
            [dbFile.id]
          );
        }
      }

      for (const file of files) {
        // Check if already ingested
        const { rows: existing } = await pool.query(
          "SELECT id, status FROM content_queue WHERE drive_file_id = $1",
          [file.id]
        );
        if (existing.length > 0) {
          const dbItem = existing[0];
          if (dbItem.status === 'deleted_from_drive') {
            console.log(`DrivePoller: File ${file.name} (ID: ${file.id}) was restored in Google Drive. Re-activating as 'pending_approval'.`);
            await pool.query(
              "UPDATE content_queue SET status = 'pending_approval', updated_at = NOW() WHERE id = $1",
              [dbItem.id]
            );
          }
          continue; // Already processed
        }

        console.log(`DrivePoller: New video detected: ${file.name} (ID: ${file.id})`);
        
        // 1. Download video
        const tempFilePath = path.join(os.tmpdir(), `drive_video_${file.id}.mp4`);
        const tempAudioPath = path.join(os.tmpdir(), `drive_audio_${file.id}.mp3`);
        let transcript = "";
        const videoUrl = `https://drive.google.com/file/d/${file.id}/view`;
        let publicVideoUrl = videoUrl; // Default fallback to Drive link
        let publicThumbnailUrl = null;
 
        try {
          await downloadDriveFileServiceAccount(file.id, tempFilePath);
          
          // 2. Transcribe video audio
          console.log("DrivePoller: Transcribing video audio via Groq Whisper...");
          try {
            console.log("DrivePoller: Extracting audio from video for Whisper...");
            await extractAudio(tempFilePath, tempAudioPath);

            const transcriptionResult = await groq.audio.transcriptions.create({
              file: fs.createReadStream(tempAudioPath),
              model: "whisper-large-v3"
            });
            transcript = transcriptionResult.text || "";
            console.log(`DrivePoller: Transcription success (${transcript.length} chars).`);
          } catch (transcribeErr) {
            console.warn(`DrivePoller: Whisper transcription failed:`, transcribeErr.message);
          }

          // 2b. Transcode to Instagram-compliant format
          console.log("DrivePoller: Normalizing video to IG-compliant H.264 / AAC / 9:16...");
          try {
            const localTranscodedPath = path.join(__dirname, '../uploads', `transcoded_${file.id}.mp4`);
            await transcodeVideo(tempFilePath, localTranscodedPath);
            const baseUrl = process.env.API_BASE_URL || 'https://leados-api.abmgroups.org';
            publicVideoUrl = `${baseUrl}/uploads/transcoded_${file.id}.mp4`;
            console.log(`DrivePoller: Transcoding succeeded! Public URL: ${publicVideoUrl}`);

            // Generate thumbnail
            console.log("DrivePoller: Generating video thumbnail...");
            try {
              const localThumbnailPath = path.join(__dirname, '../uploads', `thumbnail_${file.id}.jpg`);
              await generateThumbnail(localTranscodedPath, localThumbnailPath);
              publicThumbnailUrl = `${baseUrl}/uploads/thumbnail_${file.id}.jpg`;
              console.log(`DrivePoller: Thumbnail generated! Public URL: ${publicThumbnailUrl}`);
            } catch (thumbErr) {
              console.warn(`DrivePoller: Thumbnail generation failed:`, thumbErr.message);
            }
          } catch (transcodeErr) {
            console.warn(`DrivePoller: Transcoding failed (falling back to Drive download URL):`, transcodeErr.message);
            
            // Attempt to generate thumbnail from downloaded temp file
            console.log("DrivePoller: Generating video thumbnail from temp file...");
            try {
              const localThumbnailPath = path.join(__dirname, '../uploads', `thumbnail_${file.id}.jpg`);
              await generateThumbnail(tempFilePath, localThumbnailPath);
              const baseUrl = process.env.API_BASE_URL || 'https://leados-api.abmgroups.org';
              publicThumbnailUrl = `${baseUrl}/uploads/thumbnail_${file.id}.jpg`;
              console.log(`DrivePoller: Thumbnail generated from temp file! Public URL: ${publicThumbnailUrl}`);
            } catch (thumbErr) {
              console.warn(`DrivePoller: Thumbnail generation from temp file failed:`, thumbErr.message);
            }
          }

        } catch (downloadErr) {
          console.warn(`DrivePoller: Failed to download file ${file.id}:`, downloadErr.message);
        } finally {
          // Clean up temp files
          if (fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
            } catch (err) {
              console.error("DrivePoller: Failed to unlink temp file:", err.message);
            }
          }
          if (fs.existsSync(tempAudioPath)) {
            try {
              fs.unlinkSync(tempAudioPath);
            } catch (err) {
              console.error("DrivePoller: Failed to unlink temp audio file:", err.message);
            }
          }
        }

        // 3. Generate content via Groq Llama model
        console.log("DrivePoller: Generating brand-voice metadata via LLM...");
        const brandInfo = BRAND_VOICES[brand_name] || { tag: brand_name, voice: `Professional voice for ${brand_name}` };
        
        const prompt = `You are the expert social media content writer for "${brand_name}" (${brandInfo.tag}).
BRAND VOICE GUIDE:
${brandInfo.voice}

Spoken Video Transcript to analyze:
"${transcript || "No speech detected in this video. Generate brand promotion metadata based on the brand voice guide."}"

Generate Title/Caption, Detailed Social Description, Hashtags, 3 Key Moments/Highlights, 3 creative Thumbnail layout/overlay design text descriptions, and 3 Instagram Story slides text (story_1, story_2, story_3) for promoting this video.
Match the brand voice guides exactly (e.g., Tanglish mix for BM Academy).

Respond ONLY with a valid JSON object matching this exact format:
{
  "caption": "Primary brand voice caption with emojis",
  "x_caption": "Twitter/X style caption",
  "linkedin_caption": "LinkedIn professional style caption",
  "description": "A detailed descriptive paragraph summarizing the post content and value",
  "hashtags": "#tag1 #tag2 #tag3",
  "thumbnail_options": [
    { "title": "Thumbnail Title 1", "layout": "Visual layout description 1" },
    { "title": "Thumbnail Title 2", "layout": "Visual layout description 2" },
    { "title": "Thumbnail Title 3", "layout": "Visual layout description 3" }
  ],
  "key_moments": [
    { "time": "00:05", "title": "Moment Hook", "desc": "Hook description" },
    { "time": "00:20", "title": "Key Feature", "desc": "Feature description" },
    { "time": "00:45", "title": "Call to Action", "desc": "CTA description" }
  ],
  "story_1": "Slide 1 text: Engaging hook for Instagram Story",
  "story_2": "Slide 2 text: Key value point or highlight for Instagram Story",
  "story_3": "Slide 3 text: Strong Call to Action (CTA) or next steps for Instagram Story"
}`;

        try {
          const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 1500,
            temperature: 0.7,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: prompt }]
          });

          const content = response.choices[0].message.content.trim();
          const meta = JSON.parse(content);

          const videoUrl = `https://drive.google.com/file/d/${file.id}/view`;
          const defaultPlatforms = ['instagram', 'facebook', 'youtube'];

          // Insert into database
          await pool.query(`
            INSERT INTO content_queue (
              brand_name, file_name, video_url, public_video_url, drive_file_id,
              caption, x_caption, linkedin_caption, description, hashtags,
              thumbnail_options, key_moments, status, thumbnail_title, platforms,
              brand_id, video_name, thumbnail_url, story_1, story_2, story_3
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending_approval', $13, $14, $15, $16, $17, $18, $19, $20)
          `, [
            brand_name,
            file.name,
            videoUrl,
            publicVideoUrl,
            file.id,
            meta.caption || "",
            meta.x_caption || "",
            meta.linkedin_caption || "",
            meta.description || "",
            meta.hashtags || "",
            JSON.stringify(meta.thumbnail_options || []),
            JSON.stringify(meta.key_moments || []),
            meta.thumbnail_options?.[0]?.title || file.name.replace(/\.[^/.]+$/, ""),
            JSON.stringify(defaultPlatforms),
            brand_slug,
            file.name,
            publicThumbnailUrl,
            meta.story_1 || "",
            meta.story_2 || "",
            meta.story_3 || ""
          ]);

          console.log(`DrivePoller: Successfully ingested and staged video: ${file.name}`);
        } catch (llmErr) {
          console.error("DrivePoller: Failed to parse LLM response or save to DB:", llmErr.message);
        }
      }
      
      // Update last checked time
      await pool.query("UPDATE drive_folder_monitors SET last_checked_at = NOW() WHERE brand_slug = $1", [brand_slug]);
    }
  } catch (err) {
    console.error("DrivePoller: Ingestion cron check error:", err.message);
  }
}

function getBrandGradient(brandName) {
  const name = (brandName || "").toLowerCase().trim();
  if (name.includes("academy")) {
    return {
      start: { r: 109, g: 40, b: 217 }, // #6D28D9
      end: { r: 10, g: 5, b: 27 } // #0A051B
    };
  }
  if (name.includes("techx")) {
    return {
      start: { r: 8, g: 145, b: 178 }, // #0891B2
      end: { r: 2, g: 31, b: 40 } // #021F28
    };
  }
  if (name.includes("pondy") || name.includes("properties")) {
    return {
      start: { r: 220, g: 38, b: 38 }, // #DC2626
      end: { r: 36, g: 4, b: 4 } // #240404
    };
  }
  if (name.includes("kitchen") || name.includes("dada")) {
    return {
      start: { r: 217, g: 119, b: 6 }, // #D97706
      end: { r: 39, g: 18, b: 1 } // #271201
    };
  }
  if (name.includes("abm")) {
    return {
      start: { r: 124, g: 58, b: 237 }, // #7C3AED
      end: { r: 13, g: 6, b: 36 } // #0D0624
    };
  }
  return {
    start: { r: 59, g: 130, b: 246 }, // #3B82F6
    end: { r: 5, g: 22, b: 48 } // #051630
  };
}

async function generateStoryCard(postId, slideNum, brandName, slideText, req = null) {
  try {
    const image = new Jimp(1080, 1920, 0x000000FF);
    const colors = getBrandGradient(brandName);

    // Vertical linear gradient
    for (let y = 0; y < 1920; y++) {
      const ratio = y / 1919;
      const r = Math.round(colors.start.r + (colors.end.r - colors.start.r) * ratio);
      const g = Math.round(colors.start.g + (colors.end.g - colors.start.g) * ratio);
      const b = Math.round(colors.start.b + (colors.end.b - colors.start.b) * ratio);
      const color = Jimp.rgbaToInt(r, g, b, 255);
      for (let x = 0; x < 1080; x++) {
        image.setPixelColor(color, x, y);
      }
    }

    // Semi-transparent line
    const lineColor = Jimp.rgbaToInt(255, 255, 255, 60);
    for (let x = 400; x <= 680; x++) {
      image.setPixelColor(lineColor, x, 220);
      image.setPixelColor(lineColor, x, 221);
    }

    // Fonts
    const fontHeader = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const fontBody = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);

    // Header brand name
    const displayBrand = (brandName || 'LEADOS').toUpperCase();
    image.print(
      fontHeader,
      0,
      140,
      {
        text: displayBrand,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      },
      1080,
      100
    );

    // Main text
    image.print(
      fontBody,
      80,
      300,
      {
        text: slideText || '',
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
      },
      920,
      1200
    );

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `story_${postId}_${slideNum}.jpg`;
    const outputPath = path.join(uploadsDir, filename);
    await image.writeAsync(outputPath);

    return resolvePublicUrl(`http://localhost:3500/uploads/${filename}`, req);
  } catch (err) {
    console.error('generateStoryCard error:', err);
    throw err;
  }
}

const healingJobs = new Set();

async function healMissingMedia(driveFileId) {
  if (!driveFileId || healingJobs.has(driveFileId)) return;
  
  healingJobs.add(driveFileId);
  console.log(`[SelfHealing] Initiating media recovery for Drive File ID: ${driveFileId}`);
  
  const tempFilePath = path.join(os.tmpdir(), `heal_video_${driveFileId}.mp4`);
  
  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const transcodedPath = path.join(uploadsDir, `transcoded_${driveFileId}.mp4`);
    const thumbnailPath = path.join(uploadsDir, `thumbnail_${driveFileId}.jpg`);
    
    const transcodeExists = fs.existsSync(transcodedPath);
    const thumbnailExists = fs.existsSync(thumbnailPath);
    
    if (transcodeExists && thumbnailExists) {
      console.log(`[SelfHealing] Both transcoded video and thumbnail already exist on disk for ${driveFileId}.`);
      healingJobs.delete(driveFileId);
      return;
    }
    
    const auth = getGoogleAuth();
    if (!auth) {
      console.warn(`[SelfHealing] Service account credentials not found. Recovery skipped.`);
      healingJobs.delete(driveFileId);
      return;
    }
    
    console.log(`[SelfHealing] Downloading video from Drive: ${driveFileId}...`);
    await downloadDriveFileServiceAccount(driveFileId, tempFilePath);
    
    if (!transcodeExists) {
      console.log(`[SelfHealing] Transcoding video to ${transcodedPath}...`);
      await transcodeVideo(tempFilePath, transcodedPath);
      console.log(`[SelfHealing] Transcoding completed for ${driveFileId}`);
    }
    
    if (!thumbnailExists) {
      console.log(`[SelfHealing] Generating thumbnail to ${thumbnailPath}...`);
      const sourceVideo = fs.existsSync(transcodedPath) ? transcodedPath : tempFilePath;
      await generateThumbnail(sourceVideo, thumbnailPath);
      console.log(`[SelfHealing] Thumbnail generated for ${driveFileId}`);
    }
  } catch (err) {
    console.error(`[SelfHealing] Failed to heal missing media for ${driveFileId}:`, err.message);
  } finally {
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error(`[SelfHealing] Failed to clean up temp file ${tempFilePath}:`, err.message);
      }
    }
    healingJobs.delete(driveFileId);
  }
}

function resolvePublicUrl(url, req = null) {
  if (!url) return null;

  // 1. Google Drive direct link extraction
  const fileId = extractDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  // 2. Determine base URL
  let baseUrl = process.env.API_BASE_URL || 'https://leados-api.abmgroups.org';
  
  // Self-healing: if baseUrl is localhost, but portal is live (only when no request context exists)
  if (!req && baseUrl.includes('localhost') && process.env.PORTAL_URL && process.env.PORTAL_URL.includes('abmgroups.org')) {
    baseUrl = 'https://leados-api.abmgroups.org';
  }

  // Dynamic host overriding if headers contain request context
  if (req) {
    const host = req.headers['x-forwarded-host'] || req.headers['host'] || req.get('host');
    if (host) {
      let protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      // Force https for production domain to prevent Mixed Content blocks
      if (host.includes('abmgroups.org')) {
        protocol = 'https';
      }
      baseUrl = `${protocol}://${host}`;
    }
  }

  // 3. Rewrite any path containing '/uploads/' to use the determined baseUrl
  if (url.includes('/uploads/')) {
    const parts = url.split('/uploads/');
    if (parts.length > 1) {
      const filename = parts[1];
      
      // Auto-heal missing media if transcoded or thumbnail is requested but not on disk
      const transcodedMatch = filename.match(/^transcoded_([a-zA-Z0-9_-]+)\.mp4$/);
      const thumbnailMatch = filename.match(/^thumbnail_([a-zA-Z0-9_-]+)\.jpg$/);
      const healFileId = (transcodedMatch && transcodedMatch[1]) || (thumbnailMatch && thumbnailMatch[1]);
      if (healFileId) {
        const uploadsDir = path.join(__dirname, '../uploads');
        const transcodedPath = path.join(uploadsDir, `transcoded_${healFileId}.mp4`);
        const thumbnailPath = path.join(uploadsDir, `thumbnail_${healFileId}.jpg`);
        
        const transcodedExists = fs.existsSync(transcodedPath);
        const thumbnailExists = fs.existsSync(thumbnailPath);

        if (!transcodedExists || !thumbnailExists) {
          healMissingMedia(healFileId).catch(err => {
            console.error("[SelfHealing] Background healing error:", err);
          });
        }

        // Fallbacks to prevent broken links on the frontend
        if (transcodedMatch && !transcodedExists) {
          // Return the Google Drive link so the dashboard can render it in the iframe preview
          return `https://drive.google.com/file/d/${healFileId}/view`;
        }
        if (thumbnailMatch && !thumbnailExists) {
          // Return a premium abstract placeholder image
          return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80`;
        }
      }

      const cleanBase = baseUrl.replace(/\/+$/, '');
      return `${cleanBase}/uploads/${filename}`;
    }
  }

  return url;
}

// Keep getPublicMediaUrl for backwards compatibility if needed
function getPublicMediaUrl(url) {
  return resolvePublicUrl(url);
}

// Facebook Photo Story Publishing
async function publishPhotoStoryToFacebook(pageId, pageAccessToken, { imageUrl }) {
  try {
    const uploadUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
    const uploadRes = await axios.post(uploadUrl, {
      url: imageUrl,
      published: false,
      access_token: pageAccessToken
    });
    const photoId = uploadRes.data.id;
    if (!photoId) {
      throw new Error("Failed to upload photo story container: no ID returned.");
    }
    console.log(`Facebook photo story upload success: photoId = ${photoId}`);

    const publishUrl = `https://graph.facebook.com/v19.0/${pageId}/photo_stories`;
    const publishRes = await axios.post(publishUrl, {
      photo_id: photoId,
      access_token: pageAccessToken
    });
    return { success: true, post_id: publishRes.data.id || photoId };
  } catch (err) {
    console.error('Facebook photo story publishing failed:', err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || err.message);
  }
}

// Facebook Video Story Publishing
async function publishVideoStoryToFacebook(pageId, pageAccessToken, { videoUrl }) {
  try {
    const initRes = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/video_stories`, {
      upload_phase: 'start',
      access_token: pageAccessToken
    });
    const { video_id, upload_url } = initRes.data;
    if (!video_id || !upload_url) {
      throw new Error("Failed to initialize Facebook video story session.");
    }
    console.log(`Facebook video story session initialized: video_id = ${video_id}`);

    await axios.post(upload_url, null, {
      headers: {
        'file_url': videoUrl,
        'Authorization': `OAuth ${pageAccessToken}`
      }
    });
    console.log(`Facebook video story upload completed for video_id = ${video_id}`);

    const finishRes = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/video_stories`, null, {
      params: {
        upload_phase: 'finish',
        video_id: video_id,
        access_token: pageAccessToken
      }
    });

    return { success: true, post_id: finishRes.data.id || video_id };
  } catch (err) {
    console.error('Facebook video story publishing failed:', err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || err.message);
  }
}

// Facebook Page Publishing
async function publishToFacebookPage(pageId, pageAccessToken, { caption, videoUrl }) {
  try {
    let url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    let params = {
      message: caption,
      access_token: pageAccessToken
    };

    if (videoUrl && (videoUrl.toLowerCase().match(/\.(mp4|mov|avi|mkv|wmv|flv|webm)/) || videoUrl.includes('drive.google.com'))) {
      // For video posts
      url = `https://graph.facebook.com/v19.0/${pageId}/videos`;
      params = {
        description: caption,
        file_url: videoUrl,
        access_token: pageAccessToken
      };
    }

    const res = await axios.post(url, null, { params });
    return { success: true, post_id: res.data.id };
  } catch (err) {
    console.error('Facebook posting failed:', err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || err.message);
  }
}

// Instagram Business Container Creation
async function createInstagramContainer(instagramBusinessId, accessToken, { videoUrl, caption, isStory = false }) {
  const containerUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media`;
  
  // Check if media is video or image
  const isVideo = videoUrl && (videoUrl.toLowerCase().match(/\.(mp4|mov|avi|mkv|wmv|flv|webm)/) || videoUrl.includes('drive.google.com'));
  const params = {
    access_token: accessToken
  };

  if (isStory) {
    params.media_type = 'STORIES';
    if (isVideo) {
      params.video_url = videoUrl;
    } else {
      params.image_url = videoUrl;
    }
  } else {
    params.caption = caption;
    if (isVideo) {
      params.media_type = 'REELS';
      params.video_url = videoUrl;
    } else {
      params.image_url = videoUrl;
    }
  }

  const res = await axios.post(containerUrl, params);
  return res.data.id;
}

// Instagram Poll Container Status
async function waitForInstagramContainer(containerId, accessToken, maxAttempts = 15) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusUrl = `https://graph.facebook.com/v19.0/${containerId}`;
    const res = await axios.get(statusUrl, {
      params: {
        fields: 'status_code',
        access_token: accessToken
      }
    });

    const { status_code } = res.data;
    console.log(`Instagram container ${containerId} check #${attempt}: status_code = ${status_code}`);
    if (status_code === 'FINISHED') {
      return true;
    }
    if (status_code === 'ERROR') {
      throw new Error(`Instagram container failed: Container processing failed.`);
    }

    // Wait 10 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error('Timeout waiting for Instagram media container build.');
}

// Instagram Publish Container
async function publishInstagramContainer(instagramBusinessId, accessToken, containerId) {
  const publishUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media_publish`;
  const res = await axios.post(publishUrl, {
    creation_id: containerId,
    access_token: accessToken
  });
  return res.data.id;
}

// Publish to Instagram Coordinator
async function publishToInstagram(instagramBusinessId, accessToken, { videoUrl, caption, isStory = false }) {
  try {
    const containerId = await createInstagramContainer(instagramBusinessId, accessToken, { videoUrl, caption, isStory });
    await waitForInstagramContainer(containerId, accessToken);
    const mediaId = await publishInstagramContainer(instagramBusinessId, accessToken, containerId);
    return { success: true, post_id: mediaId };
  } catch (err) {
    console.error('Instagram posting failed:', err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || err.message);
  }
}

// POST /api/content/meta/callback
async function handleMetaCallback(req, res) {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'Auth code is required' });
  }

  const appId = process.env.META_APP_ID || '953749850406150';
  const appSecret = process.env.META_APP_SECRET || 'dSSnlAoUGreiJ61yHAU3kSvJ';
  const redirectUri = process.env.META_REDIRECT_URI || `${process.env.PORTAL_URL || 'https://leados-app.abmgroups.org'}/settings/meta-callback`;

  try {
    console.log(`Exchanging code for short-lived token... redirectUri: ${redirectUri}`);
    const shortTokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code
      }
    });
    const shortUserToken = shortTokenRes.data.access_token;

    console.log('Exchanging short-lived token for long-lived user token...');
    const longTokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortUserToken
      }
    });
    const longUserToken = longTokenRes.data.access_token;
    const expiresIn = longTokenRes.data.expires_in || 5184000;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    console.log('Fetching managed Facebook Pages...');
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: {
        access_token: longUserToken,
        fields: 'name,id,access_token'
      }
    });
    const pages = pagesRes.data.data || [];
    const discoveredAccounts = [];

    for (const page of pages) {
      console.log(`Checking connected Instagram account for page ${page.name} (${page.id})...`);
      let igAccount = null;
      try {
        const igRes = await axios.get(`https://graph.facebook.com/v19.0/${page.id}`, {
          params: {
            access_token: page.access_token,
            fields: 'instagram_business_account{id,username,name}'
          }
        });
        igAccount = igRes.data.instagram_business_account || null;
      } catch (igErr) {
        console.warn(`Could not fetch Instagram account for Page ${page.id}:`, igErr.message);
      }

      discoveredAccounts.push({
        facebook: {
          page_id: page.id,
          name: page.name,
          access_token: page.access_token
        },
        instagram: igAccount ? {
          business_id: igAccount.id,
          username: igAccount.username,
          name: igAccount.name,
          access_token: page.access_token
        } : null,
        expires_at: expiresAt
      });
    }

    res.json({ success: true, accounts: discoveredAccounts });
  } catch (err) {
    console.error('Meta OAuth Callback error:', err.response?.data || err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed Meta authentication: ' + (err.response?.data?.error?.message || err.message) 
    });
  }
}

// POST /api/content/meta/link-account
async function linkBrandAccount(req, res) {
  const { brand_name, platform, account_name, account_id, facebook_page_id, instagram_business_id, access_token, expires_at } = req.body;

  if (!brand_name || !platform || !account_name || !access_token) {
    return res.status(400).json({ success: false, error: 'Missing required link details: brand_name, platform, account_name, and access_token' });
  }

  try {
    const encryptedToken = cryptoHelper.encrypt(access_token);
    const expiry = expires_at ? new Date(expires_at) : null;

    const query = `
      INSERT INTO brand_social_accounts 
        (brand_name, platform, account_name, account_id, facebook_page_id, instagram_business_id, access_token, token_expires_at, is_active, created_at)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      ON CONFLICT (brand_name, platform, account_name) 
      DO UPDATE SET 
        account_id = EXCLUDED.account_id,
        facebook_page_id = EXCLUDED.facebook_page_id,
        instagram_business_id = EXCLUDED.instagram_business_id,
        access_token = EXCLUDED.access_token,
        token_expires_at = EXCLUDED.token_expires_at,
        is_active = true
      RETURNING id, brand_name, platform, account_name, account_id, instagram_business_id, facebook_page_id, token_expires_at;
    `;

    const { rows } = await pool.query(query, [
      brand_name, platform, account_name, account_id, facebook_page_id, instagram_business_id, encryptedToken, expiry
    ]);

    res.json({ success: true, account: rows[0] });
  } catch (err) {
    console.error('Link brand account error:', err);
    res.status(500).json({ success: false, error: 'Database saving failed: ' + err.message });
  }
}

// POST /api/content/:id/publish
async function publishPost(req, res) {
  const { id } = req.params;
  try {
    const postRes = await pool.query('SELECT * FROM content_queue WHERE id = $1', [id]);
    if (!postRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Content queue item not found' });
    }
    const post = postRes.rows[0];

    // Fetch or seed publish_queue jobs
    let { rows: jobs } = await pool.query(
      "SELECT * FROM publish_queue WHERE content_id = $1 AND status IN ('pending', 'failed')",
      [post.id]
    );

    if (jobs.length === 0) {
      console.log(`No jobs found in publish_queue for post ID ${post.id}. Initializing from platforms...`);
      let platforms = [];
      
      if (Array.isArray(post.selected_channels) && post.selected_channels.length > 0) {
        platforms = post.selected_channels;
      } else if (typeof post.selected_channels === 'string' && post.selected_channels.trim()) {
        try {
          const parsed = JSON.parse(post.selected_channels);
          if (Array.isArray(parsed) && parsed.length > 0) {
            platforms = parsed;
          }
        } catch (e) {}
      }

      if (platforms.length === 0) {
        if (Array.isArray(post.platforms) && post.platforms.length > 0) {
          platforms = post.platforms;
        } else if (typeof post.platforms === 'string' && post.platforms.trim()) {
          try {
            const parsed = JSON.parse(post.platforms);
            if (Array.isArray(parsed) && parsed.length > 0) {
              platforms = parsed;
            }
          } catch (e) {}
        }
      }

      for (const platform of platforms) {
        let normalizedChannel = platform.toLowerCase();
        if (normalizedChannel === 'instagram') normalizedChannel = 'instagram_post';
        if (normalizedChannel === 'facebook') normalizedChannel = 'facebook_post';

        await pool.query(`
          INSERT INTO publish_queue (content_id, brand_name, channel, status)
          VALUES ($1, $2, $3, 'pending')
          ON CONFLICT (content_id, channel) DO NOTHING
        `, [post.id, post.brand_name, normalizedChannel]);
      }
      const refetch = await pool.query(
        "SELECT * FROM publish_queue WHERE content_id = $1 AND status IN ('pending', 'failed')",
        [post.id]
      );
      jobs = refetch.rows;
    }

    if (!jobs || jobs.length === 0) {
      return res.status(400).json({ success: false, error: 'No platforms selected for this post' });
    }

    const publicUrl = resolvePublicUrl(post.public_video_url || post.video_url, req);
    if (!publicUrl) {
      return res.status(400).json({ success: false, error: 'No video or media URL found for this post' });
    }

    const accountsRes = await pool.query(
      'SELECT * FROM brand_social_accounts WHERE brand_name = $1 AND is_active = true',
      [post.brand_name]
    );
    const accounts = accountsRes.rows;

    const results = [];
    const errors = [];
    const platformPostIds = [];

    for (const job of jobs) {
      const channel = job.channel.toLowerCase();
      
      // Update job status to 'publishing'
      await pool.query("UPDATE publish_queue SET status = 'publishing', updated_at = NOW() WHERE id = $1", [job.id]);

      // Normalize channel name to look up account platform
      let accountPlatform;
      if (channel.includes('instagram')) {
        accountPlatform = 'instagram';
      } else if (channel.includes('facebook')) {
        accountPlatform = 'facebook';
      } else {
        accountPlatform = channel;
      }
      // Parse selected accounts
      let selectedAccIds = null;
      if (post.selected_accounts) {
        try {
          const sel = typeof post.selected_accounts === 'string'
            ? JSON.parse(post.selected_accounts)
            : post.selected_accounts;
          
          if (sel[channel] !== undefined) {
            selectedAccIds = sel[channel];
          } else if (sel[accountPlatform] !== undefined) {
            selectedAccIds = sel[accountPlatform];
          }
        } catch (e) {
          console.warn("Failed to parse selected_accounts JSON:", e.message);
        }
      }

      // If explicitly unchecked (empty array), skip and fail publishing for this channel
      if (selectedAccIds !== null && Array.isArray(selectedAccIds) && selectedAccIds.length === 0) {
        const errMsg = `No accounts were selected for publishing on channel ${channel}`;
        errors.push(errMsg);
        results.push({ platform: channel, status: 'failed', error: errMsg });

        await pool.query(
          "UPDATE publish_queue SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
          [errMsg, job.id]
        );

        await pool.query(
          `INSERT INTO publishing_logs (content_id, brand_name, platform, post_id, status, published_at, metadata)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
          [post.id, post.brand_name, channel, null, 'failed', JSON.stringify({ error: errMsg })]
        );
        continue;
      }

      const account = accounts.find(acc => {
        const isPlatMatch = acc.platform.toLowerCase() === accountPlatform;
        if (!isPlatMatch || !acc.access_token) return false;
        
        if (selectedAccIds && Array.isArray(selectedAccIds) && selectedAccIds.length > 0) {
          return selectedAccIds.includes(acc.account_id) || selectedAccIds.includes(String(acc.account_id));
        }
        return true;
      });

      if (!account) {
        const errMsg = selectedAccIds && Array.isArray(selectedAccIds) && selectedAccIds.length > 0
          ? `Selected social account(s) not found or inactive for brand ${post.brand_name} on platform ${channel}`
          : `No active account or access token found for brand ${post.brand_name} on platform ${channel}`;
        errors.push(errMsg);
        results.push({ platform: channel, status: 'failed', error: errMsg });

        await pool.query(
          "UPDATE publish_queue SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
          [errMsg, job.id]
        );

        await pool.query(
          `INSERT INTO publishing_logs (content_id, brand_name, platform, post_id, status, published_at, metadata)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
          [post.id, post.brand_name, channel, null, 'failed', JSON.stringify({ error: errMsg })]
        );
        continue;
      }

      let decryptedToken;
      try {
        decryptedToken = cryptoHelper.decrypt(account.access_token);
      } catch (decErr) {
        const errMsg = `Token decryption failed for platform ${channel}: ${decErr.message}`;
        errors.push(errMsg);
        results.push({ platform: channel, status: 'failed', error: errMsg });

        await pool.query(
          "UPDATE publish_queue SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
          [errMsg, job.id]
        );

        await pool.query(
          `INSERT INTO publishing_logs (content_id, brand_name, platform, post_id, status, published_at, metadata)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
          [post.id, post.brand_name, channel, null, 'failed', JSON.stringify({ error: errMsg })]
        );
        continue;
      }

      console.log(`Starting publish to ${channel} for brand ${post.brand_name}...`);

      try {
        let publishRes;
        
        // Hashtag integration: Append hashtags to caption if they are available in the post
        const hashtags = post.hashtags ? `\n\n${post.hashtags}` : '';
        const finalCaption = `${post.caption || post.description || ''}${hashtags}`.trim();

        if (channel === 'facebook' || channel === 'facebook_post') {
          if (!account.facebook_page_id) {
            throw new Error(`Facebook Page ID is missing for account ${account.account_name}`);
          }
          publishRes = await publishToFacebookPage(account.facebook_page_id, decryptedToken, {
            caption: finalCaption,
            videoUrl: publicUrl
          });
        } else if (channel === 'instagram' || channel === 'instagram_post') {
          if (!account.instagram_business_id) {
            throw new Error(`Instagram Business ID is missing for account ${account.account_name}`);
          }
          publishRes = await publishToInstagram(account.instagram_business_id, decryptedToken, {
            caption: finalCaption,
            videoUrl: publicUrl,
            isStory: false
          });
        } else if (channel === 'instagram_story') {
          if (!account.instagram_business_id) {
            throw new Error(`Instagram Business ID is missing for account ${account.account_name}`);
          }
          const slides = [];
          if (post.story_1 && post.story_1.trim()) slides.push({ num: 1, text: post.story_1.trim() });
          if (post.story_2 && post.story_2.trim()) slides.push({ num: 2, text: post.story_2.trim() });
          if (post.story_3 && post.story_3.trim()) slides.push({ num: 3, text: post.story_3.trim() });

          if (slides.length > 0) {
            const slidePostIds = [];
            const slideErrors = [];
            
            for (const slide of slides) {
              try {
                console.log(`Generating card for story slide ${slide.num}: "${slide.text}"`);
                const cardUrl = await generateStoryCard(post.id, slide.num, post.brand_name, slide.text, req);
                console.log(`Story slide ${slide.num} card URL: ${cardUrl}`);
                
                console.log(`Publishing slide ${slide.num} to Instagram Story...`);
                const slideRes = await publishToInstagram(account.instagram_business_id, decryptedToken, {
                  caption: '',
                  videoUrl: cardUrl,
                  isStory: true
                });
                
                if (slideRes && slideRes.success) {
                  slidePostIds.push(slideRes.post_id);
                }
              } catch (slideErr) {
                console.error(`Failed to publish story slide ${slide.num}:`, slideErr.message);
                slideErrors.push(`Slide ${slide.num}: ${slideErr.message}`);
              }
            }
            
            if (slidePostIds.length > 0) {
              publishRes = {
                success: true,
                post_id: slidePostIds.join(',')
              };
              if (slideErrors.length > 0) {
                publishRes.warning = `Partial success. Failed slides: ${slideErrors.join('; ')}`;
              }
            } else {
              throw new Error(`All story slides failed to publish: ${slideErrors.join('; ')}`);
            }
          } else {
            console.log(`No story text slides found. Falling back to video story for post ID ${post.id}`);
            publishRes = await publishToInstagram(account.instagram_business_id, decryptedToken, {
              caption: '',
              videoUrl: publicUrl,
              isStory: true
            });
          }
        } else if (channel === 'facebook_story') {
          if (!account.facebook_page_id) {
            throw new Error(`Facebook Page ID is missing for account ${account.account_name}`);
          }
          const slides = [];
          if (post.story_1 && post.story_1.trim()) slides.push({ num: 1, text: post.story_1.trim() });
          if (post.story_2 && post.story_2.trim()) slides.push({ num: 2, text: post.story_2.trim() });
          if (post.story_3 && post.story_3.trim()) slides.push({ num: 3, text: post.story_3.trim() });

          if (slides.length > 0) {
            const slidePostIds = [];
            const slideErrors = [];
            
            for (const slide of slides) {
              try {
                console.log(`Generating card for Facebook story slide ${slide.num}: "${slide.text}"`);
                const cardUrl = await generateStoryCard(post.id, slide.num, post.brand_name, slide.text, req);
                console.log(`Facebook Story slide ${slide.num} card URL: ${cardUrl}`);
                
                console.log(`Publishing slide ${slide.num} to Facebook Page Story...`);
                const slideRes = await publishPhotoStoryToFacebook(account.facebook_page_id, decryptedToken, { imageUrl: cardUrl });
                
                if (slideRes && slideRes.success) {
                  slidePostIds.push(slideRes.post_id);
                }
              } catch (slideErr) {
                console.error(`Failed to publish Facebook story slide ${slide.num}:`, slideErr.message);
                slideErrors.push(`Slide ${slide.num}: ${slideErr.message}`);
              }
            }
            
            if (slidePostIds.length > 0) {
              publishRes = {
                success: true,
                post_id: slidePostIds.join(',')
              };
              if (slideErrors.length > 0) {
                publishRes.warning = `Partial success. Failed slides: ${slideErrors.join('; ')}`;
              }
            } else {
              throw new Error(`All Facebook story slides failed to publish: ${slideErrors.join('; ')}`);
            }
          } else {
            console.log(`No story text slides found. Falling back to video story for Facebook Page post ID ${post.id}`);
            publishRes = await publishVideoStoryToFacebook(account.facebook_page_id, decryptedToken, {
              videoUrl: publicUrl
            });
          }
        }

        if (publishRes && publishRes.success) {
          const isWarning = !!publishRes.warning;
          const statusVal = isWarning ? 'partial' : 'success';
          console.log(`Successfully published to ${channel} (${statusVal})! Post ID: ${publishRes.post_id}`);
          platformPostIds.push({ platform: channel, post_id: publishRes.post_id });
          results.push({ 
            platform: channel, 
            status: statusVal, 
            post_id: publishRes.post_id,
            error: isWarning ? publishRes.warning : undefined
          });

          // Update job status to success
          await pool.query(
            "UPDATE publish_queue SET status = 'success', post_id = $1, published_at = NOW(), error_message = NULL, updated_at = NOW() WHERE id = $2",
            [publishRes.post_id, job.id]
          );

          await pool.query(
            `INSERT INTO publishing_logs (content_id, brand_name, platform, post_id, status, published_at, metadata)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
            [
              post.id, 
              post.brand_name, 
              channel, 
              publishRes.post_id, 
              statusVal, 
              JSON.stringify({ account_id: account.account_id, response: publishRes })
            ]
          );
        }
      } catch (pubErr) {
        console.error(`Publishing to ${channel} failed:`, pubErr.message);
        errors.push(`Failed to publish to ${channel}: ${pubErr.message}`);
        results.push({ platform: channel, status: 'failed', error: pubErr.message });

        // Update job status to failed
        await pool.query(
          "UPDATE publish_queue SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
          [pubErr.message, job.id]
        );

        await pool.query(
          `INSERT INTO publishing_logs (content_id, brand_name, platform, post_id, status, published_at, metadata)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
          [
            post.id,
            post.brand_name,
            channel,
            null,
            'failed',
            JSON.stringify({ error: pubErr.message })
          ]
        );
      }
    }

    // Determine final status from all jobs
    const allJobsRes = await pool.query("SELECT status FROM publish_queue WHERE content_id = $1", [post.id]);
    const allJobs = allJobsRes.rows;

    let finalStatus = 'published';
    let errorMessage = null;

    const hasFailed = allJobs.some(j => j.status === 'failed');
    const hasPending = allJobs.some(j => j.status === 'pending' || j.status === 'publishing');
    const hasSuccess = allJobs.some(j => j.status === 'success');

    if (hasFailed) {
      if (hasSuccess) {
        finalStatus = 'partial';
        errorMessage = 'Some platforms failed: ' + errors.join('; ');
      } else {
        finalStatus = 'failed';
        errorMessage = errors.join('; ');
      }
    } else if (hasPending) {
      finalStatus = 'approved';
    } else {
      finalStatus = 'published';
    }

    // Load existing platform_post_ids to merge
    let mergedPostIds = [];
    if (Array.isArray(post.platform_post_ids)) {
      mergedPostIds = post.platform_post_ids;
    } else if (typeof post.platform_post_ids === 'string') {
      try {
        mergedPostIds = JSON.parse(post.platform_post_ids);
      } catch (e) {
        mergedPostIds = [];
      }
    }

    for (const newId of platformPostIds) {
      const idx = mergedPostIds.findIndex(m => m.platform === newId.platform);
      if (idx !== -1) {
        mergedPostIds[idx] = newId;
      } else {
        mergedPostIds.push(newId);
      }
    }

    await pool.query(
      `UPDATE content_queue 
       SET status = $1::varchar, 
           published_at = CASE WHEN $1::varchar IN ('PUBLISHED', 'PARTIAL', 'published', 'partial') THEN NOW() ELSE published_at END,
           failed_at = CASE WHEN $1::varchar IN ('FAILED', 'failed') THEN NOW() ELSE failed_at END,
           platform_post_ids = $2,
           error_message = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [finalStatus.toUpperCase(), JSON.stringify(mergedPostIds), errorMessage, post.id]
    );

    res.json({
      success: !hasFailed || hasSuccess,
      status: finalStatus.toUpperCase(),
      results,
      errors: errors.length > 0 ? errors : null
    });

  } catch (err) {
    console.error('publishPost error:', err);
    res.status(500).json({ success: false, error: 'Publishing execution failed: ' + err.message });
  }
}

const BRAND_DETAILS = {
  "BM Academy": {
    industry: "EdTech & Education",
    targetAudience: "College students, freshers, career switchers in TN and Pondicherry looking for software placement."
  },
  "BM TechX": {
    industry: "Digital Marketing & Software Agency",
    targetAudience: "SMEs, local business owners in TN and Pondicherry looking to scale revenue via Ads and SEO."
  },
  "Namma Pondy Properties": {
    industry: "Real Estate Investment",
    targetAudience: "Investors looking for premium plots and land in Chennai-Pondicherry growth corridors."
  },
  "Dada's Kitchen": {
    industry: "Catering & Authentic Tamil Restaurant",
    targetAudience: "Families, event coordinators, and corporate groups looking for firewood-cooked bulk catering."
  },
  "ABM Groups": {
    industry: "Conglomerate Group Management",
    targetAudience: "Partners, corporate clients, and general public interested in reliable diversified business services."
  }
};

const suggestionRateLimits = new Map();

function checkRateLimit(contentId) {
  const now = Date.now();
  if (!suggestionRateLimits.has(contentId)) {
    suggestionRateLimits.set(contentId, [now]);
    return true;
  }
  const timestamps = suggestionRateLimits.get(contentId).filter(ts => now - ts < 60000);
  if (timestamps.length >= 5) {
    return false;
  }
  timestamps.push(now);
  suggestionRateLimits.set(contentId, timestamps);
  return true;
}

// POST /api/content/:id/suggest-captions
async function suggestCaptions(req, res) {
  const { id } = req.params;
  const tone = req.body.tone || "engaging";

  if (!checkRateLimit(id)) {
    return res.status(429).json({ success: false, error: "Too many requests. Limit is 5 requests per content item per minute." });
  }

  try {
    const postRes = await pool.query('SELECT * FROM content_queue WHERE id = $1', [id]);
    if (!postRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Content queue item not found' });
    }
    const post = postRes.rows[0];

    const brandDetail = BRAND_DETAILS[post.brand_name] || {
      industry: "Social Media / Business",
      targetAudience: "General social media audience"
    };
    const brandVoice = BRAND_VOICES[post.brand_name]?.voice || "Professional and engaging";

    let prompt = `You are an expert social media copywriter. Generate 5 unique caption suggestions for a video post based on the following details:
- Brand Name: ${post.brand_name}
- Industry: ${brandDetail.industry}
- Target Audience: ${brandDetail.targetAudience}
- Brand Voice Guidelines: ${brandVoice}
- Video Title/File Name: ${post.file_name}
- Video Description: ${post.description || "Not provided"}
- Existing Caption: ${post.caption || "Not provided"}
- Existing Hashtags: ${post.hashtags || ""}

CRITICAL LANGUAGE & SCRIPT REQUIREMENT:
- Do NOT generate captions in pure, formal Tamil script.
- For brands with Tamil-English/Tanglish requirements (like BM Academy or BM TechX), write using Tanglish (Tamil words written using English letters, e.g., "Ungalukku programming padikka aasaiya?", "3 madhathil job ready!", "First step edunga") mixed with English.
- Across the 5 suggestions, provide a variety of language splits:
  - 1 or 2 options should be in pure conversational English.
  - 2 or 3 options should be in English letters expressing Tanglish / local slang (e.g. "Ready-ah?", "Join pannunga", "Super option search panreengala?").
  - 1 option can include short Tamil script words mixed with English (e.g. "3 மாதத்தில் job", "20% refund guarantee!"), but keep it informal.
- The tone must be energetic, direct, and conversational. Avoid any textbook or formal tone.
`;

    if (tone === "engaging") {
      prompt += `\nGenerate exactly 5 UNIQUE captions, each matching one of these distinct styles:
1. Professional (authoritative, informative, clear)
2. Educational (informative, teaching value, tips/tricks)
3. Motivational (inspirational, energetic, inspiring action)
4. Sales-Oriented (persuasive, highlights product/service benefits, & has clear CTA)
5. Social Media Viral (highly engaging hook, uses modern social media slang/style, emojis)

For each caption, output its category style.
`;
    } else {
      prompt += `\nGenerate exactly 5 UNIQUE captions, all written in a "${tone}" tone.
`;
    }

    prompt += `\nReturn the response ONLY as a JSON object matching this schema:
{
  "suggestions": [
    {
      "id": 1,
      "tone": "viral",
      "caption": "Caption text..."
    },
    ...
  ]
}
Do not write any introductory or explanatory text. Return ONLY the valid JSON object.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.choices[0].message.content.trim();
    const result = JSON.parse(content);

    res.json({ success: true, suggestions: result.suggestions });
  } catch (err) {
    console.error("suggestCaptions error:", err);
    res.status(500).json({ success: false, error: "Failed to generate suggestions: " + err.message });
  }
}

// POST /api/content/:id/suggest-stories
async function suggestStories(req, res) {
  const { id } = req.params;
  const tone = req.body.tone || "engaging";

  if (!checkRateLimit(id)) {
    return res.status(429).json({ success: false, error: "Too many requests. Limit is 5 requests per content item per minute." });
  }

  try {
    const postRes = await pool.query('SELECT * FROM content_queue WHERE id = $1', [id]);
    if (!postRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Content queue item not found' });
    }
    const post = postRes.rows[0];

    const brandDetail = BRAND_DETAILS[post.brand_name] || {
      industry: "Social Media / Business",
      targetAudience: "General social media audience"
    };
    const brandVoice = BRAND_VOICES[post.brand_name]?.voice || "Professional and engaging";

    let prompt = `You are an expert social media copywriter. Generate 5 unique Instagram Story sets (each set consisting of 3 slides: story_1, story_2, and story_3) to promote a video post based on the following details:
- Brand Name: ${post.brand_name}
- Industry: ${brandDetail.industry}
- Target Audience: ${brandDetail.targetAudience}
- Brand Voice Guidelines: ${brandVoice}
- Video Title/File Name: ${post.file_name}
- Video Description: ${post.description || "Not provided"}
- Existing Caption: ${post.caption || "Not provided"}
- Existing Hashtags: ${post.hashtags || ""}

CRITICAL LANGUAGE & SCRIPT REQUIREMENT:
- Do NOT generate stories in formal Tamil script unless specified.
- For brands with Tamil-English/Tanglish requirements (like BM Academy or BM TechX), write using Tanglish (Tamil words written using English letters) mixed with English.
- Across the 5 suggestions, provide a variety of language splits:
  - 1 or 2 options should be in pure conversational English.
  - 2 or 3 options should be in English letters expressing Tanglish / local slang.
  - 1 option can include short Tamil script words mixed with English, but keep it informal.
- The tone must be energetic, direct, and conversational.
`;

    if (tone === "engaging") {
      prompt += `\nGenerate exactly 5 UNIQUE story sets, each matching one of these distinct styles:
1. Professional (authoritative, informative, clear)
2. Educational (informative, teaching value, tips/tricks)
3. Motivational (inspirational, energetic, inspiring action)
4. Sales-Oriented (persuasive, highlights product/service benefits, & has clear CTA)
5. Social Media Viral (highly engaging hook, uses modern social media slang/style, emojis)

For each story set, output its category style.
`;
    } else {
      prompt += `\nGenerate exactly 5 UNIQUE story sets, all written in a "${tone}" tone.
`;
    }

    prompt += `\nReturn the response ONLY as a JSON object matching this schema:
{
  "suggestions": [
    {
      "id": 1,
      "tone": "viral",
      "story_1": "Slide 1 text...",
      "story_2": "Slide 2 text...",
      "story_3": "Slide 3 text..."
    },
    ...
  ]
}
Do not write any introductory or explanatory text. Return ONLY the valid JSON object.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1800,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.choices[0].message.content.trim();
    const result = JSON.parse(content);

    res.json({ success: true, suggestions: result.suggestions });
  } catch (err) {
    console.error("suggestStories error:", err);
    res.status(500).json({ success: false, error: "Failed to generate suggestions: " + err.message });
  }
}

module.exports = { 
  getContent, 
  getStats, 
  approveContent, 
  rejectContent, 
  updateContent, 
  getSocialAccounts,
  generateCaptions,
  createBatchContent,
  getFolderMonitors,
  upsertFolderMonitor,
  checkNewDriveVideos,
  handleMetaCallback,
  linkBrandAccount,
  publishPost,
  suggestCaptions,
  suggestStories,
  generateStoryCard,
  resolvePublicUrl
};
