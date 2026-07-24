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
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
ffmpeg.setFfprobePath(ffprobePath);


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
        '-ac 2',
        '-movflags +faststart'
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

function getBrandSlug(brandName) {
  if (!brandName) return 'default';
  const known = {
    "BM Academy": "bm_academy",
    "BM TechX": "bm_techx",
    "Namma Pondy Properties": "namma_pondy_properties",
    "Dada's Kitchen": "dadas_kitchen",
    "ABM Groups": "abm_groups"
  };
  return known[brandName] || brandName.toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function findBrandVoice(brandName) {
  try {
    const { rows } = await pool.query(
      `SELECT brand_tag, brand_voice FROM clients WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [brandName]
    );
    if (rows.length && (rows[0].brand_tag || rows[0].brand_voice)) {
      return { tag: rows[0].brand_tag || brandName, voice: rows[0].brand_voice || `Professional voice for ${brandName}` };
    }
    return null;
  } catch {
    return null;
  }
}

async function findBrandDetails(brandName) {
  try {
    const { rows } = await pool.query(
      `SELECT industry, target_audience FROM clients WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [brandName]
    );
    if (rows.length && (rows[0].industry || rows[0].target_audience)) {
      return { industry: rows[0].industry || "Social Media / Business", targetAudience: rows[0].target_audience || "General social media audience" };
    }
    return null;
  } catch {
    return null;
  }
}

async function downloadFile(url, destPath) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });
  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

