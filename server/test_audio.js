require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const pool = new Pool({
  user: 'leados_user', host: 'leados-api.abmgroups.org', database: 'leados_db', password: 'LeadOS_DB@2026', port: 5432
});

async function run() {
  try {
    const res = await pool.query("SELECT media_url, wa_msg_id FROM messages WHERE msg_type = 'audio' ORDER BY id DESC LIMIT 1");
    if (res.rows.length === 0) return console.log("No audio messages found.");
    
    const mediaUrl = res.rows[0].media_url; // https://graph.facebook.com/v18.0/<media_id>
    const mediaId = mediaUrl.split('/').pop();
    console.log("Media ID:", mediaId);

    const waToken = process.env.META_PAGE_ACCESS_TOKEN; // using default for test

    // 1. Fetch URL
    const mediaRes = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${waToken}` }
    });
    
    console.log("Media URL:", mediaRes.data.url);

    // 2. Download
    const audioRes = await axios.get(mediaRes.data.url, {
      headers: { Authorization: `Bearer ${waToken}` },
      responseType: 'arraybuffer'
    });

    const tempPath = path.join(__dirname, 'uploads', `test_audio.ogg`);
    fs.writeFileSync(tempPath, Buffer.from(audioRes.data));
    console.log("Downloaded to", tempPath, "- Size:", fs.statSync(tempPath).size);

    // 3. Transcribe
    const groq = new Groq({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-large-v3'
    });

    console.log("Transcription:", transcription.text);
    fs.unlinkSync(tempPath);
    
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  } finally {
    process.exit(0);
  }
}
run();
