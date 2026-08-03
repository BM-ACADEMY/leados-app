const express = require('express');
const router = express.Router();
const openRouter = require('../services/openrouter');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});


// Ensure tables are altered for Content Factory columns
const initDb = async () => {
  try {
    await pool.query(`ALTER TABLE thedal_content ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'english'`);
    await pool.query(`ALTER TABLE thedal_content ADD COLUMN IF NOT EXISTS word_count INTEGER`);
    await pool.query(`ALTER TABLE thedal_content ADD COLUMN IF NOT EXISTS meta_description TEXT`);
    await pool.query(`ALTER TABLE thedal_content ADD COLUMN IF NOT EXISTS slug VARCHAR(255)`);
    await pool.query(`ALTER TABLE thedal_clients ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'Pondicherry'`);
  } catch (err) {
    console.error('Failed to run content migrations:', err);
  }
};
initDb();

// Helper to parse Gemini response safely, handling markdown block wrap
const parseAIJson = (text) => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return JSON.parse(cleaned.trim());
};

// GET content list for calendar
router.get('/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { status } = req.query;
  try {
    let query = 'SELECT id, title, slug, content_type, target_keyword, status, language, word_count, created_at FROM thedal_content WHERE client_id = $1';
    const params = [clientId];
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ content: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET specific content item
router.get('/:clientId/:id', async (req, res) => {
  const { clientId, id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM thedal_content WHERE id = $1 AND client_id = $2', [id, clientId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Content not found' });
    res.json({ content: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST generate blog
router.post('/:clientId/generate-blog', async (req, res) => {
  const { clientId } = req.params;
  const { keyword, language = 'english', wordCount = 800, tone = 'professional' } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

  try {
    const clientRes = await pool.query('SELECT * FROM thedal_clients WHERE id = $1', [clientId]);
    if (clientRes.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
    const client = clientRes.rows[0];

    const useDemoMode = req.headers['x-data-mode'] === 'demo' || !openRouter.isConfigured;
    if (useDemoMode) {
      const aiRes = {
        title: `${keyword.toUpperCase()} - The Definitive Guide`,
        metaDescription: `Read our comprehensive guide about ${keyword}. Find everything you need to know, tips, and step-by-step instructions.`,
        slug: keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        content: `
          <h2>Introduction to ${keyword}</h2>
          <p>This is a simulated blog post for the keyword "${keyword}". In a live setup, Gemini generates an SEO-optimized blog copy targeting this keyword directly.</p>
          <h2>Key Benefits of ${keyword}</h2>
          <ul>
            <li>Higher ranking and visibility</li>
            <li>Increased traffic from organic search</li>
            <li>Better user engagement</li>
          </ul>
          <h2>Conclusion</h2>
          <p>Start optimizing your content now to reap the benefits of good SEO.</p>
        `,
        wordCount: parseInt(wordCount) || 800,
        readingTime: `${Math.round((parseInt(wordCount) || 800) / 200)} min read`,
        focusKeyword: keyword,
        secondaryKeywords: [`${keyword} tips`, `${keyword} guide`]
      };

      // Save to Postgres
      const insertRes = await pool.query(
        `INSERT INTO thedal_content (client_id, content_type, title, body, target_keyword, status, language, word_count, meta_description, slug)
         VALUES ($1, 'blog_post', $2, $3, $4, 'draft', $5, $6, $7, $8) RETURNING id`,
        [clientId, aiRes.title, aiRes.content, keyword, language, aiRes.wordCount, aiRes.metaDescription, aiRes.slug]
      );

      return res.json({ post: { ...aiRes, id: insertRes.rows[0].id } });
    }

    const langInstruction = language === 'tamil'
      ? 'Write entirely in Tamil script.'
      : language === 'tanglish'
      ? 'Write in Tanglish — Tamil words romanized in English, mixed with English. Natural conversational tone as spoken in Tamil Nadu.'
      : 'Write in clear, professional Indian English.';

    const prompt = `You are an SEO content writer for the client "${client.business_name || client.domain}", located in "${client.location || 'Pondicherry'}".
    Business Category: "${client.business_category || 'Business'}"
    Target keyword: "${keyword}"
    Language style: ${langInstruction}
    Tone: ${tone}
    Target word count: ${wordCount} words

    Write a complete, SEO-optimized blog post. Include:
    1. Title (with keyword, 50–60 chars)
    2. Meta description (with keyword, 150–160 chars)
    3. Introduction (hook the reader in 2–3 sentences)
    4. 3–4 main sections with H2 headings (include keyword variations)
    5. Bullet points or numbered lists where relevant
    6. Local references to Tamil Nadu / Pondicherry where natural
    7. Conclusion with clear CTA (call or WhatsApp ${client.business_name || client.domain})
    8. FAQ section (3 questions with answers)

    Return ONLY a valid JSON object. Do NOT wrap it in markdown code blocks like \`\`\`json. The JSON object must have exactly these keys:
    {
      "title": "...",
      "metaDescription": "...",
      "slug": "url-friendly-slug",
      "content": "full HTML content with h2, p, ul, ol tags",
      "wordCount": 800,
      "readingTime": "5 min read",
      "focusKeyword": "${keyword}",
      "secondaryKeywords": ["...", "..."]
    }`;

    const response = await openRouter.models.generateContent({
      model: openRouter.DEFAULT_MODEL,
      contents: prompt,
    });

    const aiRes = parseAIJson(response.text);

    // Save to Postgres
    const insertRes = await pool.query(
      `INSERT INTO thedal_content (client_id, content_type, title, body, target_keyword, status, language, word_count, meta_description, slug)
       VALUES ($1, 'blog_post', $2, $3, $4, 'draft', $5, $6, $7, $8) RETURNING id`,
      [clientId, aiRes.title, aiRes.content, keyword, language, aiRes.wordCount || wordCount, aiRes.metaDescription, aiRes.slug]
    );

    res.json({ post: { ...aiRes, id: insertRes.rows[0].id } });
  } catch (err) {
    console.error('Failed to generate blog post:', err);
    res.status(500).json({ error: err.message || 'AI blog post generation failed' });
  }
});

// POST rewrite meta tags
router.post('/:clientId/rewrite-meta', async (req, res) => {
  const { clientId } = req.params;
  const { pageUrl, currentTitle, currentMeta, targetKeyword } = req.body;

  try {
    const clientRes = await pool.query('SELECT * FROM thedal_clients WHERE id = $1', [clientId]);
    if (clientRes.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
    const client = clientRes.rows[0];

    const useDemoMode = req.headers['x-data-mode'] === 'demo' || !openRouter.isConfigured;
    if (useDemoMode) {
      return res.json({
        result: {
          newTitle: `${targetKeyword} | Optimized Title for SEO`,
          newMetaDescription: `Looking for ${targetKeyword}? Discover premium services and solutions. Clear CTAs and local benefits inside!`,
          titleLength: 55,
          metaLength: 155,
          improvement: 'Injected high-priority target keyword first, optimized lengths to avoid truncation in Google Search SERPs.'
        }
      });
    }

    const prompt = `You are an SEO specialist. Rewrite these meta tags for better rankings.

    Business: ${client.business_name || client.domain}
    Location: ${client.location || 'Pondicherry'}
    Page URL: ${pageUrl}
    Target Keyword: "${targetKeyword}"
    Current Title: "${currentTitle}"
    Current Meta Description: "${currentMeta}"

    Rules:
    - Title: 50–60 chars, keyword first, include location if local business
    - Meta description: 150–160 chars, include keyword, location, clear benefit + CTA
    - Make them compelling for click-through rate
    - No keyword stuffing

    Return ONLY a valid JSON object. Do NOT wrap it in markdown code blocks like \`\`\`json. The JSON object must have exactly these keys:
    {
      "newTitle": "...",
      "newMetaDescription": "...",
      "titleLength": 55,
      "metaLength": 155,
      "improvement": "why this version is better"
    }`;

    const response = await openRouter.models.generateContent({
      model: openRouter.DEFAULT_MODEL,
      contents: prompt,
    });

    const aiRes = parseAIJson(response.text);
    res.json({ result: aiRes });
  } catch (err) {
    console.error('Failed to rewrite meta tags:', err);
    res.status(500).json({ error: err.message || 'AI meta rewrite failed' });
  }
});

// POST topic ideas
router.post('/:clientId/topic-ideas', async (req, res) => {
  const { clientId } = req.params;
  const { month, count = 8 } = req.body;

  try {
    const clientRes = await pool.query('SELECT * FROM thedal_clients WHERE id = $1', [clientId]);
    if (clientRes.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
    const client = clientRes.rows[0];

    const useDemoMode = req.headers['x-data-mode'] === 'demo' || !openRouter.isConfigured;
    if (useDemoMode) {
      const topics = [];
      for (let i = 1; i <= count; i++) {
        topics.push({
          title: `How to Maximize Your Business Success in Pondicherry (Topic #${i})`,
          targetKeyword: `pondicherry business success`,
          intent: i % 2 === 0 ? 'informational' : 'transactional',
          estimatedTraffic: i % 3 === 0 ? 'high' : 'medium',
          contentType: i % 4 === 0 ? 'listicle' : 'guide',
          priority: i
        });
      }
      return res.json({ ideas: { topics } });
    }

    // Grab some tracked keywords to feed the prompt
    const kwRes = await pool.query('SELECT keyword FROM thedal_keywords WHERE client_id = $1 LIMIT 10', [clientId]);
    const topKeywords = kwRes.rows.map(k => k.keyword).join(', ') || 'dental clinic';

    const prompt = `Generate ${count} SEO blog post ideas for ${client.business_name || client.domain} (${client.business_category || 'Business'}) in ${client.location || 'Pondicherry'}.

    Top ranking keywords: ${topKeywords}
    Month: ${month}

    For each idea return:
    - title (compelling, click-worthy)
    - targetKeyword (primary keyword)
    - intent (informational/transactional/navigational)
    - estimatedTraffic (high/medium/low)
    - contentType (how-to/listicle/guide/comparison/local)
    - priority (1-${count})

    Return ONLY a valid JSON object. Do NOT wrap it in markdown code blocks like \`\`\`json. The JSON object must have exactly this structure:
    {
      "topics": [
        {
          "title": "...",
          "targetKeyword": "...",
          "intent": "...",
          "estimatedTraffic": "...",
          "contentType": "...",
          "priority": 1
        },
        ...
      ]
    }`;

    const response = await openRouter.models.generateContent({
      model: openRouter.DEFAULT_MODEL,
      contents: prompt,
    });

    const aiRes = parseAIJson(response.text);
    res.json({ ideas: aiRes });
  } catch (err) {
    console.error('Failed to get topic ideas:', err);
    res.status(500).json({ error: err.message || 'AI topic ideas generation failed' });
  }
});

// POST schema generation
router.post('/:clientId/schema', async (req, res) => {
  const { clientId } = req.params;
  const { schemaType } = req.body;

  try {
    const clientRes = await pool.query('SELECT * FROM thedal_clients WHERE id = $1', [clientId]);
    if (clientRes.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
    const client = clientRes.rows[0];

    const schemaTemplates = {
      LocalBusiness: {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: client.business_name || client.domain,
        url: `https://${client.domain}`,
        address: { '@type': 'PostalAddress', addressLocality: client.location || 'Pondicherry', addressRegion: 'Tamil Nadu', addressCountry: 'IN' },
        areaServed: client.location || 'Pondicherry',
      },
      FAQPage: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: `What services does ${client.business_name || client.domain} offer?`, acceptedAnswer: { '@type': 'Answer', text: 'Add your answer here.' } },
          { '@type': 'Question', name: `Where is ${client.business_name || client.domain} located?`, acceptedAnswer: { '@type': 'Answer', text: `We are located in ${client.location || 'Pondicherry'}.` } },
        ],
      },
      BreadcrumbList: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${client.domain}` },
          { '@type': 'ListItem', position: 2, name: 'Services', item: `https://${client.domain}/services` },
        ],
      },
      Product: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${client.business_name || client.domain} Service`,
        description: `Premium services offered by ${client.business_name || client.domain}`,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: '999',
          availability: 'https://schema.org/InStock'
        }
      },
      Organization: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: client.business_name || client.domain,
        url: `https://${client.domain}`,
        logo: `https://${client.domain}/logo.png`
      },
      Article: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `Latest insights from ${client.business_name || client.domain}`,
        author: {
          '@type': 'Person',
          name: client.client_name || 'Admin'
        },
        publisher: {
          '@type': 'Organization',
          name: client.business_name || client.domain,
          logo: {
            '@type': 'ImageObject',
            url: `https://${client.domain}/logo.png`
          }
        },
        datePublished: new Date().toISOString().slice(0, 10)
      }
    };

    const schemaObj = schemaTemplates[schemaType] || schemaTemplates.LocalBusiness;
    const jsonLd = `<script type="application/ld+json">\n${JSON.stringify(schemaObj, null, 2)}\n</script>`;
    
    // Optional: save to schema library DB
    await pool.query(
      `INSERT INTO thedal_schema_library (client_id, schema_type, schema_json, is_deployed)
       VALUES ($1, $2, $3, false) ON CONFLICT DO NOTHING`,
      [clientId, schemaType, JSON.stringify(schemaObj)]
    );

    res.json({ schema: { jsonLd } });
  } catch (err) {
    console.error('Failed to generate schema:', err);
    res.status(500).json({ error: err.message || 'Schema generation failed' });
  }
});

// PATCH update status
router.patch('/:clientId/:id/status', async (req, res) => {
  const { clientId, id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE thedal_content SET status = $1 WHERE id = $2 AND client_id = $3 RETURNING *',
      [status, id, clientId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Content not found' });
    res.json({ content: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