function burnStoryOverlay(inputPath, outputPath, brandName) {
  return new Promise((resolve, reject) => {
    const brandSlug = getBrandSlug(brandName);
    let stickerPath = path.join(__dirname, `../assets/story_sticker_${brandSlug}.png`);
    if (!fs.existsSync(stickerPath)) {
      stickerPath = path.join(__dirname, '../assets/new_reel_sticker.png');
    }

    console.log(`[burnStoryOverlay] Burning overlay onto story video using sticker: ${stickerPath}`);

    // Query video metadata using ffprobe first to log specs and warn if invalid
    ffmpeg.ffprobe(inputPath, (probeErr, metadata) => {
      if (probeErr) {
        console.warn(`[burnStoryOverlay] ffprobe failed for input ${inputPath}:`, probeErr.message);
      } else {
        const duration = metadata?.format?.duration;
        console.log(`[burnStoryOverlay] Input video metadata - duration: ${duration}s, size: ${metadata?.format?.size} bytes`);
        if (duration < 3) {
          console.warn(`[burnStoryOverlay] WARNING: Video duration (${duration}s) is less than 3s (IG Stories min spec).`);
        }
        if (duration > 60) {
          console.warn(`[burnStoryOverlay] WARNING: Video duration (${duration}s) is greater than 60s (IG Stories max spec). Truncating output to 60s.`);
        }
      }

      // Build and run ffmpeg command
      const ff = ffmpeg(inputPath)
        .input(stickerPath)
        // Ensure 1080x1920 (9:16) scaling + padding and overlay the sticker
        .complexFilter('[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[scaled]; [scaled][1:v]overlay=x=(W-w)/2:y=H-h-200[outv]')
        .outputOptions([
          '-map [outv]',
          '-map 0:a?',
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-pix_fmt yuv420p',
          '-c:a aac',
          '-b:a 128k',
          '-t 60' // IG Stories cap at 60s
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          console.log(`[burnStoryOverlay] Started FFmpeg command: ${cmd}`);
        })
        .on('stderr', (stderrLine) => {
          console.log(`[FFmpeg-stderr] ${stderrLine}`);
        })
        .on('end', () => {
          console.log(`[burnStoryOverlay] FFmpeg overlay complete: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('[burnStoryOverlay] FFmpeg overlay error:', err.message);
          reject(err);
        });

      ff.run();
    });
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
  caption, instagram_caption, facebook_caption, x_caption, linkedin_caption, 
  youtube_title, youtube_description, thumbnail_title,
  story_1, story_2, story_3,
  platforms, selected_accounts, scheduled_at, status,
  approved_by, approved_at, rejected_by, rejected_at, rejection_reason,
  error_message, created_at, published_at, description, hashtags, thumbnail_options,
  key_moments, drive_file_id, brand_id, video_name, transcript
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
      } else if (status.toLowerCase() === "pending_approval") {
        query += ` AND status IN ('pending_approval', 'PUBLISHING', 'publishing', 'PROCESSING', 'processing', 'draft')`;
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

function safeJsonValue(val) {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return val;
    }
  }
  return val;
}

// ---------------------------------------------------------------
// PATCH /api/content/:id
// Saves caption/schedule/platform edits from the dashboard edit mode.
// ---------------------------------------------------------------
async function updateContent(req, res) {
  const { id } = req.params;
  console.log(`[updateContent] Received update request for ID ${id}. Body:`, JSON.stringify(req.body));
  const allowed = [
    "caption", "instagram_caption", "facebook_caption", "x_caption", "linkedin_caption",
    "youtube_title", "youtube_description", "thumbnail_title", "scheduled_at",
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
      let val = isJson ? JSON.stringify(safeJsonValue(req.body[key])) : req.body[key];

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
    console.log(`[updateContent] Running query: UPDATE content_queue SET ${sets.join(", ")} WHERE id = ${id}. Params:`, JSON.stringify(params));
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

  const brandInfo = (await findBrandVoice(brand_name)) || { tag: brand_name, voice: `Professional voice for ${brand_name}` };

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

Rules for each platform (Make it FUNNEL-AWARE):
- Instagram (platform: "instagram"): Caption (hook + WhatsApp CTA), Tanglish (Tamil-English mix) where indicates, emojis. 3-5 lines.
- Facebook (platform: "facebook"): Caption (hook + WhatsApp CTA), Tanglish (Tamil-English mix) where indicates, emojis. 3-5 lines.
- LinkedIn (platform: "linkedin"): Professional B2B tone (BM TechX agency positioning), no excessive emojis, English. 2-4 lines.
- X (Twitter) (platform: "x_twitter"): Punchy, under 240 characters.
- YouTube (platform: "youtube"): Generate BOTH a compelling Title ("title") and description ("caption"). Make it SEO keyword-rich (searchable terms like 'digital marketing course Pondicherry', 'job guarantee training Tamil Nadu', 'LeadOS automation') + WhatsApp CTA.

Output Format:
Do NOT use markdown code blocks. Respond ONLY with a valid JSON array matching this format:
[
  {"platform": "instagram", "caption": "your instagram caption"},
  {"platform": "facebook", "caption": "your facebook caption"},
  {"platform": "linkedin", "caption": "your linkedin caption"},
  {"platform": "x_twitter", "caption": "your x caption"},
  {"platform": "youtube", "title": "your youtube video title", "caption": "your youtube video description"}
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
      BRAND_NAME_TO_SLUG[c.name] = getBrandSlug(c.name);
    }

    for (const item of items) {
      const { 
        brand_name, platforms, selected_accounts, 
        caption, instagram_caption, facebook_caption, x_caption, linkedin_caption, 
        youtube_title, youtube_description, 
        thumbnail_title, scheduled_at, file_name 
      } = item;
      const brand_id = BRAND_NAME_TO_SLUG[brand_name] || brand_name.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

      const { rows } = await client.query(`
        INSERT INTO content_queue (
          brand_name, platforms, selected_accounts, 
          caption, instagram_caption, facebook_caption, x_caption, linkedin_caption, 
          youtube_title, youtube_description, 
          thumbnail_title, scheduled_at, file_name, status,
          brand_id, video_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending_approval', $14, $15)
        RETURNING *
      `, [
        brand_name,
        platforms ? JSON.stringify(safeJsonValue(platforms)) : '[]',
        selected_accounts ? JSON.stringify(safeJsonValue(selected_accounts)) : '{}',
        caption || '',
        instagram_caption || caption || '',
        facebook_caption || caption || '',
        x_caption || '',
        linkedin_caption || '',
        youtube_title || thumbnail_title || 'Social Media Video',
        youtube_description || '',
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
      const slug = getBrandSlug(c.name);
      if (!SLUG_TO_BRAND[slug] || (/[A-Z]/.test(c.name) && !/[A-Z]/.test(SLUG_TO_BRAND[slug]))) {
        SLUG_TO_BRAND[slug] = c.name;
      }
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

        // 3. Set content empty (no AI generation during ingestion)
        console.log("DrivePoller: Skipping AI generation during ingestion as requested...");

        const defaultPlatforms = [];

        try {
          // Insert into database
          await pool.query(`
            INSERT INTO content_queue (
              brand_name, file_name, video_url, public_video_url, drive_file_id,
              caption, x_caption, linkedin_caption, description, hashtags,
              thumbnail_options, key_moments, status, thumbnail_title, platforms,
              brand_id, video_name, thumbnail_url, story_1, story_2, story_3, transcript
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending_approval', $13, $14, $15, $16, $17, $18, $19, $20, $21)
          `, [
            brand_name,
            file.name,
            videoUrl,
            publicVideoUrl,
            file.id,
            "", // caption
            "", // x_caption
            "", // linkedin_caption
            "", // description
            "", // hashtags
            JSON.stringify([]), // thumbnail_options
            JSON.stringify([]), // key_moments
            file.name.replace(/\.[^/.]+$/, ""), // thumbnail_title
            JSON.stringify(safeJsonValue(defaultPlatforms)),
            brand_slug,
            file.name,
            publicThumbnailUrl,
            "", // story_1
            "", // story_2
            "", // story_3
            transcript || ""
          ]);

          console.log(`DrivePoller: Successfully ingested and staged video: ${file.name}`);
        } catch (dbErr) {
          console.error("DrivePoller: Failed to save to DB:", dbErr.message);
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
  if (process.env.TEST_PUBLIC_STORY_IMAGE === 'true') {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80';
  }
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

    const baseUrl = (process.env.API_BASE_URL || 'https://leados-api.abmgroups.org').replace(/\/+$/, '');
    return resolvePublicUrl(`${baseUrl}/uploads/${filename}`, req, true);
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

function resolvePublicUrl(url, req = null, forcePublic = false) {
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

  // Fallback to production API URL if forcePublic is true and baseUrl resolved to localhost/127.0.0.1 (so Facebook/Instagram crawler can access it)
  if (forcePublic && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
    baseUrl = 'https://leados-api.abmgroups.org';
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
        if (!forcePublic && transcodedMatch && !transcodedExists) {
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
    const fullError = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error('Facebook photo story publishing failed. Full Meta error:', fullError);
    const msg = err.response?.data?.error?.message || err.message;
    throw new Error(`${msg} (Full Meta details: ${fullError})`);
  }
}

// Facebook Video Story Publishing
async function publishVideoStoryToFacebook(pageId, pageAccessToken, { videoUrl }) {
  // Approach 1: single-step URL-based upload (avoids resumable upload protocol issues)
  try {
    console.log(`[FB Story] Trying single-step video_url approach for page ${pageId}`);
    const res = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/video_stories`, {
      video_url: videoUrl,
      published: true,
      access_token: pageAccessToken
    });
    console.log(`[FB Story] Single-step success:`, res.data);
    return { success: true, post_id: res.data.id || res.data.video_id };
  } catch (err1) {
    console.warn(`[FB Story] Single-step failed (${err1.response?.data?.error?.message || err1.message}), trying 3-step upload...`);
  }

  // Approach 2: 3-step resumable upload
  try {
    const initRes = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/video_stories`, {
      upload_phase: 'start',
      access_token: pageAccessToken
    });
    const { video_id, upload_url } = initRes.data;
    if (!video_id || !upload_url) throw new Error('No video_id or upload_url from init step');

    await axios.post(upload_url, null, {
      headers: { 'file_url': videoUrl, 'Authorization': `OAuth ${pageAccessToken}` }
    });

    const finishRes = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/video_stories`, {
      upload_phase: 'finish',
      video_id,
      access_token: pageAccessToken
    });
    return { success: true, post_id: finishRes.data.id || video_id };
  } catch (err2) {
    const fullError = err2.response?.data ? JSON.stringify(err2.response.data) : err2.message;
    console.error('[FB Story] Both approaches failed. Full Meta error:', fullError);
    throw new Error(`${err2.response?.data?.error?.message || err2.message} (Full Meta details: ${fullError})`);
  }
}

// Facebook Reel Publishing
async function publishReelToFacebook(pageId, pageAccessToken, { caption, videoUrl }) {
  console.log(`[publishReelToFacebook] Starting 3-step Reels upload. Page ID: ${pageId}, Video URL: ${videoUrl}`);
  try {
    // Step (a) Initialize upload session
    console.log(`[publishReelToFacebook] Step (a): Initializing Reels upload...`);
    const initRes = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/video_reels`, {
      upload_phase: 'start',
      access_token: pageAccessToken
    });
    console.log(`[publishReelToFacebook] Step (a) Meta response:`, JSON.stringify(initRes.data, null, 2));

    const { video_id, upload_url } = initRes.data;
    if (!video_id || !upload_url) {
      throw new Error("Failed to initialize Facebook Reels session: no video_id or upload_url returned.");
    }
    console.log(`[publishReelToFacebook] Step (a) Success: video_id = ${video_id}`);

    // Step (b) Upload the video data
    console.log(`[publishReelToFacebook] Step (b): Uploading video via file_url header...`);
    const uploadRes = await axios.post(upload_url, null, {
      headers: {
        'file_url': videoUrl,
        'Authorization': `OAuth ${pageAccessToken}`
      }
    });
    console.log(`[publishReelToFacebook] Step (b) Meta response:`, JSON.stringify(uploadRes.data, null, 2));

    // Step (c) Finish and publish
    console.log(`[publishReelToFacebook] Step (c): Finishing upload and publishing Reel...`);
    const finishParams = {
      upload_phase: 'finish',
      video_id: video_id,
      video_state: 'PUBLISHED',
      share_to_feed: true,
      description: caption,
      access_token: pageAccessToken
    };
    console.log(`[publishReelToFacebook] Step (c) Payload:`, JSON.stringify({ ...finishParams, access_token: '***' }, null, 2));

    const finishRes = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/video_reels`, finishParams);
    console.log(`[publishReelToFacebook] Step (c) Meta response:`, JSON.stringify(finishRes.data, null, 2));

    // Wait for the Reel to be fully processed by Meta and transition to 'ready'
    console.log(`[publishReelToFacebook] Polling video processing status for video ID ${video_id}...`);
    const pollResult = await waitForFacebookReel(video_id, pageAccessToken);
    console.log(`[publishReelToFacebook] Reel status check complete:`, pollResult);

    return pollResult;
  } catch (err) {
    const fullError = err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message;
    console.error('[publishReelToFacebook] Facebook Reels publishing failed. Full Meta error:', fullError);
    const msg = err.response?.data?.error?.message || err.message;
    throw new Error(`${msg} (Full Meta details: ${fullError})`);
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
async function createInstagramContainer(instagramBusinessId, accessToken, { videoUrl, caption, isStory = false, linkStickerUrl = null }) {
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
    if (linkStickerUrl) {
      params.link_sticker_url = linkStickerUrl;
      console.log(`[IG Story] Adding link sticker → ${linkStickerUrl}`);
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
        fields: 'status_code,status',
        access_token: accessToken
      }
    });

    const { status_code, status } = res.data;
    console.log(`Instagram container ${containerId} check #${attempt}: status_code = ${status_code}`);
    if (status_code === 'FINISHED') {
      return true;
    }
    if (status_code === 'ERROR') {
      const details = JSON.stringify(res.data);
      console.error(`[waitForInstagramContainer] Instagram container failed. Full Meta response:`, details);
      
      const statusStr = status || '';
      const match = statusStr.match(/error code (\d+)/i);
      const errorCode = match ? parseInt(match[1], 10) : null;
      
      const error = new Error(`Instagram container failed: ${status || 'Container processing failed'} (Meta response: ${details})`);
      error.metaResponse = res.data;
      error.errorCode = errorCode;
      error.isContainerError = true;
      throw error;
    }

    // Wait 10 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error('Timeout waiting for Instagram media container build.');
}

// Facebook Poll Reels Status
async function waitForFacebookReel(videoId, pageAccessToken, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusUrl = `https://graph.facebook.com/v19.0/${videoId}`;
    const res = await axios.get(statusUrl, {
      params: {
        fields: 'status,published,post_id',
        access_token: pageAccessToken
      }
    });

    const { status, published, post_id } = res.data;
    const videoStatus = status?.video_status;
    const copyrightStatus = status?.copyright_check_status?.status;
    const matchesFound = status?.copyright_check_status?.matches_found;
    
    console.log(`Facebook reel ${videoId} check #${attempt}: video_status = ${videoStatus}, published = ${published}, copyright_check_status = ${copyrightStatus}, matches_found = ${matchesFound}`);
    
    if (videoStatus === 'ready') {
      console.log(`[waitForFacebookReel] Reel is ready! Reel Video ID (Reel ID): ${videoId}, Page Feed Post ID: ${post_id}`);
      return { success: true, post_id: videoId };
    }

    // Check for explicit copyright matches
    if (matchesFound === true) {
      const details = JSON.stringify(res.data);
      console.error(`[waitForFacebookReel] Facebook reel copyright block. Matches found. Meta response:`, details);
      const error = new Error(`Facebook reel copyright block. Matches found. (Meta response: ${details})`);
      error.metaResponse = res.data;
      error.isCopyrightBlock = true;
      error.isReelProcessingError = true;
      throw error;
    }

    // Do NOT fail if the copyright check or processing is still in progress
    const isCheckingCopyright = copyrightStatus === 'in_progress' || copyrightStatus === 'not_started';
    
    if (videoStatus === 'error') {
      if (isCheckingCopyright) {
        console.log(`[waitForFacebookReel] video_status is 'error' but copyright check is still '${copyrightStatus}'. Keeping poll active...`);
      } else {
        const details = JSON.stringify(res.data);
        console.error(`[waitForFacebookReel] Facebook reel processing failed. Full Meta response:`, details);
        
        const error = new Error(`Facebook reel processing failed: status is error (Meta response: ${details})`);
        error.metaResponse = res.data;
        error.isReelProcessingError = true;
        throw error;
      }
    }

    // Wait 20 seconds before next check (copyright and processing can take a while)
    await new Promise(resolve => setTimeout(resolve, 20000));
  }
  throw new Error('Timeout waiting for Facebook Reel processing and copyright check to complete.');
}

// Helper to identify transient Meta errors (e.g. transcoding/ingestion issues)
function isTransientMetaError(err) {
  // Case 0: Custom error from waitForFacebookReel
  if (err.isReelProcessingError) {
    return true; // Reel processing errors are transient
  }

  // Case 1: Custom error from waitForInstagramContainer
  if (err.isContainerError) {
    const code = err.errorCode;
    const status = err.metaResponse?.status || '';
    
    const isTransientCode = [2207082, 2207026, 9007].includes(code);
    if (isTransientCode) return true;
    
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus.includes('transcode') || 
        lowercaseStatus.includes('transcoding') || 
        lowercaseStatus.includes('media upload has failed') ||
        lowercaseStatus.includes('upload has failed')) {
      return true;
    }
    return false;
  }

  // Case 2: Axios error response from Meta Graph API
  const metaError = err.response?.data?.error;
  if (metaError) {
    const code = metaError.code;
    const subcode = metaError.error_subcode;
    const message = metaError.message || '';
    
    const isTransientCode = [2207082, 2207026, 9007].includes(code) || [2207082, 2207026, 9007].includes(subcode);
    if (isTransientCode) return true;
    
    const lowercaseMsg = message.toLowerCase();
    if (lowercaseMsg.includes('transcode') || 
        lowercaseMsg.includes('transcoding') || 
        lowercaseMsg.includes('media upload has failed') ||
        lowercaseMsg.includes('upload has failed')) {
      return true;
    }
  }

  // Case 3: Message-based check
  const errMsg = (err.message || '').toLowerCase();
  if (errMsg.includes('2207082') || errMsg.includes('2207026') || errMsg.includes('9007') ||
      errMsg.includes('transcode') || 
      errMsg.includes('transcoding') || 
      errMsg.includes('media upload has failed') ||
      errMsg.includes('upload has failed')) {
    return true;
  }

  return false;
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
async function publishToInstagram(instagramBusinessId, accessToken, { videoUrl, caption, isStory = false, linkStickerUrl = null }) {
  try {
    const containerId = await createInstagramContainer(instagramBusinessId, accessToken, { videoUrl, caption, isStory, linkStickerUrl });
    await waitForInstagramContainer(containerId, accessToken);
    const mediaId = await publishInstagramContainer(instagramBusinessId, accessToken, containerId);
    return { success: true, post_id: mediaId };
  } catch (err) {
    const fullError = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error('Instagram posting failed. Full Meta error:', fullError);
    const msg = err.response?.data?.error?.message || err.message;
    throw new Error(`${msg} (Full Meta details: ${fullError})`);
  }
}

// Publish to Instagram Coordinator with retry mechanism for transient errors
async function publishToInstagramWithRetry(instagramBusinessId, accessToken, { videoUrl, caption, isStory = false, linkStickerUrl = null }) {
  const maxRetries = 3;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[publishToInstagramWithRetry] Attempt ${attempt}/${maxRetries} to publish to Instagram. URL: ${videoUrl}`);
      const res = await module.exports.publishToInstagram(instagramBusinessId, accessToken, { videoUrl, caption, isStory, linkStickerUrl });
      return res;
    } catch (err) {
      lastErr = err;
      const isTransient = isTransientMetaError(err);
      const fullError = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`[publishToInstagramWithRetry] Attempt ${attempt}/${maxRetries} failed. Transient error: ${isTransient}. Full error details:`, fullError);

      if (!isTransient || attempt === maxRetries) {
        throw err;
      }

      console.log(`[publishToInstagramWithRetry] Waiting 30 seconds before retry attempt ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  throw lastErr;
}

// Publish Facebook Reel with retry mechanism for transient errors
async function publishReelToFacebookWithRetry(pageId, pageAccessToken, { caption, videoUrl }) {
  const maxRetries = 3;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[publishReelToFacebookWithRetry] Attempt ${attempt}/${maxRetries} to publish Reel to Facebook. URL: ${videoUrl}`);
      const res = await module.exports.publishReelToFacebook(pageId, pageAccessToken, { caption, videoUrl });
      return res;
    } catch (err) {
      lastErr = err;
      const isTransient = isTransientMetaError(err);
      const fullError = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`[publishReelToFacebookWithRetry] Attempt ${attempt}/${maxRetries} failed. Transient error: ${isTransient}. Full error details:`, fullError);

      if (!isTransient || attempt === maxRetries) {
        throw err;
      }

      console.log(`[publishReelToFacebookWithRetry] Waiting 30 seconds before retry attempt ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  throw lastErr;
}

// POST /api/content/meta/callback
async function handleMetaCallback(req, res) {
  const { code, redirectUri: reqRedirectUri } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'Auth code is required' });
  }

  const appId = process.env.META_APP_ID || '953749850406150';
  const appSecret = process.env.META_APP_SECRET || 'dSSnlAoUGreiJ61yHAU3kSvJ';
  const redirectUri = reqRedirectUri || process.env.META_REDIRECT_URI || `${process.env.PORTAL_URL || 'https://leados-app.abmgroups.org'}/settings/meta-callback`;


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

    // 1. Resolve currently selected platforms/channels
    let platforms = [];

    if (Array.isArray(post.selected_channels) && post.selected_channels.length > 0) {
      platforms = post.selected_channels;
    } else if (typeof post.selected_channels === 'string' && post.selected_channels.trim()) {
      try {
        const parsed = JSON.parse(post.selected_channels);
        if (Array.isArray(parsed) && parsed.length > 0) {
          platforms = parsed;
        }
      } catch (e) { }
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
        } catch (e) { }
      }
    }

    // Normalize platforms (e.g. 'instagram' -> 'instagram_post', 'facebook' -> 'facebook_post')
    const activeChannels = platforms.map(platform => {
      let normalizedChannel = platform.toLowerCase();
      if (normalizedChannel === 'instagram') normalizedChannel = 'instagram_post';
      if (normalizedChannel === 'facebook') normalizedChannel = 'facebook_post';
      return normalizedChannel;
    });

    // 2. Fetch all existing jobs for this post
    const existingJobsRes = await pool.query(
      "SELECT * FROM publish_queue WHERE content_id = $1",
      [post.id]
    );
    const existingJobs = existingJobsRes.rows;

    // 3. Delete non-success jobs that are NOT in activeChannels (clean up deselected channels)
    const jobsToDelete = existingJobs.filter(job => {
      return job.status !== 'success' && !activeChannels.includes(job.channel);
    });

    if (jobsToDelete.length > 0) {
      const deleteIds = jobsToDelete.map(j => j.id);
      await pool.query(
        "DELETE FROM publish_queue WHERE id = ANY($1)",
        [deleteIds]
      );
    }

    // 4. Ensure a pending job exists for all activeChannels that do NOT already have a 'success' job
    console.log(`[publishPost] Normalized active channels:`, JSON.stringify(activeChannels));
    for (const channel of activeChannels) {
      const hasSuccessJob = existingJobs.some(job => job.channel === channel && job.status === 'success');
      if (!hasSuccessJob) {
        // Upsert to ensure it exists with status 'pending' (failed ones are reset to pending to allow retry)
        console.log(`[publishPost] Creating/updating publish_queue job for content_id: ${post.id}, channel: ${channel}`);
        await pool.query(`
          INSERT INTO publish_queue (content_id, brand_name, channel, status)
          VALUES ($1, $2, $3, 'pending')
          ON CONFLICT (content_id, channel) 
          DO UPDATE SET status = 'pending', updated_at = NOW(), error_message = NULL
        `, [post.id, post.brand_name, channel]);
      }
    }

    // 5. Fetch all pending or failed jobs to process
    let { rows: jobs } = await pool.query(
      "SELECT * FROM publish_queue WHERE content_id = $1 AND status IN ('pending', 'failed')",
      [post.id]
    );
    console.log(`[publishPost] Pending/failed publish queue jobs retrieved for post ${post.id}:`, JSON.stringify(jobs.map(j => ({ id: j.id, channel: j.channel, status: j.status }))));

    if (!jobs || jobs.length === 0) {
      return res.status(400).json({ success: false, error: 'No platforms selected for this post' });
    }

    const publicUrl = resolvePublicUrl(post.public_video_url || post.video_url, req, true);
    if (!publicUrl) {
      return res.status(400).json({ success: false, error: 'No video or media URL found for this post' });
    }

    const accountsRes = await pool.query(
      `SELECT * FROM brand_social_accounts 
       WHERE (LOWER(REPLACE(REPLACE(brand_name, ' ', ''), '-', '_')) = LOWER(REPLACE(REPLACE($1, ' ', ''), '-', '_')) 
          OR LOWER(REPLACE(REPLACE(brand_name, ' ', ''), '-', '')) = LOWER(REPLACE(REPLACE($1, ' ', ''), '-', '')))
         AND is_active = true`,
      [post.brand_name]
    );
    const accounts = accountsRes.rows;

    // Set overall post status to PUBLISHING immediately in the DB
    await pool.query(
      "UPDATE content_queue SET status = 'PUBLISHING', updated_at = NOW() WHERE id = $1",
      [post.id]
    );

    // Minimize Express req object to prevent garbage collection issues in background
    const reqInfo = {
      protocol: req.protocol,
      headers: {
        host: req.headers['host'],
        'x-forwarded-host': req.headers['x-forwarded-host'],
        'x-forwarded-proto': req.headers['x-forwarded-proto']
      }
    };

    // Return HTTP response immediately to prevent Gateway Time-outs
    res.json({
      success: true,
      status: 'PUBLISHING',
      message: 'Publishing started in the background.'
    });

    // Run publishing process asynchronously in the background
    runBackgroundPublish(post.id, jobs, publicUrl, accounts, reqInfo).catch(bgErr => {
      console.error(`[BackgroundPublish] Fatal background exception for post ${post.id}:`, bgErr);
    });

  } catch (err) {
    console.error('publishPost error:', err);
    res.status(500).json({ success: false, error: 'Publishing execution failed: ' + err.message });
  }
}

