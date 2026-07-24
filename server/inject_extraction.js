const fs = require('fs');
const path = require('path');

const salesosPath = path.join(__dirname, 'routes', 'salesos.js');
let content = fs.readFileSync(salesosPath, 'utf8');

const targetStr = `router.post('/ai/response', async (req, res) => {
    const { brand, intent, message, kb_snippets, lead_id, chat_history } = req.body;
    try {
      if (!ai) return res.json({ ...req.body, ai_reply: "AI is currently offline. We will get back to you shortly!" });
  
      let historyText = "";
      if (chat_history && Array.isArray(chat_history)) {
        historyText = "Chat History:\\n" + chat_history.map(h => \`\${h.role}: \${h.text}\`).join("\\n") + "\\n\\n";
      }
  
      const prompt = \`System Prompt (ABM Groups Knowledge Base):\\n\${kb_snippets}\\n\\n\${historyText}User Intent detected: \${intent}\\n\\nUser Message: "\${message}"\\n\\nWrite a short, friendly WhatsApp reply mimicking a human sales assistant. End with exactly one question to keep the conversation going.\`;
  
      const ai_reply = await generateGeminiContent(prompt);
      res.json({ ...req.body, ai_reply });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });`;

const replacementStr = `router.post('/ai/response', async (req, res) => {
    const { brand, intent, message, kb_snippets, lead_id, chat_history } = req.body;
    try {
      if (!ai) return res.json({ ...req.body, ai_reply: "AI is currently offline. We will get back to you shortly!" });
  
      let historyText = "";
      if (chat_history && Array.isArray(chat_history)) {
        historyText = "Chat History:\\n" + chat_history.map(h => \`\${h.role}: \${h.text}\`).join("\\n") + "\\n\\n";
      }
  
      const prompt = \`System Prompt (ABM Groups Knowledge Base):\\n\${kb_snippets}\\n\\n\${historyText}User Intent detected: \${intent}\\n\\nUser Message: "\${message}"\\n\\n
      INSTRUCTIONS: 
      1. Write a short, friendly WhatsApp reply mimicking a human sales assistant. End with exactly one question to keep the conversation going.
      2. If the user provided their name in the message (or recently in the chat), extract it.
      3. If the user provided a preferred date/time for a call/meeting, extract it and convert it to a standard ISO 8601 UTC timestamp format (e.g. 2026-07-25T16:00:00Z). Assume the current year is 2026 if not specified.
      4. You MUST return your response as a raw JSON object with the following keys exactly:
      {
        "reply": "your generated reply message here",
        "extracted_name": "John Doe", (or null if not found)
        "extracted_booking_time": "2026-07-25T16:00:00Z" (or null if not found)
      }
      Respond ONLY with the JSON object, no markdown formatting, no backticks.\`;
  
      const rawAiResponse = await generateGeminiContent(prompt);
      
      let ai_reply = "I'm sorry, I couldn't process that. Can you repeat?";
      let extractedData = null;

      try {
        // Strip markdown backticks if Gemini includes them
        const cleanJsonStr = rawAiResponse.replace(/\\s*\`\`\`json\\s*/g, '').replace(/\\s*\`\`\`\\s*/g, '');
        extractedData = JSON.parse(cleanJsonStr);
        ai_reply = extractedData.reply;

        // Auto-save Extracted Data
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
        // Fallback if JSON parsing fails
        ai_reply = rawAiResponse; 
      }

      res.json({ ...req.body, ai_reply });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(salesosPath, content, 'utf8');
console.log('Successfully injected automated extraction logic into /ai/response');
