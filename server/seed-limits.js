const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function seedLimits() {
  console.log('🌱 Seeding Plans with Structured Dynamic Limits...\n');

  const plans = [
    { 
      name: 'Free', price: 0, 
      features: [
        { key: 'client_onboard', name: 'Client Onboard Profile', limit: -1 },
        { key: 'keyword_tracking', name: 'Keyword Tracking Limit', limit: 5 },
        { key: 'on_page_audit', name: 'On-Page Audit Scans/mo', limit: 1 },
        { key: 'gsc_intel', name: 'GSC Intel Access', limit: -1 },
        { key: 'serp_radar', name: 'SERP Radar Access', limit: -1 },
      ] 
    },
    { 
      name: 'Basic', price: 2999, 
      features: [
        { key: 'client_onboard', name: 'Client Onboard Profile', limit: -1 },
        { key: 'keyword_tracking', name: 'Keyword Tracking Limit', limit: 25 },
        { key: 'on_page_audit', name: 'On-Page Audit Scans/mo', limit: 5 },
        { key: 'gsc_intel', name: 'GSC Intel Access', limit: -1 },
        { key: 'serp_radar', name: 'SERP Radar Access', limit: -1 },
        { key: 'content_factory', name: 'Content Factory Drafts/mo', limit: 2 },
        { key: 'competitor_spy', name: 'Competitor Spy Limit', limit: 1 },
        { key: 'monthly_pdf', name: 'Monthly PDF Report', limit: -1 },
      ] 
    },
    { 
      name: 'Standard', price: 5999, 
      features: [
        { key: 'client_onboard', name: 'Client Onboard Profile', limit: -1 },
        { key: 'keyword_tracking', name: 'Keyword Tracking Limit', limit: 100 },
        { key: 'on_page_audit', name: 'On-Page Audit Scans/mo', limit: -1 },
        { key: 'gsc_intel', name: 'GSC Intel Access', limit: -1 },
        { key: 'serp_radar', name: 'SERP Radar Access', limit: -1 },
        { key: 'content_factory', name: 'Content Factory Drafts/mo', limit: 10 },
        { key: 'competitor_spy', name: 'Competitor Spy Limit', limit: 5 },
        { key: 'monthly_pdf', name: 'Monthly PDF Report', limit: -1 },
        { key: 'gap_hunter', name: 'Gap Hunter Access', limit: -1 },
        { key: 'rank_drop_alert', name: 'Rank Drop Alert', limit: -1 },
        { key: 'local_citations', name: 'Local Citations', limit: -1 },
      ] 
    },
    { 
      name: 'Pro', price: 11999, 
      features: [
        { key: 'client_onboard', name: 'Client Onboard Profile', limit: -1 },
        { key: 'keyword_tracking', name: 'Keyword Tracking Limit', limit: -1 },
        { key: 'on_page_audit', name: 'On-Page Audit Scans/mo', limit: -1 },
        { key: 'gsc_intel', name: 'GSC Intel Access', limit: -1 },
        { key: 'serp_radar', name: 'SERP Radar Access', limit: -1 },
        { key: 'content_factory', name: 'Content Factory Drafts/mo', limit: -1 },
        { key: 'competitor_spy', name: 'Competitor Spy Limit', limit: -1 },
        { key: 'monthly_pdf', name: 'Monthly PDF Report', limit: -1 },
        { key: 'gap_hunter', name: 'Gap Hunter Access', limit: -1 },
        { key: 'rank_drop_alert', name: 'Rank Drop Alert', limit: -1 },
        { key: 'local_citations', name: 'Local Citations', limit: -1 },
        { key: 'local_seo_bridge', name: 'Local SEO Bridge (GMB)', limit: -1 },
        { key: 'schema_library', name: 'Schema Library Builder', limit: -1 },
        { key: 'backlink_tracker', name: 'Backlink Tracker CRM', limit: -1 },
      ] 
    }
  ];

  try {
    // Delete existing plans to prevent duplicates
    await pool.query('DELETE FROM thedal_plans');
    console.log('Cleared existing text-based plans.');

    for (const p of plans) {
      const res = await pool.query(
        'INSERT INTO thedal_plans (name, price, currency, billing_cycle) VALUES ($1, $2, $3, $4) RETURNING id',
        [p.name, p.price, 'INR', 'Monthly']
      );
      const planId = res.rows[0].id;
      for (const f of p.features) {
        await pool.query(
          'INSERT INTO thedal_plan_features (plan_id, feature_key, feature_name, limit_value) VALUES ($1, $2, $3, $4)',
          [planId, f.key, f.name, f.limit]
        );
      }
      console.log(`✅ Seeded: ${p.name} Plan with rules`);
    }

    console.log('\n🎉 Successfully seeded all 4 plans with structured limits!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await pool.end();
  }
}

seedLimits();