// Recalculates and updates the overall status of the content_queue post incrementally
async function updateOverallPostStatus(postId) {
  try {
    const postRes = await pool.query('SELECT * FROM content_queue WHERE id = $1', [postId]);
    if (!postRes.rows.length) return;
    const post = postRes.rows[0];

    const allJobsRes = await pool.query("SELECT * FROM publish_queue WHERE content_id = $1", [postId]);
    const allJobs = allJobsRes.rows;

    let finalStatus = 'publishing';
    let errorMessage = null;
    const errors = [];
    const platformPostIds = [];

    const hasFailed = allJobs.some(j => j.status === 'failed');
    const hasPending = allJobs.some(j => j.status === 'pending' || j.status === 'publishing');
    const hasSuccess = allJobs.some(j => j.status === 'success');

    for (const job of allJobs) {
      if (job.status === 'success') {
        platformPostIds.push({ platform: job.channel, post_id: job.post_id });
      } else if (job.status === 'failed') {
        errors.push(`Failed to publish to ${job.channel}: ${job.error_message}`);
      }
    }

    if (hasPending) {
      finalStatus = 'publishing'; // Still in progress
    } else if (hasFailed) {
      if (hasSuccess) {
        finalStatus = 'partial';
        errorMessage = 'Some platforms failed: ' + errors.join('; ');
      } else {
        finalStatus = 'failed';
        errorMessage = errors.join('; ');
      }
    } else if (hasSuccess) {
      finalStatus = 'published';
    } else {
      finalStatus = 'approved';
    }

    // Merge existing platform_post_ids to ensure we don't wipe out manually recorded ids from other systems
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
      [finalStatus.toUpperCase(), JSON.stringify(mergedPostIds), errorMessage, postId]
    );

    console.log(`[updateOverallPostStatus] Post ${postId} status updated to: ${finalStatus.toUpperCase()}`);
  } catch (err) {
    console.error(`[updateOverallPostStatus] Failed to update overall status for post ${postId}:`, err.message);
  }
}

