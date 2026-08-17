function getSuggestConfigPrompt({ entryType, businessName, hasCurrent, currentConfig, currentMonthStr }) {
  let prompt = '';
  if (entryType === 'tone') {
    prompt = hasCurrent
      ? `You are an AI expert. Optimize and refine this brand tone for the business "${businessName}" to be used in marketing:
Current tone: ${JSON.stringify(currentConfig)}
Return ONLY a valid JSON object matching this structure (no markdown wrapper, no extra text):
{
  "voice": "Description of the voice",
  "blacklist": ["word to avoid 1", "word to avoid 2"]
}`
      : `Generate a brand tone for the business "${businessName}" to be used in marketing.
Return ONLY a valid JSON object matching this structure (no markdown wrapper, no extra text):
{
  "voice": "Description of the voice (e.g. Professional yet friendly)",
  "blacklist": ["cheap", "guarantee"]
}`;
  } else if (entryType === 'keyword') {
    prompt = hasCurrent
      ? `You are an AI expert. Optimize and improve these local SEO keywords for the business "${businessName}":
Current keywords: ${JSON.stringify(currentConfig)}
Return ONLY a valid JSON array of strings (no markdown wrapper, no extra text):
["keyword1", "keyword2", "keyword3"]`
      : `Generate 5-10 high-impact local SEO keywords for the business "${businessName}".
Return ONLY a valid JSON array of strings (no markdown wrapper, no extra text):
["keyword1", "keyword2", "keyword3"]`;
  } else if (entryType === 'offer') {
    prompt = hasCurrent
      ? `You are an AI expert. Optimize and improve these offers for the business "${businessName}":
Current offers: ${JSON.stringify(currentConfig)}
Return ONLY a valid JSON array of objects (no markdown wrapper, no extra text):
[
  {
    "title": "Short offer title",
    "description": "Offer details",
    "validUntil": "Date or condition",
    "cta": "Call to action"
  }
]`
      : `Generate 3 distinct compelling offers for the business "${businessName}" to attract local customers.
Return ONLY a valid JSON array of objects (no markdown wrapper, no extra text):
[
  {
    "title": "Short offer title",
    "description": "Offer details",
    "validUntil": "Date or condition (e.g. End of month)",
    "cta": "Call to action (e.g. Book now)"
  }
]`;
  } else if (entryType === 'qa') {
    prompt = hasCurrent
      ? `You are an AI expert. Optimize and improve these FAQs for the business "${businessName}":
Current FAQs: ${JSON.stringify(currentConfig)}
Return ONLY a valid JSON array of objects (no markdown wrapper, no extra text):
[
  {
    "question": "Customer question",
    "answer": "Professional answer"
  }
]`
      : `Generate 4 common customer FAQs and professional answers for the business "${businessName}".
Return ONLY a valid JSON array of objects (no markdown wrapper, no extra text):
[
  {
    "question": "What is the fee or starting cost?",
    "answer": "Detailed helpful starting price or demo offer."
  }
]`;
  } else if (entryType === 'seasonal') {
    prompt = hasCurrent
      ? `You are an AI expert. Optimize and improve these Daily Poster rules for the business "${businessName}" for the month of ${currentMonthStr}, ensuring they are highly engaging and specific:
Current daily poster rules: ${JSON.stringify(currentConfig)}
Return ONLY a valid JSON array of objects (no markdown wrapper, no extra text):
[
  {
    "occasion": "Theme / Topic (e.g. Monday Motivation, Tech Tips, Weekly Offer)",
    "instructions": "Design & Content Instructions"
  }
]`
      : `The current month is ${currentMonthStr}. Based on the business profile "${businessName}", generate 4 to 6 distinct Poster Campaign strategies. DO NOT just suggest daily posts. Instead, analyze the business type and suggest *WHEN* and *HOW OFTEN* these posters should go out (e.g., "Every Monday", "Twice a month", "Weekends"). 
Return ONLY a valid JSON array of objects (no markdown wrapper, no extra text):
[
  {
    "occasion": "Theme / Topic name (e.g. Monday Motivation, Weekly Offers)",
    "instructions": "Specific design, content instructions, AND the recommended posting frequency/schedule based on the business profile."
  }
]`;
  } else if (entryType === 'creative_brief') {
    prompt = hasCurrent
      ? `You are an AI expert. Optimize and refine this creative brief brand style instructions for "${businessName}":
Current brief: ${JSON.stringify(currentConfig)}
Return ONLY a valid JSON object matching this structure (no markdown wrapper, no extra text):
{
  "brandStyle": "Modern",
  "brandColors": ["#000000", "#FFFFFF"],
  "imageStyle": ["Realistic", "Cinematic"],
  "negativePrompt": ["Low quality", "Cartoon"],
  "typography": "Clean sans-serif fonts"
}`
      : `Generate a comprehensive visual creative brief and brand style guidelines for the business "${businessName}".
Return ONLY a valid JSON object matching this structure (no markdown wrapper, no extra text):
{
  "brandStyle": "Modern / Elegant / Playful etc.",
  "brandColors": ["#hex1", "#hex2"],
  "imageStyle": ["Realistic photography", "High quality"],
  "negativePrompt": ["Low quality", "Cartoonish", "Cluttered"],
  "typography": "Description of font style to use in posters"
}`;
  }
  return prompt;
}

