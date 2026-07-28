const fs = require('fs');
const path = require('path');

const salesosPath = path.join(__dirname, 'routes', 'salesos.js');
let content = fs.readFileSync(salesosPath, 'utf8');

// The exact string in salesos.js (from Get-Content)
const searchStr = 'Write a short, friendly WhatsApp reply mimicking a human sales assistant. End with exactly one question to keep the conversation going.';

const insertStr = `
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
      Respond ONLY with the JSON object, no markdown formatting, no backticks.`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, insertStr);
    
    // Now also inject the JSON parsing and DB updates
    const replaceJsonLogicSearch = `const ai_reply = await generateGeminiContent(prompt);\n      res.json({ ...req.body, ai_reply });`;
    
    const replaceJsonLogicInsert = `const rawAiResponse = await generateGeminiContent(prompt);
      
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

      res.json({ ...req.body, ai_reply });`;

    if(content.includes(replaceJsonLogicSearch)) {
        content = content.replace(replaceJsonLogicSearch, replaceJsonLogicInsert);
        fs.writeFileSync(salesosPath, content, 'utf8');
        console.log('SUCCESS: Behavior spec and Extraction logic injected.');
    } else {
        console.log('FAILED to find json logic string to replace.');
    }
} else {
    console.log('FAILED to find prompt string to replace.');
}