// Background worker to process the publishing queue sequentially
async function runBackgroundPublish(postId, jobs, publicUrl, accounts, reqInfo) {
  console.log(`[BackgroundPublish] Starting async publish for post ${postId}...`);

  for (const job of jobs) {
    const channel = job.channel.toLowerCase();

    // Set job status to 'publishing' and sync post status
    await pool.query("UPDATE publish_queue SET status = 'publishing', updated_at = NOW() WHERE id = $1", [job.id]);
    await updateOverallPostStatus(postId);

    let accountPlatform;
    if (channel.includes('instagram')) {
      accountPlatform = 'instagram';
    } else if (channel.includes('facebook')) {
      accountPlatform = 'facebook';
    } else {
      accountPlatform = channel;
    }

    const postRes = await pool.query('SELECT * FROM content_queue WHERE id = $1', [postId]);
    if (!postRes.rows.length) {
      console.warn(`[BackgroundPublish] Post ${postId} missing from content_queue.`);
      continue;
    }
    const post = postRes.rows[0];

    let selectedAccIds = null;
    if (post.selected_accounts) {
      try {
        const sel = typeof post.selected_accounts === 'string'
          ? JSON.parse(post.selected_accounts)
          : post.selected_accounts;
        if (sel && typeof sel === 'object' && !Array.isArray(sel)) {
          if (sel[channel] !== undefined) {
            selectedAccIds = sel[channel];
          } else if (sel[accountPlatform] !== undefined) {
            selectedAccIds = sel[accountPlatform];
          }
        }
      } catch (e) {
        console.warn("[BackgroundPublish] JSON parse failure for selected_accounts:", e.message);
      }
    }

    if (!selectedAccIds || !Array.isArray(selectedAccIds) || selectedAccIds.length === 0) {
      const errMsg = `No accounts selected for platform ${accountPlatform || channel}`;
      await pool.query(
        "UPDATE publish_queue SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
        [errMsg, job.id]
      );
      await pool.query(
        `INSERT INTO publishing_logs (content_id, brand_name, platform, post_id, status, published_at, metadata)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
        [post.id, post.brand_name, channel, null, 'failed', JSON.stringify({ error: errMsg })]
      );
      await updateOverallPostStatus(postId);
      continue;
    }

    const account = accounts.find(acc => {
      const isPlatMatch = acc.platform.toLowerCase() === accountPlatform;
      if (!isPlatMatch || !acc.access_token) return false;
      return selectedAccIds.includes(acc.account_id) || selectedAccIds.includes(String(acc.account_id));
    });

    if (!account) {
      const errMsg = `Selected account not found or inactive for brand ${post.brand_name} on ${channel}`;
      await pool.query(
        "UPDATE publish_queue SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
        [errMsg, job.id]
      );
      await pool.query(
        `INSERT INTO publishing_logs (content_id, brand_name, platform, post_id, status, published_at, metadata)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
        [post.id, post.brand_name, channel, null, 'failed', JSON.stringify({ error: errMsg })]
      );
      await updateOverallPostStatus(postId);
      continue;
    }

    let decryptedToken;
    try {
      decryptedToken = cryptoHelper.decrypt(account.access_token);
    } catch (decErr) {
      const errMsg = `Token decryption failed for platform ${channel}: ${decErr.message}`;
      await pool.query(
        "UPDATE publish_queue SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
        [errMsg, job.id]
      );
      await pool.query(
        `INSERT INTO publishing_logs (content_id, brand_name, platform, post_id, status, published_at, metadata)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
        [post.id, post.brand_name, channel, null, 'failed', JSON.stringify({ error: errMsg })]
      );
      await updateOverallPostStatus(postId);
      continue;
    }

    console.log(`[BackgroundPublish] Dispatching post ${postId} to ${channel}...`);

    try {
      let publishRes;
      const hashtags = post.hashtags ? `\n\n${post.hashtags}` : '';
      let finalCaption = '';
      if (channel === 'instagram' || channel === 'instagram_post') {
        finalCaption = `${post.instagram_caption || post.caption || post.description || ''}${hashtags}`.trim();
      } else if (channel === 'facebook' || channel === 'facebook_post') {
        finalCaption = `${post.facebook_caption || post.caption || post.description || ''}${hashtags}`.trim();
      } else if (channel === 'linkedin') {
        finalCaption = `${post.linkedin_caption || post.caption || post.description || ''}${hashtags}`.trim();
      } else if (channel === 'x_twitter') {
        finalCaption = `${post.x_caption || post.caption || post.description || ''}${hashtags}`.trim();
      } else {
        finalCaption = `${post.caption || post.description || ''}${hashtags}`.trim();
      }

      if (channel === 'facebook' || channel === 'facebook_post') {
        const pageId = account.facebook_page_id || account.account_id;
        if (!pageId) {
          throw new Error(`Facebook Page ID is missing for account ${account.account_name}`);
        }
        publishRes = await publishReelToFacebookWithRetry(pageId, decryptedToken, {
          caption: finalCaption,
          videoUrl: publicUrl
        });
      } else if (channel === 'instagram' || channel === 'instagram_post') {
        if (!account.instagram_business_id) {
          throw new Error(`Instagram Business ID is missing for account ${account.account_name}`);
        }
        publishRes = await publishToInstagramWithRetry(account.instagram_business_id, decryptedToken, {
          caption: finalCaption,
          videoUrl: publicUrl,
          isStory: false
        });
      } else if (channel === 'youtube') {
        let localVideoPath = null;
        if (publicUrl.includes('/uploads/')) {
          const filename = publicUrl.split('/uploads/')[1];
          localVideoPath = path.join(__dirname, '../uploads', filename);
        }

        if (!localVideoPath || !fs.existsSync(localVideoPath)) {
          const tempDownloadFilename = `temp_youtube_source_${post.id}_${Date.now()}.mp4`;
          const tempDownloadPath = path.join(os.tmpdir(), tempDownloadFilename);
          console.log(`[BackgroundPublish] Local video not found. Downloading from ${publicUrl} to ${tempDownloadPath}...`);
          await downloadFile(publicUrl, tempDownloadPath);
          localVideoPath = tempDownloadPath;
        }

        console.log(`[BackgroundPublish] Initializing YouTube client for brand: ${post.brand_name}...`);
        const oauth2Client = await getFreshYoutubeClient(account.access_token);

        const ytTitle = post.youtube_title || post.thumbnail_title || post.video_name || 'Social Media Video';
        const ytDesc = post.youtube_description || post.caption || post.description || '';
        
        publishRes = await publishVideoToYouTube(oauth2Client, {
          title: ytTitle,
          description: ytDesc,
          localVideoPath: localVideoPath
        });

        if (localVideoPath.includes('temp_youtube_source_') && fs.existsSync(localVideoPath)) {
          try {
            fs.unlinkSync(localVideoPath);
          } catch (unlinkErr) {
            console.warn(`[BackgroundPublish] Failed to clean up temp youtube file:`, unlinkErr.message);
          }
        }
      } else if (channel === 'instagram_story') {
        if (!account.instagram_business_id) {
          throw new Error(`Instagram Business ID is missing for account ${account.account_name}`);
        }
        // Try to get the reel permalink so we can add a link sticker in the story
        let linkStickerUrl = null;
        try {
          const reelJob = await pool.query(
            `SELECT post_id FROM publish_queue WHERE content_id = $1 AND channel IN ('instagram', 'instagram_post') AND status = 'success' AND post_id IS NOT NULL LIMIT 1`,
            [post.id]
          );
          if (reelJob.rows.length > 0) {
            const reelMediaId = reelJob.rows[0].post_id;
            const permalinkRes = await axios.get(`https://graph.facebook.com/v19.0/${reelMediaId}`, {
              params: { fields: 'permalink', access_token: decryptedToken }
            });
            linkStickerUrl = permalinkRes.data.permalink || null;
            console.log(`[BackgroundPublish] Found reel permalink for story link sticker: ${linkStickerUrl}`);
          }
        } catch (stickerErr) {
          console.warn(`[BackgroundPublish] Could not fetch reel permalink for link sticker:`, stickerErr.message);
        }
        console.log(`[BackgroundPublish] Publishing video story to Instagram for post ${post.id} — URL: ${publicUrl}`);
        publishRes = await publishToInstagramWithRetry(account.instagram_business_id, decryptedToken, {
          caption: '',
          videoUrl: publicUrl,
          isStory: true,
          linkStickerUrl
        });
      } else if (channel === 'facebook_story') {
        const pageId = account.facebook_page_id || account.account_id;
        if (!pageId) {
          throw new Error(`Facebook Page ID is missing for account ${account.account_name}`);
        }
        console.log(`[BackgroundPublish] Publishing video story to Facebook for post ${post.id} — URL: ${publicUrl}`);
        publishRes = await publishVideoStoryToFacebook(pageId, decryptedToken, { videoUrl: publicUrl });
      } else if (channel === 'linkedin') {
        const authorUrn = account.account_id;
        if (!authorUrn) {
          throw new Error(`LinkedIn author URN is missing for account ${account.account_name}`);
        }
        console.log(`[BackgroundPublish] Publishing to LinkedIn for post ${post.id} — URN: ${authorUrn}`);
        publishRes = await publishToLinkedIn(authorUrn, decryptedToken, {
          caption: finalCaption,
          videoUrl: publicUrl
        });
      }

      if (publishRes && publishRes.success) {
        const isWarning = !!publishRes.warning;
        const statusVal = isWarning ? 'partial' : 'success';
        console.log(`[BackgroundPublish] Successfully published to ${channel} (${statusVal})! Post ID: ${publishRes.post_id}`);

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
      console.error(`[BackgroundPublish] Publishing to ${channel} failed:`, pubErr.message);

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

    // Refresh overall status incrementally
    await updateOverallPostStatus(postId);
  }

  console.log(`[BackgroundPublish] Async publishing complete for post ${postId}.`);
}