function getPlanMonthPrompt({ monthLabel, name, category, address, tone, keywords, offers, seasonal, history, holidays, referenceImages, currentDateIso }) {
  return `You are an expert Local SEO & GMB Content Strategist. Analyze this business and build a posting PLAN for **${monthLabel}**.

Business Name: "${name}"
Category: "${category}"
Location: "${address}"
Brand Tone: "${tone}"
Target Keywords: ${JSON.stringify(keywords)}
Active Offers: ${JSON.stringify(offers)}
Seasonal Campaigns on file: ${JSON.stringify(seasonal)}

Recent Post History (most recent first, up to 20): ${JSON.stringify(history)}

Real festival/holiday dates confirmed for ${monthLabel} (ONLY use these — do NOT invent any other festival or date): ${JSON.stringify(holidays)}

${referenceImages.length > 0
  ? `Attached below are ${referenceImages.length} of this business's actual recent GMB poster images. Study their color palette, layout, typography style, and overall visual tone before writing your poster suggestions.`
  : `No past poster images are available for this client yet — base poster style suggestions on the business category and brand tone only.`}

Decide how many GMB posts this business should publish in ${monthLabel}, based on: category competitiveness, how consistently they've posted historically (gaps = catch up, but don't just guess), and how many of the confirmed festivals above are worth a dedicated post. Do NOT default to a fixed number like 4 — reason it out.

CRITICAL RULES:
- Google My Business strictly prohibits phone numbers in post captions.
- For each post's "postType", use one of: standard, offers, seasonal, qa.
- "scheduleDate" must be a real date within ${monthLabel} (YYYY-MM-DD) and spread sensibly across the month (avoid Sundays).
- STRICT DATE RULE: Today's date is ${currentDateIso}. You MUST ONLY schedule posts for today or future dates. Do NOT schedule any posts on past dates (before ${currentDateIso}).
- "scheduleDate" must land ON or NEAR a festival date from the list above when "festivalTag" is set.
- Only set "festivalTag" if it matches a name from the confirmed festival list — otherwise null.
- Do NOT generate or describe an actual image file — only write a short text suggestion of what the poster should look like ("visualNote"), consistent with the reference poster style if images were provided.

Return ONLY valid JSON (no markdown, no extra text) in this exact shape:
{
  "recommendedCount": 6,
  "reason": "1-2 sentence explanation grounded in the category, posting history gap, and upcoming festivals.",
  "visualStyleSummary": "1 sentence describing the observed poster style from the reference images (colors/layout/tone), or 'No reference posters available' if none were attached.",
  "weeklySplit": [{ "week": "Week 1", "theme": "Offer Post", "count": 2 }],
  "posts": [
    { "week": "Week 1", "scheduleDate": "${new Date().getFullYear()}-05-05", "postType": "offers", "title": "Short internal title", "festivalTag": null, "visualNote": "e.g. Same bold orange banner style as before, festive border, photo of the storefront with a discount badge." }
  ]
}`;
}

module.exports = {
  getSuggestConfigPrompt,
  getPlanMonthPrompt
};
