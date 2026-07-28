const fs = require('fs');
const path = require('path');

const salesosPath = path.join(__dirname, 'routes', 'salesos.js');
let content = fs.readFileSync(salesosPath, 'utf8');

const regex = /router\.post\('\/ai\/response', async \(req, res\) => \{[\s\S]*?res\.json\(\{ \.\.\.req\.body, ai_reply \}\);\n    \} catch \(err\) \{\n      res\.status\(500\)\.json\(\{ error: err\.message \}\);\n    \}\n  \}\);/g;

const replacement = `router.post('/ai/response', async (req, res) => {
    const { brand, intent, message, kb_snippets, lead_id, chat_history } = req.body;
    try {
      if (!ai) return res.json({ ...req.body, ai_reply: "AI is currently offline. We will get back to you shortly!" });
  
      let historyText = "";
      if (chat_history && Array.isArray(chat_history)) {
        historyText = "Chat History:\\n" + chat_history.map(h => \`\${h.role}: \${h.text}\`).join("\\n") + "\\n\\n";
      }
  
      const prompt = \`System Prompt (ABM Groups Knowledge Base):\\n\${kb_snippets}\\n\\n\${historyText}User Intent detected: \${intent}\\n\\nUser Message: "\${message}"\\n\\n
      CRITICAL BEHAVIOR SPECIFICATIONS:
      1. Greeting: Mirror the user's opener (e.g. "hi" -> "Hi!", "hello" -> "Hello!"). Keep it to one short line. Do NOT open with "Vanakkam, this is ABM Groups" or list all brands on every message. Only fall back to full brand list if intent is genuinely unclear.
      2. Brand detection: Only switch brands if the new message clearly contains a different brand keyword (BM Academy, BM TechX, CoreTalents, Namma Pondy Properties, TravellersNeed, Dada's Kitchen, EduConsultants, BM Foundation). Otherwise, stick to the locked brand.
      3. Conversation memory: Never ask for something already provided (e.g., don't ask the time slot again after the user gave "4pm", or name if already given).
      4. Fallbacks: If it's a voice note (audio), reply: "Got your voice note 🎧 — could you type it quickly so I can help right away?". If unclear, ask ONE short clarifying question.
      5. Tone: Write a short, friendly WhatsApp reply mimicking a human sales assistant. End with exactly one question to keep the conversation going.
      
      JSON OUTPUT REQUIREMENT:
      You MUST return your response as a raw JSON object with the following keys exactly:
      {
        "reply": "your generated reply message following the behavior specs",
        "extracted_name": "John Doe", (or null if the user has not provided their name)
        "extracted_booking_time": "2026-07-25T16:00:00Z" (or null if the user has not provided a preferred date/time for a call)
      }
      Respond ONLY with the JSON object, no markdown formatting, no backticks.\`;
  
      const rawAiResponse = await generateGeminiContent(prompt);
      
      let ai_reply = "I'm sorry, I couldn't process that. Can you repeat?";
      let extractedData = null;

      try {
        const cleanJsonStr = rawAiResponse.replace(/\\s*\`\`\`json\\s*/gi, '').replace(/\\s*\`\`\`\\s*/g, '').trim();
        extractedData = JSON.parse(cleanJsonStr);
        ai_reply = extractedData.reply || rawAiResponse;

        if (lead_id) {
           if (extractedData.extracted_name) {
             await pool.query(\`UPDATE leads SET name = $1 WHERE id = $2\`, [extractedData.extracted_name, lead_id]);
           }
           if (extractedData.extracted_booking_time) {
             await pool.query(\`UPDATE leads SET call_booked_at = $1 WHERE id = $2\`, [extractedData.extracted_booking_time, lead_id]);
           }
        }
      } catch (parseErr) {
        console.error("Failed to parse Gemini JSON:", parseErr.message, rawAiResponse);
        ai_reply = rawAiResponse; 
      }

      res.json({ ...req.body, ai_reply });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });`;

if (content.match(regex)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(salesosPath, content, 'utf8');
    console.log('Successfully applied Behaviour Spec and JSON Extraction to salesos.js');
} else {
    console.log('Regex failed to match');
}
