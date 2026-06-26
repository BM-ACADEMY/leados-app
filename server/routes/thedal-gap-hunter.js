const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Dynamic Simulator for V2
const generateDynamicGaps = (competitorDomain) => {
  const baseGaps = [
    { kw: 'affordable local SEO', baseVol: 1000, baseKd: 20 },
    { kw: 'b2b lead generation services', baseVol: 3000, baseKd: 45 },
    { kw: 'how to rank on google maps', baseVol: 5000, baseKd: 15 },
    { kw: 'seo audit checklist 2026', baseVol: 800, baseKd: 30 },
    { kw: 'ecommerce seo consultant', baseVol: 2000, baseKd: 55 },
    { kw: 'login to client portal', baseVol: 500, baseKd: 80 },
    { kw: `${competitorDomain.split('.')[0]} pricing`, baseVol: 1200, baseKd: 90 },
    { kw: 'cheap backlinks', baseVol: 50, baseKd: 10 },
    { kw: 'enterprise seo agency', baseVol: 4500, baseKd: 65 },
    { kw: 'law firm seo expert', baseVol: 1500, baseKd: 40 },
    { kw: 'white label seo dashboard', baseVol: 850, baseKd: 35 },
    { kw: 'local pack optimization', baseVol: 1200, baseKd: 25 },
    { kw: 'saas content marketing', baseVol: 2500, baseKd: 50 },
    { kw: 'dental seo company', baseVol: 1800, baseKd: 42 },
    { kw: 'seo competitor analysis template', baseVol: 950, baseKd: 28 },
    { kw: 'link building outreach service', baseVol: 3200, baseKd: 60 }
  ];

  return baseGaps.map(g => {
    const volVariance = Math.floor(g.baseVol * 0.2);
    const kdVariance = Math.floor(g.baseKd * 0.2);
    const gapTypes = ['Competitor has it, you don\'t', 'Neither ranks', 'You rank low, they rank high'];
    const gapType = gapTypes[Math.floor(Math.random() * gapTypes.length)];
    return {
      keyword: g.kw,
      volume: g.baseVol + (Math.random() * volVariance * 2 - volVariance),
      difficulty: Math.max(1, Math.min(100, g.baseKd + (Math.random() * kdVariance * 2 - kdVariance))),
      competitor: competitorDomain,
      gap_type: gapType
    };
  });
};

// NEW: Endpoint to actually Track keywords
router.post('/track', async (req, res) => {
  const { clientDomain, keywords } = req.body;
  if (!clientDomain || !keywords || !keywords.length) {
    return res.status(400).json({ error: 'Client domain and keywords are required.' });
  }

  try {
    for (let kw of keywords) {
      await pool.query(`
        INSERT INTO thedal_tracked_keywords (client_domain, keyword)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [clientDomain, kw]);
    }
    res.json({ success: true, message: `Successfully tracked ${keywords.length} keywords.` });
  } catch (err) {
    console.error('Failed to track keywords:', err);
    res.status(500).json({ error: 'Database error while tracking keywords.' });
  }
});

router.post('/scan', async (req, res) => {
  let { clientDomain, competitorDomain } = req.body;

  if (!clientDomain) {
    return res.status(400).json({ error: 'Client domain is required.' });
  }

  if (competitorDomain && clientDomain.toLowerCase().trim() === competitorDomain.toLowerCase().trim()) {
    return res.status(400).json({ error: 'Client domain and competitor domain cannot be the same.' });
  }

  try {
    if (!competitorDomain) {
      const { rows } = await pool.query(`
        SELECT competitors_json FROM serp_radar_history 
        ORDER BY scanned_at DESC LIMIT 1
      `);
      if (rows.length > 0 && rows[0].competitors_json.length > 0) {
        competitorDomain = rows[0].competitors_json[0].domain;
      } else {
        competitorDomain = 'searchenginejournal.com';
      }
    }

    const rawGaps = generateDynamicGaps(competitorDomain);

    const filteredGaps = rawGaps.filter(gap => {
      const isBranded = gap.keyword.includes(competitorDomain.split('.')[0]);
      const isNavigational = gap.keyword.includes('login') || gap.keyword.includes('pricing') || gap.keyword.includes('careers');
      const isTooHard = gap.difficulty > 70;
      const isTooSmall = gap.volume < 100;
      return !isBranded && !isNavigational && !isTooHard && !isTooSmall;
    });

    const prompt = `
      You are an elite enterprise SEO Strategist.
      Client: ${clientDomain}
      Competitor: ${competitorDomain}

      Analyze these content gaps:
      ${filteredGaps.map(g => `- "${g.keyword}" (Vol: ${Math.round(g.volume)}, KD: ${Math.round(g.difficulty)})`).join('\n')}

      For each keyword, return a JSON object with:
      - "intent": strict string "Informational", "Commercial", or "Transactional"
      - "pillar": Suggested content pillar (e.g., "Local SEO Guide", "B2B Services")
      - "intent_match_score": 1-100 score of how well this fits an agency service business
      - "strategic_reason": 1 sentence explaining why they should target it.

      Return EXACTLY a JSON array of objects in the same order as the keywords. NO MARKDOWN.
    `;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let aiAnalysis = [];
    try {
      const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      aiAnalysis = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', response.text);
      aiAnalysis = filteredGaps.map(() => ({ intent: 'Commercial', pillar: 'General', intent_match_score: 80, strategic_reason: 'High value gap.' }));
    }

    const { rows: trackedRows } = await pool.query(`
      SELECT keyword FROM thedal_tracked_keywords WHERE client_domain = $1
    `, [clientDomain]);
    const activeKeywords = new Set(trackedRows.map(r => r.keyword.toLowerCase()));

    const finalOpportunities = filteredGaps.map((gap, idx) => {
      const ai = aiAnalysis[idx] || {};
      const volScore = Math.min(100, (gap.volume / 10000) * 100) * 0.4;
      const kdScore = (100 - gap.difficulty) * 0.4;
      const intentScore = (ai.intent_match_score || 50) * 0.2;
      const opportunityScore = Math.round(volScore + kdScore + intentScore);

      return {
        id: `gap_${idx}_${Date.now()}`,
        keyword: gap.keyword,
        volume: Math.round(gap.volume),
        difficulty: Math.round(gap.difficulty),
        intent: ai.intent || 'Unknown',
        pillar: ai.pillar || 'Uncategorized',
        intent_match_score: ai.intent_match_score || 50,
        reason: ai.strategic_reason || 'Strategic opportunity.',
        opportunity_score: opportunityScore,
        is_already_tracked: activeKeywords.has(gap.keyword.toLowerCase()),
        gap_type: gap.gap_type
      };
    }).sort((a, b) => b.opportunity_score - a.opportunity_score);

    await pool.query(`
      INSERT INTO gap_hunter_scans (client_domain, competitor_domain, results_json)
      VALUES ($1, $2, $3)
    `, [clientDomain, competitorDomain, JSON.stringify(finalOpportunities)]);

    res.json({
      clientDomain,
      competitorDomain,
      scanned_at: new Date().toISOString(),
      opportunities: finalOpportunities
    });

  } catch (err) {
    console.error('Gap Hunter API Error:', err);
    res.status(500).json({ error: 'Failed to run V2 Enterprise Gap Analysis.' });
  }
});

module.exports = router;
