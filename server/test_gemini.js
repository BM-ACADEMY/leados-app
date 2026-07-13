const fs = require('fs');

async function testGemini(modelName) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  const prompt = "You are a friendly WhatsApp sales assistant for BM Academy. Qualify leads by asking about their goals, background, and budget. Guide them towards enrollment or a demo call.";
  const contents = [
    { role: 'user', parts: [{ text: 'hi' }] },
    { role: 'model', parts: [{ text: 'Hello! Welcome to BM Academy. How can I help you today?' }] },
    { role: 'user', parts: [{ text: 'i am looking for course' }] }
  ];

  const body = {
    system_instruction: { parts: [{ text: prompt }] },
    contents: contents
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const json = await response.json();
  console.log(`--- ${modelName} ---`);
  console.log(JSON.stringify(json, null, 2));
}

require('dotenv').config();
(async () => {
  await testGemini('gemini-flash-latest');
})();