const BRAND_CTA_CONFIG = {
  "bm_academy": "WhatsApp: 94038 92971",
  "bm_techx": "WhatsApp: 99442 88271"
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

async function getOrGenerateTranscript(post) {
  let transcript = post.transcript || "";
  if (!transcript && post.public_video_url) {
    const fileId = extractDriveFileId(post.video_url || post.public_video_url);
    if (fileId) {
      const tempFilePath = path.join(os.tmpdir(), `transcribe_temp_video_${fileId}_${Date.now()}.mp4`);
      const tempAudioPath = path.join(os.tmpdir(), `transcribe_temp_audio_${fileId}_${Date.now()}.mp3`);
      try {
        console.log(`[Transcript Helper] Transcribing video on-the-fly for file ID ${fileId}...`);
        await downloadDriveFileServiceAccount(fileId, tempFilePath);
        await extractAudio(tempFilePath, tempAudioPath);
        const transcriptionResult = await groq.audio.transcriptions.create({
          file: fs.createReadStream(tempAudioPath),
          model: "whisper-large-v3"
        });
        transcript = transcriptionResult.text || "";
        console.log(`[Transcript Helper] Dynamic transcription success: ${transcript.length} characters.`);
        
        // Cache the transcript back to the database
        await pool.query(
          "UPDATE content_queue SET transcript = $1, updated_at = NOW() WHERE id = $2",
          [transcript, post.id]
        );
      } catch (transcribeErr) {
        console.error(`[Transcript Helper] Dynamic transcription failed:`, transcribeErr.message);
      } finally {
        if (fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
        if (fs.existsSync(tempAudioPath)) {
          try { fs.unlinkSync(tempAudioPath); } catch (e) {}
        }
      }
    }
  }
  return transcript;
}

// POST /api/content/:id/suggest-captions
async function suggestCaptions(req, res) {
  const { id } = req.params;
  const tone = req.body.tone || "engaging";
  const platform = req.body.platform || null;
  const contextInfo = req.body.contextInfo || null;

  if (!checkRateLimit(id)) {
    return res.status(429).json({ success: false, error: "Too many requests. Limit is 5 requests per content item per minute." });
  }

  try {
    const postRes = await pool.query('SELECT * FROM content_queue WHERE id = $1', [id]);
    if (!postRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Content queue item not found' });
    }
    const post = postRes.rows[0];

    const brandDetail = (await findBrandDetails(post.brand_name)) || {
      industry: "Social Media / Business",
      targetAudience: "General social media audience"
    };
    const brandVoice = (await findBrandVoice(post.brand_name)) || { tag: post.brand_name, voice: "Professional and engaging" };
    const isTanglishBrand = /tanglish|tamil/i.test(brandVoice.voice || '');

    // Dynamic video transcript extraction
    const transcript = await getOrGenerateTranscript(post);

    if (platform === 'all') {
      const primaryContent = contextInfo
        ? `USER'S DESCRIPTION OF THE VIDEO (primary source — base all content on this):\n"${contextInfo}"`
        : `Video File Name: ${post.file_name}\nVideo Transcript: "${transcript || 'No speech detected. Use the brand voice and video file name to generate relevant content.'}"`;

      const languageRule = isTanglishBrand
        ? `LANGUAGE: Write using Tanglish — Tamil words spelled in English letters only (e.g. "padikka aasaiya?", "First step edunga", "join pannunga"). Mix with English naturally. STRICTLY NO Arabic script, NO Tamil script, NO Hindi/Devanagari, NO any non-Latin characters anywhere in the output.`
        : `LANGUAGE: Write in clear, professional English ONLY. STRICTLY NO Arabic script, NO Tamil script, NO Hindi/Devanagari, NO regional language characters of any kind. Every single word must be in English Latin letters.`;

      const allPrompt = `You are the expert social media content writer for "${post.brand_name}".

BRAND: ${post.brand_name} | Industry: ${brandDetail.industry} | Audience: ${brandDetail.targetAudience}
BRAND VOICE GUIDE: ${brandVoice.voice || "Professional and engaging"}

${primaryContent}
${transcript && contextInfo ? `\nSupporting Video Transcript: "${transcript}"` : ''}

${languageRule}

Generate ALL of the following for this video post:
- Platform-specific captions (Instagram, Facebook, LinkedIn, X, YouTube)
- 5-7 professional hashtags
- YouTube title (SEO-optimised, under 100 chars)

CAPTION FORMAT RULES (Instagram & Facebook):
Every Instagram and Facebook caption MUST follow this exact structure with blank lines between each section:

Line 1: [Emoji] Strong hook title related to the video topic [Emoji]

[blank line]

Short intro sentence or context paragraph about what's in the video.

[blank line]

[Emoji] Key point or highlight 1
[Emoji] Key point or highlight 2
[Emoji] Key point or highlight 3 (add more if relevant)

[blank line]

One emotional or motivational closing sentence.

[blank line]

[Emoji] CTA line — e.g. "WhatsApp 94038 02971 to know more!" [Emoji]

ADDITIONAL RULES:
- Base everything on the user's description. Do NOT write generic filler.
- Use relevant emojis naturally throughout — not just at the start.
- LinkedIn caption: follow this exact structure with blank lines between each section:
  Line 1: Strong professional hook statement (no emoji)
  [blank line]
  Short context paragraph about the topic.
  [blank line]
  → Key insight or point 1
  → Key insight or point 2
  → Key insight or point 3
  [blank line]
  One closing thought or industry insight sentence.
  [blank line]
  CTA line — e.g. "Connect with us to learn more." or "WhatsApp 94038 02971"
- X caption: under 240 characters, punchy hook + CTA only.
- Hashtags: 5-7 tags only, mix of broad + niche + local (include #Pondicherry #TamilNadu if relevant).
- YouTube title: must describe the specific action/event/content shown in the video — NOT a generic topic label.

Respond ONLY with a valid JSON object:
{
  "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5",
  "caption": "Formatted Instagram/Facebook caption following the structure above (use \\n for line breaks)",
  "instagram_caption": "Formatted Instagram caption following the structure above (use \\n for line breaks)",
  "facebook_caption": "Formatted Facebook caption following the structure above (use \\n for line breaks)",
  "x_caption": "X (Twitter) caption under 240 chars",
  "linkedin_caption": "Structured LinkedIn caption following the format above (use \\n for line breaks)",
  "youtube_title": "Specific descriptive YouTube title — describe what is actually happening in the video, not just the topic name. E.g. 'Digital Marketing Course Presentation by Our Students' not just 'Digital Marketing Course'. Under 100 chars.",
  "description": "Detailed paragraph for YouTube description or base description",
  "thumbnail_options": [
    { "title": "Thumbnail Title 1", "layout": "Visual layout description 1" },
    { "title": "Thumbnail Title 2", "layout": "Visual layout description 2" },
    { "title": "Thumbnail Title 3", "layout": "Visual layout description 3" }
  ],
  "key_moments": [
    { "time": "00:05", "title": "Hook", "desc": "Opening hook description" },
    { "time": "00:20", "title": "Key Point", "desc": "Main value description" },
    { "time": "00:45", "title": "CTA", "desc": "Call to action description" }
  ]
}`;

      const allResponse = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: allPrompt }]
      });

      const allContent = allResponse.choices[0].message.content.trim();
      const allResult = JSON.parse(allContent);
      return res.json({ success: true, meta: allResult });
    }

    // Hashtag generation — completely separate flow
    if (platform === "hashtags") {
      const hashtagPrompt = `You are a social media hashtag strategist for "${post.brand_name}".
Brand Industry: ${brandDetail?.industry || "Business"}
Target Audience: ${brandDetail?.targetAudience || "General audience"}
Video Topic/Title: ${post.file_name}
Video Description: ${post.description || post.caption || "Brand promotion video"}
Video Transcript: ${transcript || "Not available"}

Generate 3 sets of hashtags for this post. Each set has a different strategy:
1. "reach" — broad, high-volume tags to maximise impressions
2. "engagement" — niche, topic-specific tags for higher engagement rate
3. "local" — brand + location tags for Tamil Nadu / Pondicherry audience (include #Pondicherry #TamilNadu etc. if relevant)

Rules:
- Each set must have 20-25 hashtags
- All in English only (no Tamil script characters)
- Space-separated, each starting with #
- Directly relevant to the video topic, not generic filler

Respond ONLY as valid JSON:
{
  "suggestions": [
    { "id": 1, "tone": "reach", "caption": "#tag1 #tag2 #tag3 ..." },
    { "id": 2, "tone": "engagement", "caption": "#tag1 #tag2 #tag3 ..." },
    { "id": 3, "tone": "local", "caption": "#tag1 #tag2 #tag3 ..." }
  ]
}`;

      const hashRes = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 800,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: hashtagPrompt }]
      });
      const hashResult = JSON.parse(hashRes.choices[0].message.content.trim());
      return res.json({ success: true, suggestions: hashResult.suggestions });
    }

    let prompt = `You are an expert social media copywriter. Generate 5 unique caption suggestions for a video post based on the following details:
- Brand Name: ${post.brand_name}
- Industry: ${brandDetail.industry}
- Target Audience: ${brandDetail.targetAudience}
- Brand Voice Guidelines: ${brandVoice}
- Video Title/File Name: ${post.file_name}
- Video Description: ${post.description || "Not provided"}
- Video Transcript/Speech: ${transcript || "No spoken speech detected in this video. Promote the video topic and brand."}
${contextInfo ? `- Additional Context/Instructions from User: ${contextInfo}` : ""}
- Existing Caption: ${post.caption || "Not provided"}
- Existing Hashtags: ${post.hashtags || ""}
`;

    if (platform) {
      const platformMap = {
        instagram_caption: "Instagram Post",
        facebook_caption: "Facebook Post",
        youtube_title: "YouTube Video Title",
        youtube_description: "YouTube Video Description",
        x_caption: "X (Twitter) Post",
        linkedin_caption: "LinkedIn Professional Post",
        description: "Base Video Description"
      };
      prompt += `- Target Platform/Field: ${platformMap[platform] || platform}\n`;
    }

    prompt += `
CRITICAL REQUIREMENTS:
- Your suggestions MUST be deeply related to the actual video topic, title/file name, and the video transcript.
- Do NOT output generic brand-only promotion text. Use the brand guidelines for styling, but write completely original hooks and CTAs centered around the specific content and topics discussed in this video.
- Do NOT just copy the example sentences from the guidelines.
`;

    if (platform === "instagram_caption" || platform === "facebook_caption") {
      prompt += `
CRITICAL RULES FOR INSTAGRAM/FACEBOOK:
- Focus heavily on an engaging, high-energy hook in the first line.
- Use a conversational tone${isTanglishBrand ? ', mixing in Tanglish/local slang per the brand voice' : ''}.
- End with a clear call-to-action to WhatsApp (e.g. "WhatsApp 94038 02971 to join now!").
`;
    } else if (platform === "youtube_description") {
      prompt += `
CRITICAL RULES FOR YOUTUBE DESCRIPTION:
- Generate SEO keyword-rich descriptions using search terms related to the video topic (e.g., 'digital marketing course Pondicherry', 'job guarantee training Tamil Nadu', 'LeadOS automation').
- Include details about what is taught/shown in the video.
- Add a Call to Action (CTA) linking to WhatsApp (e.g. "WhatsApp 94038 02971 to join now!").
- Do NOT make it short; make it a comprehensive descriptive text.
`;
    } else if (platform === "youtube_title") {
      prompt += `
CRITICAL RULES FOR YOUTUBE TITLE:
- Generate short, high-CTR, SEO-optimized title ideas.
- MUST be strictly under 100 characters.
- Do NOT use hashtags in the title.
- Do NOT include WhatsApp phone numbers in the title.
`;
    } else if (platform === "x_caption") {
      prompt += `
CRITICAL RULES FOR X (TWITTER):
- MUST be strictly under 240 characters.
- Do NOT use more than 1-2 hashtags.
- Keep it extremely punchy, short, and to the point.
`;
    } else if (platform === "linkedin_caption") {
      prompt += `
CRITICAL RULES FOR LINKEDIN:
- Use a professional, authoritative B2B business tone.
- Emphasize the career growth, job placement, agency positioning (BM TechX), or technical value.
- Do NOT use excessive emojis or slang.
`;
    }

    if (isTanglishBrand) {
      prompt += `
CRITICAL LANGUAGE & SCRIPT REQUIREMENT:
- Write using Tanglish — Tamil words spelled in ENGLISH LETTERS only (e.g., "programming padikka aasaiya?", "job guarantee ready!", "First step edunga"). Mix naturally with English.
- STRICTLY FORBIDDEN: Arabic script, Tamil script, Hindi/Devanagari, or ANY non-Latin characters. Every character in the output must be a standard Latin letter, number, emoji, or punctuation mark.
`;
      if (platform !== "youtube_title" && platform !== "x_caption") {
        prompt += `
- Across the 5 suggestions, vary the language split:
  - 1-2 options in pure conversational English.
  - 2-3 options mixing Tanglish (Tamil words in English letters) with English.
`;
      }
      prompt += `
- The tone must be energetic, direct, and conversational. Avoid any textbook or formal tone.
`;
    } else {
      prompt += `
CRITICAL LANGUAGE REQUIREMENT:
- Write all captions in clear, professional English ONLY.
- STRICTLY FORBIDDEN: Arabic script, Tamil script, Hindi/Devanagari, or ANY non-Latin characters. Every character must be a standard Latin letter, number, emoji, or punctuation.
- Do NOT use Tanglish or any regional slang. Standard business English only.
- The tone must be professional, authoritative, and audience-appropriate.
`;
    }

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
  const contextInfo = req.body.contextInfo || null;

  if (!checkRateLimit(id)) {
    return res.status(429).json({ success: false, error: "Too many requests. Limit is 5 requests per content item per minute." });
  }

  try {
    const postRes = await pool.query('SELECT * FROM content_queue WHERE id = $1', [id]);
    if (!postRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Content queue item not found' });
    }
    const post = postRes.rows[0];

    const brandDetail = (await findBrandDetails(post.brand_name)) || {
      industry: "Social Media / Business",
      targetAudience: "General social media audience"
    };
    const brandVoice = (await findBrandVoice(post.brand_name))?.voice || "Professional and engaging";
    const transcript = await getOrGenerateTranscript(post);

    let prompt = `You are an expert social media copywriter. Generate 5 unique Instagram Story sets (each set consisting of 3 slides: story_1, story_2, and story_3) to promote a video post based on the following details:
- Brand Name: ${post.brand_name}
- Industry: ${brandDetail.industry}
- Target Audience: ${brandDetail.targetAudience}
- Brand Voice Guidelines: ${brandVoice}
- Video Title/File Name: ${post.file_name}
- Video Description: ${post.description || "Not provided"}
- Video Transcript/Speech: ${transcript || "No spoken speech detected in this video. Promote the video topic and brand."}
${contextInfo ? `- Additional Context/Instructions from User: ${contextInfo}` : ""}
- Existing Caption: ${post.caption || "Not provided"}
- Existing Hashtags: ${post.hashtags || ""}
 
- Your suggestions MUST be deeply related to the actual video topic, title/file name, and the video transcript.
- Do NOT output generic brand-only promotion text. Use the brand guidelines for styling, but write completely original hooks and CTAs centered around the specific content and topics discussed in this video.
- Do NOT just copy the example sentences from the guidelines.
- STRICTLY FORBIDDEN in ALL output: Arabic script, Tamil script, Hindi/Devanagari, or any non-Latin characters. Every character must be a standard Latin letter, number, emoji, or punctuation.
${isTanglishBrand
  ? `- Write using Tanglish — Tamil words in English letters only (e.g. "padikka aasaiya?", "First step edunga") mixed with English. NO actual script of any language.
- Vary the 5 suggestions: 1-2 pure English, 2-3 Tanglish-English mix.
- The tone must be energetic, direct, and conversational.`
  : `- Write all story slides in clear, professional English ONLY. No Tanglish, no regional slang.
- The tone must be professional, authoritative, and audience-appropriate.`
}
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

function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const stream = metadata.streams.find(s => s.codec_type === 'video');
      if (!stream) return reject(new Error('No video stream found'));
      const duration = metadata.format.duration || stream.duration;
      const width = stream.width;
      const height = stream.height;
      resolve({ duration: parseFloat(duration), width, height });
    });
  });
}

function getGoogleOAuthClient(req) {
  let apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3600';
    apiBase = `${proto}://${host}`;
  }
  const redirectUri = `${apiBase}/api/content/youtube/callback`;
  
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

