const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

const CORE_FEATURES = [
  { key: 'client_onboard', name: 'Client Onboard Profile', type: 'boolean' },
  { key: 'keyword_tracking', name: 'Keyword Tracking Limit', type: 'numeric' },
  { key: 'on_page_audit', name: 'On-Page Audit Scans/mo', type: 'numeric' },
  { key: 'gsc_intel', name: 'GSC Intel Access', type: 'boolean' },
  { key: 'serp_radar', name: 'SERP Radar Access', type: 'boolean' },
  { key: 'content_factory', name: 'Content Factory Drafts/mo', type: 'numeric' },
  { key: 'competitor_spy', name: 'Competitor Spy Limit', type: 'numeric' },
  { key: 'monthly_pdf', name: 'Monthly PDF Report', type: 'boolean' },
  { key: 'gap_hunter', name: 'Gap Hunter Access', type: 'boolean' },
  { key: 'rank_drop_alert', name: 'Rank Drop Alert', type: 'boolean' },
  { key: 'local_citations', name: 'Local Citations', type: 'boolean' },
  { key: 'local_seo_bridge', name: 'Local SEO Bridge (GMB)', type: 'boolean' },
  { key: 'schema_library', name: 'Schema Library Builder', type: 'boolean' },
  { key: 'backlink_tracker', name: 'Backlink Tracker CRM', type: 'boolean' },
];

async function setupFeatureDefinitions() {
  console.log('🔄 Creating thedal_feature_definitions table...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS thedal_feature_definitions (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'boolean',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert core features if they don't exist
    for (const feat of CORE_FEATURES) {
      await pool.query(`
        INSERT INTO thedal_feature_definitions (key, name, type) 
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type
      `, [feat.key, feat.name, feat.type]);
    }

    console.log('✅ Successfully created and seeded thedal_feature_definitions!');
  } catch (err) {
    console.error('❌ Failed to create table:', err);
  } finally {
    await pool.end();
  }
}

setupFeatureDefinitions();
