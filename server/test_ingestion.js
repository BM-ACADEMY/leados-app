// server/test_ingestion.js
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const pool = require('./db/connection');
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.OPENAI_API_KEY || "dummy_key" });

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

async function downloadGoogleDriveFile(fileId, destPath) {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  let response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  const contentType = response.headers['content-type'] || '';
  if (contentType.includes('text/html')) {
    let html = '';
    await new Promise((resolve) => {
      response.data.on('data', chunk => { html += chunk; });
      response.data.on('end', resolve);
    });

    const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
    if (confirmMatch && confirmMatch[1]) {
      const confirmToken = confirmMatch[1];
      const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
      response = await axios({
        method: 'GET',
        url: confirmUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
    } else {
      throw new Error("Could not download file. Ensure it is shared as 'Anyone with the link can view/download'.");
    }
  }

  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function testIngestion() {
  const folderId = process.argv[2];
  if (!folderId) {
    console.error("❌ Error: Please provide a Google Drive Folder ID.");
    console.log("Example: node test_ingestion.js 1A2B3C4D5E6F7G8H9I0J");
    process.exit(1);
  }

  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: GOOGLE_PAGESPEED_API_KEY is not defined in .env");
    process.exit(1);
  }

  console.log(`🔍 1. Querying Google Drive files in folder: ${folderId}...`);
  const driveUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'video'+and+trashed=false&key=${apiKey}`;
  
  let files = [];
  try {
    const res = await axios.get(driveUrl);
    files = res.data.files || [];
    console.log(`✅ Success! Found ${files.length} video files in the folder.`);
    console.log(files);
  } catch (err) {
    console.error("❌ Google Drive API Query Failed:", err.response ? err.response.data : err.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("⚠️ No videos found in the folder. Please add a test video first.");
    process.exit(0);
  }

  const testFile = files[0];
  console.log(`\n📥 2. Testing file download for first video: "${testFile.name}" (ID: ${testFile.id})...`);
  const tempFilePath = path.join(os.tmpdir(), `test_download_${testFile.id}.mp4`);

  try {
    await downloadGoogleDriveFile(testFile.id, tempFilePath);
    console.log(`✅ File downloaded successfully to: ${tempFilePath}`);
  } catch (err) {
    console.error("❌ Download Failed:", err.message);
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    process.exit(1);
  }

  console.log(`\n🗣️ 3. Testing Groq Whisper transcription...`);
  try {
    const transcriptionResult = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3"
    });
    console.log(`✅ Transcription Succeeded: "${transcriptionResult.text || ""}"`);
  } catch (err) {
    console.error("❌ Groq Whisper Failed:", err.message);
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log(`🧹 Cleaned up temporary file: ${tempFilePath}`);
    }
  }

  console.log("\n🎉 Ingestion configuration check completed!");
}

testIngestion();