function handleYoutubeAuth(req, res) {
  const brandName = req.query.brand_name || '';
  const oauth2Client = getGoogleOAuthClient(req);
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    prompt: 'consent select_account',
    state: brandName
  });
  res.redirect(url);
}

async function handleYoutubeCallback(req, res) {
  const { code, state: brandName } = req.query;
  const portalUrl = process.env.PORTAL_URL || 'https://leados-app.abmgroups.org';

  if (!code) {
    return res.redirect(`${portalUrl}/admin/content-os/social-connection?youtube_error=missing_code`);
  }

  try {
    const oauth2Client = getGoogleOAuthClient(req);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelRes = await youtube.channels.list({
      part: 'snippet',
      mine: true
    });

    if (!channelRes.data.items || channelRes.data.items.length === 0) {
      throw new Error('No YouTube channel found for this Google account.');
    }

    const channel = channelRes.data.items[0];
    const channelId = channel.id;
    const channelTitle = channel.snippet.title;

    const encryptedTokens = cryptoHelper.encrypt(JSON.stringify(tokens));

    await pool.query(
      `INSERT INTO brand_social_accounts (brand_name, platform, account_name, account_id, access_token, token_expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (brand_name, platform, account_name) 
       DO UPDATE SET account_id = EXCLUDED.account_id, access_token = EXCLUDED.access_token, token_expires_at = EXCLUDED.token_expires_at, is_active = true`,
      [
        brandName || 'BM Academy',
        'youtube',
        channelTitle,
        channelId,
        encryptedTokens,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null
      ]
    );

    console.log(`[YouTube OAuth] Successfully connected channel "${channelTitle}" for brand "${brandName || 'BM Academy'}"`);

    res.redirect(`${portalUrl}/admin/content-os/social-connection?youtube_success=true&channel=${encodeURIComponent(channelTitle)}`);
  } catch (err) {
    console.error('[YouTube OAuth Callback Error]:', err);
    res.redirect(`${portalUrl}/admin/content-os/social-connection?youtube_error=${encodeURIComponent(err.message)}`);
  }
}

