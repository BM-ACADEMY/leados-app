const fs = require('fs');
const path = require('path');

const salesosPath = path.join(__dirname, 'routes', 'salesos.js');
let content = fs.readFileSync(salesosPath, 'utf8');

const searchStr = 'INSTRUCTIONS: \n      1. Write a short, friendly WhatsApp reply mimicking a human sales assistant. End with exactly one question to keep the conversation going.\n      2. If the user provided their name in the message (or recently in the chat), extract it.\n      3. If the user provided a preferred date/time for a call/meeting, extract it and convert it to a standard ISO 8601 UTC timestamp format (e.g. 2026-07-25T16:00:00Z). Assume the current year is 2026 if not specified.';

const insertStr = `CRITICAL BEHAVIOR SPECIFICATIONS:
      1. Greeting: Mirror the user's opener (e.g. "hi" -> "Hi!", "hello" -> "Hello!"). Keep it to one short line. Do NOT open with "Vanakkam, this is ABM Groups" or list all brands on every message. Only fall back to full brand list if intent is genuinely unclear.
      2. Brand detection: Only switch brands if the new message clearly contains a different brand keyword (BM Academy, BM TechX, CoreTalents, Namma Pondy Properties, TravellersNeed, Dada's Kitchen, EduConsultants, BM Foundation). Otherwise, stick to the locked brand.
      3. Conversation memory: Never ask for something already provided (e.g., don't ask the time slot again after the user gave "4pm", or name if already given).
      4. Fallbacks: If it's a voice note (audio), reply: "Got your voice note 🎧 — could you type it quickly so I can help right away?". If unclear, ask ONE short clarifying question.
      5. Tone: Write a short, friendly WhatsApp reply mimicking a human sales assistant. End with exactly one question to keep the conversation going.
      6. Routing Numbers: Use these exact numbers if the user asks for contact info: Shared WABA (inbound) is \${process.env.SHARED_WABA_NUMBER || '919944509441'}, Outbound contact for ALL brands is \${process.env.OUTBOUND_CONTACT_NUMBER || '94038 92971'}, General / partnerships is \${process.env.GENERAL_PARTNERSHIPS_NUMBER || '99442 88271'}, BM Academy admissions is \${process.env.BM_ACADEMY_ADMISSIONS_NUMBER || '94038 92971'}.`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, insertStr);
    fs.writeFileSync(salesosPath, content, 'utf8');
    console.log('SUCCESS: Behavior spec updated in salesos.js');
} else {
    console.log('FAILED to find prompt string to replace in salesos.js');
}
