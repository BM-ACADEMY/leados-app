const pool = require('./db/connection');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.OPENAI_API_KEY || "dummy_key" });
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
ffmpeg.setFfmpegPath(ffmpegPath);

// Import helper functions
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
  const credPath = path.join(__dirname, '../server/credentials/jobportal-492311-465d0e8c2633.json');
  if (fs.existsSync(credPath)) {
    return new google.auth.GoogleAuth({
      keyFile: credPath,
      scopes
    });
  }
  const envCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_CREDS_JSON;
  if (envCreds) {
    const credentials = typeof envCreds === 'string' ? JSON.parse(envCreds) : envCreds;
    return new google.auth.GoogleAuth({
      credentials,
      scopes
    });
  }
  return null;
}

async function downloadDriveFileServiceAccount(fileId, destPath) {
  const auth = getGoogleAuth();
  if (!auth) throw new Error('No credentials');
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
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(1)
      .frames(1)
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

async function testIngest() {
  const fileId = '1f7UhQ4gKqWgHdYA_A7WPzo3inGbUsz0k';
  const fileName = 'WhatsApp Video 2026-06-19 at 12.31.21.mp4';
  
  console.log("1. Deleting existing database rows...");
  await pool.query("DELETE FROM content_queue WHERE drive_file_id = $1", [fileId]);
  console.log("Deleted old rows.");
  
  console.log("2. Running single ingestion...");
  const tempFilePath = path.join(os.tmpdir(), `test_drive_video_${fileId}.mp4`);
  
  try {
    console.log("Downloading file...");
    await downloadDriveFileServiceAccount(fileId, tempFilePath);
    
    console.log("Transcoding video...");
    const localTranscodedPath = path.join(__dirname, '../server/uploads', `transcoded_${fileId}.mp4`);
    if (fs.existsSync(localTranscodedPath)) fs.unlinkSync(localTranscodedPath);
    await transcodeVideo(tempFilePath, localTranscodedPath);
    console.log("Transcoding success.");
    
    console.log("Generating thumbnail...");
    const localThumbnailPath = path.join(__dirname, '../server/uploads', `thumbnail_${fileId}.jpg`);
    if (fs.existsSync(localThumbnailPath)) fs.unlinkSync(localThumbnailPath);
    
    try {
      await generateThumbnail(localTranscodedPath, localThumbnailPath);
      console.log("Thumbnail generation success!");
    } catch (e) {
      console.error("Thumbnail generation failed with error:", e.message);
    }
  } catch (err) {
    console.error("Ingestion failed:", err);
  } finally {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    await pool.end();
  }
}

testIngest().catch(console.error);