async function getFreshYoutubeClient(encryptedTokens) {
  let tokens;
  try {
    tokens = JSON.parse(cryptoHelper.decrypt(encryptedTokens));
  } catch (decErr) {
    throw new Error(`YouTube credentials decryption failed: ${decErr.message}`);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials(tokens);

  const isExpired = tokens.expiry_date ? (tokens.expiry_date - Date.now() < 300000) : true;
  if (isExpired && tokens.refresh_token) {
    console.log('[YouTube Token] Access token expired or expiring soon. Refreshing...');
    try {
      const refreshRes = await oauth2Client.refreshAccessToken();
      const newCredentials = refreshRes.credentials;
      const updatedTokens = {
        ...tokens,
        ...newCredentials
      };
      
      const encryptedNewTokens = cryptoHelper.encrypt(JSON.stringify(updatedTokens));
      
      await pool.query(
        `UPDATE brand_social_accounts 
         SET access_token = $1, token_expires_at = $2 
         WHERE access_token = $3`,
        [
          encryptedNewTokens,
          newCredentials.expiry_date ? new Date(newCredentials.expiry_date) : null,
          encryptedTokens
        ]
      );
      
      oauth2Client.setCredentials(updatedTokens);
      console.log('[YouTube Token] Access token refreshed and saved successfully.');
    } catch (refreshErr) {
      console.error('[YouTube Token] Failed to refresh access token:', refreshErr.message);
      throw new Error(`YouTube token refresh failed: ${refreshErr.message}`);
    }
  } else if (isExpired && !tokens.refresh_token) {
    throw new Error('YouTube session expired. Please reconnect your channel to get a fresh login.');
  }

  return oauth2Client;
}

async function publishVideoToYouTube(oauth2Client, { title, description, localVideoPath }) {
  console.log(`[YouTube Publish] Starting YouTube video upload for file: ${localVideoPath}`);
  
  let isShort = false;
  try {
    const meta = await getVideoMetadata(localVideoPath);
    console.log(`[YouTube Publish] Video metadata: duration=${meta.duration}s, size=${meta.width}x${meta.height}`);
    if (meta.duration <= 60 && meta.height > meta.width) {
      isShort = true;
      console.log(`[YouTube Publish] Video classified as YouTube SHORT.`);
    }
  } catch (err) {
    console.warn(`[YouTube Publish] Failed to probe video metadata:`, err.message);
  }

  let finalDescription = description || '';
  if (isShort && !finalDescription.toLowerCase().includes('#shorts')) {
    finalDescription = `${finalDescription}\n\n#Shorts`.trim();
    console.log(`[YouTube Publish] Appended #Shorts to description.`);
  }

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  
  let cleanTitle = (title || 'New Social Video').trim();
  if (cleanTitle.length > 100) {
    cleanTitle = cleanTitle.substring(0, 97) + '...';
    console.log(`[YouTube Publish] Truncated title to 100 characters to meet YouTube limits: "${cleanTitle}"`);
  }

  try {
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: cleanTitle,
          description: finalDescription,
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(localVideoPath)
      }
    });

    console.log(`[YouTube Publish] Upload success. Video ID: ${response.data.id}`);
    return {
      success: true,
      post_id: response.data.id
    };
  } catch (err) {
    console.error(`[YouTube Publish] API insertion failed:`, err);
    const errorMsg = err.errors?.[0]?.message || err.message || '';
    const isQuota = errorMsg.toLowerCase().includes('quota') || err.code === 403;
    if (isQuota) {
      const quotaErr = new Error(`YouTube API Upload Quota Exceeded (default is 10,000 units / ~6 uploads per day). Please request a quota increase from Google Cloud Console.`);
      quotaErr.code = 'QUOTA_EXCEEDED';
      throw quotaErr;
    }
    throw err;
  }
}

// ── Delete Post from All Platforms ──────────────────────────────────────────

