const pool = require('c:/Users/mohds/OneDrive/Desktop/leados-app/server/db/connection');
const Groq = require("groq-sdk");
require('dotenv').config({ path: 'c:/Users/mohds/OneDrive/Desktop/leados-app/server/.env' });

const groq = new Groq({ apiKey: process.env.OPENAI_API_KEY });

async function getBrandVoice(brandName) {
  const { rows } = await pool.query(
    `SELECT brand_tag, brand_voice FROM clients WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [brandName]
  );
  if (rows.length && (rows[0].brand_tag || rows[0].brand_voice)) {
    return { tag: rows[0].brand_tag || brandName, voice: rows[0].brand_voice || `Professional voice for ${brandName}` };
  }
  return { tag: brandName, voice: `Professional voice for ${brandName}` };
}

async function run() {
  try {
    const { rows } = await pool.query("SELECT id, brand_name, caption, description FROM content_queue WHERE story_1 IS NULL OR story_1 = ''");
    console.log(`Found ${rows.length} content items without stories.`);

    for (const item of rows) {
      console.log(`Generating stories for item ID ${item.id} (${item.brand_name})...`);
      const brandInfo = await getBrandVoice(item.brand_name);
      
      const prompt = `You are the expert social media content writer for "${item.brand_name}" (${brandInfo.tag}).
BRAND VOICE GUIDE:
${brandInfo.voice}

Post Caption/Description to analyze:
"${item.caption || item.description || "Brand promotion post"}"

Generate 3 Instagram Story slides text (story_1, story_2, story_3) for promoting this content.
Match the brand voice guides exactly (e.g., Tanglish mix for BM Academy). DO NOT output any actual Tamil script/characters.

Respond ONLY with a valid JSON object matching this exact format:
{
  "story_1": "Slide 1 text: Engaging hook for Instagram Story",
  "story_2": "Slide 2 text: Key value point or highlight for Instagram Story",
  "story_3": "Slide 3 text: Strong Call to Action (CTA) or next steps for Instagram Story"
}`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.choices[0].message.content.trim();
      const meta = JSON.parse(content);
      
      await pool.query(
        "UPDATE content_queue SET story_1 = $1, story_2 = $2, story_3 = $3 WHERE id = $4",
        [meta.story_1 || "", meta.story_2 || "", meta.story_3 || "", item.id]
      );
      console.log(`Updated stories for item ID ${item.id} successfully.`);
    }

  } catch (err) {
    console.error("Error during stories generation script:", err);
  } finally {
    await pool.end();
  }
}

run();
