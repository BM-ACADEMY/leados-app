/* eslint-env node */
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user:     process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

// Ensure DB table exists
const ensureTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS backlink_tracker_history (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        metrics JSONB,
        links JSONB,
        scanned_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracked_backlinks (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) UNIQUE NOT NULL,
        added_at TIMESTAMP DEFAULT NOW(),
        last_checked TIMESTAMP,
        metrics JSONB,
        status VARCHAR(50) DEFAULT 'Monitoring'
      )
    `);
  } catch (err) {
    console.error('Failed to create backlink_tracker_history table', err);
  }
};
ensureTable();

// Helper to generate mock backlink data for a domain
function generateMockBacklinks(domain) {
  const sources = [
    { name: 'Wikipedia', root: 'wikipedia.org', maxDr: 98, minDr: 95 },
    { name: 'Medium', root: 'medium.com', maxDr: 95, minDr: 85 },
    { name: 'TechCrunch', root: 'techcrunch.com', maxDr: 92, minDr: 80 },
    { name: 'GitHub', root: 'github.com', maxDr: 96, minDr: 90 },
    { name: 'Forbes', root: 'forbes.com', maxDr: 94, minDr: 85 },
    { name: 'Reddit', root: 'reddit.com', maxDr: 93, minDr: 75 },
    { name: 'Local Directory', root: 'localdirectory.org', maxDr: 50, minDr: 30 },
    { name: 'Industry Blog', root: 'industry-blog.net', maxDr: 60, minDr: 40 },
    { name: 'News Outlet', root: 'daily-news.com', maxDr: 75, minDr: 60 },
    { name: 'Partner Site', root: 'partner-agency.io', maxDr: 65, minDr: 45 },
  ];

  const totalLinks = Math.floor(Math.random() * 40) + 15; // 15 to 55 links
  const links = [];
  let dofollowCount = 0;

  for (let i = 0; i < totalLinks; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const isDofollow = Math.random() > 0.35; // 65% chance of dofollow
    if (isDofollow) dofollowCount++;

    const dr = Math.floor(Math.random() * (source.maxDr - source.minDr + 1)) + source.minDr;
    
    // Randomise anchor text
    const anchors = [domain, `Visit ${domain}`, 'Click here', 'Website', 'Source', 'Read more', 'Official Site'];
    const anchor = anchors[Math.floor(Math.random() * anchors.length)];

    // Randomise status
    const status = Math.random() > 0.1 ? 'Active' : 'Lost';

    links.push({
      id: i + 1,
      sourceUrl: `https://${source.root}/article-${Math.floor(Math.random() * 10000)}`,
      sourceTitle: `${source.name} - Mention of ${domain}`,
      anchorText: anchor,
      type: isDofollow ? 'Dofollow' : 'Nofollow',
      dr: dr,
      status: status,
      firstSeen: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString().split('T')[0],
    });
  }

  // Sort by DR descending
  links.sort((a, b) => b.dr - a.dr);

  const metrics = {
    totalBacklinks: totalLinks + Math.floor(Math.random() * 1000), // inflate total for realism
    referringDomains: Math.floor(totalLinks * 0.7) + Math.floor(Math.random() * 200),
    dofollowRatio: Math.round((dofollowCount / totalLinks) * 100),
    domainAuthority: Math.floor(Math.random() * 40) + 20, // 20 to 60
  };

  return { metrics, links };
}

// ── POST /scan ─────────────────────────────────────────────────────────────
router.post('/scan', async (req, res) => {
  const { domain } = req.body;
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  try {
    // Artificial delay to simulate API fetching
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock data (until a real API like DataForSEO is hooked up)
    const { metrics, links } = generateMockBacklinks(domain);

    // Save to DB
    await pool.query(
      `INSERT INTO backlink_tracker_history (domain, metrics, links, scanned_at) VALUES ($1, $2, $3, NOW())`,
      [domain, JSON.stringify(metrics), JSON.stringify(links)]
    );

    return res.json({
      domain,
      metrics,
      links,
      scanned_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('Backlink scan error:', err);
    return res.status(500).json({ error: 'Failed to scan backlinks.' });
  }
});

// ── GET /history ────────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, domain, metrics, scanned_at FROM backlink_tracker_history ORDER BY scanned_at DESC LIMIT 20`
    );
    return res.json({ history: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /track ─────────────────────────────────────────────────────────────
router.post('/track', async (req, res) => {
  const { domain, metrics } = req.body;
  if (!domain) return res.status(400).json({ error: 'Domain is required' });

  try {
    const existing = await pool.query('SELECT id FROM tracked_backlinks WHERE domain = $1', [domain]);
    
    if (existing.rows.length > 0) {
      // Untrack if already tracked
      await pool.query('DELETE FROM tracked_backlinks WHERE domain = $1', [domain]);
      return res.json({ success: true, tracking: false, message: 'Domain removed from tracking.' });
    } else {
      // Track
      await pool.query(
        `INSERT INTO tracked_backlinks (domain, metrics, last_checked) VALUES ($1, $2, NOW())`,
        [domain, metrics ? JSON.stringify(metrics) : null]
      );
      return res.json({ success: true, tracking: true, message: 'Domain is now being monitored.' });
    }
  } catch (err) {
    console.error('Track domain error:', err);
    return res.status(500).json({ error: 'Failed to update tracking status.' });
  }
});

// ── GET /tracked ────────────────────────────────────────────────────────────
router.get('/tracked', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM tracked_backlinks ORDER BY added_at DESC`
    );
    return res.json({ tracked: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