async function deletePost(req, res) {
  const { id } = req.params;
  try {
    const postRes = await pool.query('SELECT * FROM content_queue WHERE id = $1', [id]);
    if (!postRes.rows.length) return res.status(404).json({ success: false, error: 'Post not found' });
    const post = postRes.rows[0];

    // Get all successfully published jobs with their platform post IDs
    const jobsRes = await pool.query(
      `SELECT pq.channel, pq.post_id, bsa.access_token, bsa.instagram_business_id, bsa.facebook_page_id, bsa.account_id, bsa.platform
       FROM publish_queue pq
       LEFT JOIN brand_social_accounts bsa ON (
         LOWER(REPLACE(REPLACE(bsa.brand_name,' ',''),'-','_')) = LOWER(REPLACE(REPLACE($2,' ',''),'-','_'))
         AND (
           (pq.channel IN ('instagram','instagram_post','instagram_story') AND bsa.platform = 'instagram') OR
           (pq.channel IN ('facebook','facebook_post','facebook_story') AND bsa.platform = 'facebook') OR
           (pq.channel = 'youtube' AND bsa.platform = 'youtube') OR
           (pq.channel = 'linkedin' AND bsa.platform = 'linkedin')
         )
       )
       WHERE pq.content_id = $1 AND pq.status IN ('success','partial') AND pq.post_id IS NOT NULL`,
      [id, post.brand_name]
    );

    const results = [];

    for (const job of jobsRes.rows) {
      if (!job.post_id || !job.access_token) {
        results.push({ channel: job.channel, status: 'skipped', reason: 'No post ID or token' });
        continue;
      }

      let decryptedToken;
      try {
        decryptedToken = cryptoHelper.decrypt(job.access_token);
      } catch {
        results.push({ channel: job.channel, status: 'skipped', reason: 'Token decryption failed' });
        continue;
      }

      try {
        if (job.channel === 'instagram' || job.channel === 'instagram_post' || job.channel === 'instagram_story') {
          await axios.delete(`https://graph.facebook.com/v19.0/${job.post_id}`, {
            params: { access_token: decryptedToken }
          });
          results.push({ channel: job.channel, status: 'deleted' });

        } else if (job.channel === 'facebook' || job.channel === 'facebook_post' || job.channel === 'facebook_story') {
          await axios.delete(`https://graph.facebook.com/v19.0/${job.post_id}`, {
            params: { access_token: decryptedToken }
          });
          results.push({ channel: job.channel, status: 'deleted' });

        } else if (job.channel === 'youtube') {
          const oauth2Client = await getFreshYoutubeClient(job.access_token); // passes encrypted tokens; getFreshYoutubeClient handles decryption internally
          const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
          await youtube.videos.delete({ id: job.post_id });
          results.push({ channel: job.channel, status: 'deleted' });

        } else if (job.channel === 'linkedin') {
          const encodedUrn = encodeURIComponent(job.post_id);
          await axios.delete(`https://api.linkedin.com/v2/ugcPosts/${encodedUrn}`, {
            headers: { Authorization: `Bearer ${decryptedToken}`, 'X-Restli-Protocol-Version': '2.0.0' }
          });
          results.push({ channel: job.channel, status: 'deleted' });

        } else {
          results.push({ channel: job.channel, status: 'skipped', reason: 'Platform not supported for deletion' });
        }

        await pool.query(
          "UPDATE publish_queue SET status = 'deleted', updated_at = NOW() WHERE content_id = $1 AND channel = $2",
          [id, job.channel]
        );
      } catch (platformErr) {
        const errMsg = platformErr.response?.data?.error?.message || platformErr.message;
        console.error(`[deletePost] Failed to delete from ${job.channel}:`, errMsg);
        results.push({ channel: job.channel, status: 'failed', reason: errMsg });
      }
    }

    // Mark post as DELETED in content_queue
    await pool.query(
      "UPDATE content_queue SET status = 'DELETED', updated_at = NOW() WHERE id = $1",
      [id]
    );

    res.json({ success: true, results });
  } catch (err) {
    console.error('[deletePost] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ── LinkedIn OAuth & Publishing ──────────────────────────────────────────────

async function handleLinkedInAuth(req, res) {
  const { brand_name } = req.query;
  if (!brand_name) return res.status(400).json({ error: 'brand_name is required' });

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'LINKEDIN_CLIENT_ID not configured' });

  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.API_BASE_URL}/api/content/linkedin/callback`;
  // Using modern OpenID scopes instead of deprecated r_liteprofile, and removing restricted r_organization_social
  const scope = 'openid profile email w_member_social';
  const state = Buffer.from(JSON.stringify({ brand_name })).toString('base64url');

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(authUrl);
}

async function handleLinkedInCallback(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/admin/content-os/social-connection?linkedin_error=${encodeURIComponent(error)}`);
  }

  let brand_name = '';
  if (state) {
    try { brand_name = JSON.parse(Buffer.from(state, 'base64url').toString()).brand_name || ''; } catch {}
  }

  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.API_BASE_URL}/api/content/linkedin/callback`;

    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, expires_in } = tokenRes.data;
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000);

    // Get personal profile (OpenID Connect)
    const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const personUrn = `urn:li:person:${profileRes.data.sub}`;
    const personName = `${profileRes.data.given_name || ''} ${profileRes.data.family_name || ''}`.trim();

    // Try to fetch organization pages (company pages where user is admin)
    let authorUrn = personUrn;
    let accountName = personName;
    try {
      const orgRes = await axios.get(
        'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(id,localizedName)))',
        { headers: { Authorization: `Bearer ${access_token}`, 'X-Restli-Protocol-Version': '2.0.0' } }
      );
      const elements = orgRes.data?.elements || [];
      if (elements.length > 0) {
        const org = elements[0]['organization~'];
        if (org) {
          authorUrn = `urn:li:organization:${org.id}`;
          accountName = org.localizedName || accountName;
        }
      }
    } catch (orgErr) {
      console.log('[LinkedIn Callback] Could not fetch org pages (using personal profile):', orgErr.message);
    }

    const encryptedToken = cryptoHelper.encrypt(access_token);

    if (brand_name) {
      await pool.query(
        `INSERT INTO brand_social_accounts (brand_name, platform, account_name, account_id, access_token, token_expires_at, is_active)
         VALUES ($1, 'linkedin', $2, $3, $4, $5, true)
         ON CONFLICT (brand_name, platform, account_name)
         DO UPDATE SET account_id = EXCLUDED.account_id, access_token = EXCLUDED.access_token,
                       token_expires_at = EXCLUDED.token_expires_at, is_active = true`,
        [brand_name, accountName, authorUrn, encryptedToken, tokenExpiresAt]
      );
    }

    const portalUrl = process.env.PORTAL_URL || 'https://leados-app.abmgroups.org';
    res.redirect(
      `${portalUrl}/admin/content-os/social-connection?linkedin_success=1&channel=${encodeURIComponent(accountName)}&brand=${encodeURIComponent(brand_name)}`
    );
  } catch (err) {
    console.error('[LinkedIn Callback Error]:', err.response?.data || err.message);
    res.redirect(`/admin/content-os/social-connection?linkedin_error=${encodeURIComponent(err.message)}`);
  }
}

async function publishToLinkedIn(authorUrn, accessToken, { caption, videoUrl }) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0'
  };

  // Try direct video upload
  try {
    console.log(`[LinkedIn] Registering video upload for ${authorUrn}...`);
    const registerRes = await axios.post(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
          owner: authorUrn,
          serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }]
        }
      },
      { headers }
    );

    const uploadUrl = registerRes.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const assetUrn = registerRes.data.value.asset;

    console.log(`[LinkedIn] Downloading video from ${videoUrl}...`);
    const videoData = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });

    console.log(`[LinkedIn] Uploading video to LinkedIn... (${videoData.data.byteLength} bytes)`);
    await axios.put(uploadUrl, videoData.data, {
      headers: { 'Content-Type': 'video/mp4' },
      maxBodyLength: Infinity,
      timeout: 300000
    });

    console.log(`[LinkedIn] Creating video UGC post...`);
    const postRes = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: caption },
            shareMediaCategory: 'VIDEO',
            media: [{
              status: 'READY',
              media: assetUrn,
              description: { text: caption.substring(0, 200) },
              title: { text: 'Video Post' }
            }]
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      },
      { headers }
    );

    const postId = postRes.headers['x-restli-id'] || postRes.data.id;
    console.log(`[LinkedIn] Video post published. ID: ${postId}`);
    return { success: true, post_id: postId };

  } catch (videoErr) {
    console.warn('[LinkedIn] Video upload failed, falling back to text post:', videoErr.response?.data || videoErr.message);

    // Fallback: plain text post with video URL appended
    const postRes = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: `${caption}\n\n${videoUrl}` },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      },
      { headers }
    );

    const postId = postRes.headers['x-restli-id'] || postRes.data.id;
    console.log(`[LinkedIn] Text post (fallback) published. ID: ${postId}`);
    return { success: true, post_id: postId, warning: 'Posted as text link (direct video upload failed)' };
  }
}

async function generateThumbnails(req, res) {
  const { id } = req.params;
  const uploadsDir = path.join(__dirname, '../uploads');
  const baseUrl = process.env.API_BASE_URL || 'https://leados-api.abmgroups.org';

  try {
    const { rows } = await pool.query(
      `SELECT video_url, public_video_url FROM content_queue WHERE id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Content not found' });

    const item = rows[0];
    const driveFileId = extractDriveFileId(item.video_url);
    const localPath = driveFileId ? path.join(uploadsDir, `transcoded_${driveFileId}.mp4`) : null;

    if (!localPath || !fs.existsSync(localPath)) {
      return res.status(400).json({ error: 'Transcoded video not found on server. Please wait for processing to complete.' });
    }

    // Get video duration via ffprobe
    const duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(localPath, (err, meta) => {
        if (err) reject(err);
        else resolve(meta.format.duration || 30);
      });
    });

    // Extract 4 frames spread across the video (avoid very start/end)
    const pcts = [0.1, 0.3, 0.6, 0.85];
    const timestamps = pcts.map(p => Math.max(1, Math.floor(duration * p)));

    const results = await Promise.all(
      timestamps.map((ts, i) => new Promise((resolve) => {
        const framePath = path.join(uploadsDir, `frame_${id}_${i}.jpg`);
        ffmpeg(localPath)
          .seekInput(ts)
          .frames(1)
          .size('1280x720')
          .aspect('16:9')
          .autopad()
          .output(framePath)
          .on('end', () => resolve(`${baseUrl}/uploads/frame_${id}_${i}.jpg`))
          .on('error', (err) => {
            console.warn(`[generateThumbnails] Frame ${i} failed:`, err.message);
            resolve(null);
          })
          .run();
      }))
    );

    const thumbnails = results.filter(Boolean);
    if (!thumbnails.length) return res.status(500).json({ error: 'Frame extraction failed — try again' });

    res.json({ success: true, thumbnails });
  } catch (err) {
    console.error('[generateThumbnails] Error:', err);
    res.status(500).json({ error: err.message });
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
  resolvePublicUrl,
  isTransientMetaError,
  publishToInstagram,
  publishReelToFacebook,
  publishToInstagramWithRetry,
  publishReelToFacebookWithRetry,
  waitForFacebookReel,
  handleYoutubeAuth,
  handleYoutubeCallback,
  getFreshYoutubeClient,
  publishVideoToYouTube,
  handleLinkedInAuth,
  handleLinkedInCallback,
  publishToLinkedIn,
  deletePost,
  runBackgroundPublish,
  updateOverallPostStatus,
  generateThumbnails
};
