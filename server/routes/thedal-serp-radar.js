const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

router.post('/scan', async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  const SERP_API_KEY = process.env.SERP_RADAR_API_KEY || process.env.SERP_API_KEY || process.env.SERPKEY;
  if (!SERP_API_KEY) {
    const mockCompetitors = [
      { domain: 'wikipedia.org', trend: 'same', change: '0', isNew: false },
      { domain: 'healthline.com', trend: 'up', change: '+2', isNew: false },
      { domain: 'mayoclinic.org', trend: 'down', change: '-1', isNew: false },
      { domain: `${keyword.toLowerCase().replace(/[^a-z0-9]/g, '') || 'competitor'}.com`, trend: 'up', change: 'NEW', isNew: true },
      { domain: 'webmd.com', trend: 'same', change: '0', isNew: false }
    ];

    const mockFeatures = {
      localPack: 40,
      featuredSnippet: 70,
      peopleAlsoAsk: 90,
      videoCarousel: 30,
      imagePack: 60,
      shoppingAds: 10
    };

    return res.json({
      keyword,
      demo: true,
      volatility: {
        score: 3.5,
        status: 'Calm',
        message: 'Running in Demo Mode (simulated data).'
      },
      features: mockFeatures,
      competitors: mockCompetitors
    });
  }

  try {
    // 1. Fetch live data from Google via SerpApi
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        q: keyword,
        engine: 'google',
        api_key: SERP_API_KEY,
        num: 50 // Get top 50 results
      }
    });

    const data = response.data;

    // 2. Extract Competitors
    const organicResults = data.organic_results || [];
    const currentCompetitors = organicResults.map((result, idx) => ({
      domain: new URL(result.link).hostname.replace('www.', ''),
      position: result.position || (idx + 1),
    })).slice(0, 15); // Track top 15 for movement

    // 3. Extract SERP Features
    const features = {
      localPack: !!data.local_results ? 100 : 0, // Since this is a single scan, we convert boolean to 100% or 0%
      featuredSnippet: !!data.answer_box ? 100 : 0,
      peopleAlsoAsk: !!data.related_questions ? 100 : 0,
      videoCarousel: !!data.inline_videos ? 100 : 0,
      imagePack: !!data.inline_images ? 100 : 0,
      shoppingAds: !!data.shopping_results ? 100 : 0
    };

    // 4. Calculate Movement vs Yesterday (Baseline)
    const { rows } = await pool.query(`
      SELECT competitors_json FROM serp_radar_history 
      WHERE keyword = $1 
      ORDER BY scanned_at DESC LIMIT 1
    `, [keyword]);

    let baselineCompetitors = [];
    if (rows.length > 0) {
      baselineCompetitors = rows[0].competitors_json;
    }

    const calculatedCompetitors = currentCompetitors.slice(0, 5).map(current => {
      const past = baselineCompetitors.find(c => c.domain === current.domain);
      let trend = 'same';
      let change = '0';
      let isNew = false;

      if (!past) {
        trend = 'up';
        change = 'NEW';
        isNew = true;
      } else if (current.position < past.position) {
        trend = 'up';
        change = `+${past.position - current.position}`;
      } else if (current.position > past.position) {
        trend = 'down';
        change = `-${current.position - past.position}`;
      }

      return {
        domain: current.domain,
        trend,
        change,
        isNew
      };
    });

    // 5. Calculate Volatility (Simple calculation based on movement)
    let totalShifts = 0;
    currentCompetitors.slice(0, 10).forEach(c => {
      const past = baselineCompetitors.find(p => p.domain === c.domain);
      if (!past || past.position !== c.position) totalShifts++;
    });

    // Scale 0-10
    const volatilityScore = Math.min(10, (totalShifts / 10) * 10);

    let weatherStatus = 'Calm';
    if (volatilityScore > 4) weatherStatus = 'Moderate';
    if (volatilityScore > 7) weatherStatus = 'High';
    if (volatilityScore > 8.5) weatherStatus = 'Extreme';

    // 6. Save Snapshot to Database
    await pool.query(`
      INSERT INTO serp_radar_history (keyword, competitors_json, features_json, volatility_score)
      VALUES ($1, $2, $3, $4)
    `, [keyword, JSON.stringify(currentCompetitors), JSON.stringify(features), volatilityScore]);

    // 7. Return payload to frontend
    res.json({
      keyword,
      volatility: {
        score: parseFloat(volatilityScore.toFixed(1)),
        status: weatherStatus,
        message: weatherStatus === 'High' || weatherStatus === 'Extreme'
          ? 'Significant algorithm turbulence detected in this keyword.'
          : 'Normal search engine activity detected today.'
      },
      features,
      competitors: calculatedCompetitors
    });

  } catch (err) {
    console.error('Live SERP API Error:', err.response?.data || err.message);
    const apiError = err.response?.data?.error || err.message || 'Failed to fetch live SERP data.';
    res.status(500).json({ error: apiError });
  }
});

module.exports = router;
