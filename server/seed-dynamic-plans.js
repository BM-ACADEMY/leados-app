const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function seedPlans() {
  console.log('🌱 Seeding Dynamic Plans into Database...\n');

  const plans = [
    { 
      name: 'Free', 
      price: 0, 
      features: [
        '5 Keywords Tracked', 
        '1 Competitor Tracked', 
        '1 On-Page Audit per month',
        'Basic GSC Overview'
      ] 
    },
    { 
      name: 'Basic', 
      price: 2999, 
      features: [
        '25 Keywords Tracked', 
        '3 Competitors Tracked', 
        '5 On-Page Audits per month',
        'Full GSC Intel Dashboard',
        '2 AI Blog Drafts/mo'
      ] 
    },
    { 
      name: 'Standard', 
      price: 5999, 
      features: [
        '100 Keywords Tracked', 
        '10 Competitors Tracked', 
        'Unlimited On-Page Audits',
        '10 AI Blog Drafts & Meta Rewrites/mo',
        'Gap Hunter Access',
        'Automated Monthly PDF Reports'
      ] 
    },
    { 
      name: 'Pro', 
      price: 11999, 
      features: [
        'Unlimited Keyword Tracking', 
        'Unlimited Competitor Spying', 
        'Unlimited Content Factory Usage',
        'Rank Drop WhatsApp Alerts',
        'Local SEO Bridge (GMB Integration)',
        'Schema Library Builder',
        'Backlink Tracker CRM'
      ] 
    }
  ];

  try {
    // Delete existing plans to prevent duplicates
    await pool.query('DELETE FROM thedal_plans');
    console.log('Cleared existing plans.');

    for (const p of plans) {
      const res = await pool.query(
        'INSERT INTO thedal_plans (name, price, currency, billing_cycle) VALUES ($1, $2, $3, $4) RETURNING id',
        [p.name, p.price, 'INR', 'Monthly']
      );
      const planId = res.rows[0].id;
      for (const f of p.features) {
        await pool.query(
          'INSERT INTO thedal_plan_features (plan_id, feature_name) VALUES ($1, $2)',
          [planId, f]
        );
      }
      console.log(`✅ Seeded: ${p.name} Plan`);
    }

    console.log('\n🎉 Successfully seeded all 4 plans!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await pool.end();
  }
}

seedPlans();
