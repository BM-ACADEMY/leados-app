const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function setup() {
  console.log('🔧 Setup Mafiya Plans & Altering GMB Clients...\n');

  // Create mafiya_plans
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mafiya_plans (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      price NUMERIC(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'INR',
      billing_cycle VARCHAR(50) DEFAULT 'Monthly',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table created: mafiya_plans');

  // Create mafiya_plan_features
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mafiya_plan_features (
      id SERIAL PRIMARY KEY,
      plan_id INTEGER REFERENCES mafiya_plans(id) ON DELETE CASCADE,
      feature_key VARCHAR(100) NOT NULL,
      feature_name VARCHAR(255) NOT NULL,
      limit_value INTEGER DEFAULT -1, -- -1 represents unlimited or custom logic
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table created: mafiya_plan_features');

  // Alter GMB clients to support type and plan
  await pool.query(`
    ALTER TABLE mafiya_gmb_clients 
    ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) DEFAULT 'internal',
    ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES mafiya_plans(id) ON DELETE SET NULL
  `);
  console.log('✅ Altered table: mafiya_gmb_clients (added client_type, plan_id)');

  // Seed default Mafiya plans if none exist
  const countRes = await pool.query('SELECT COUNT(*) FROM mafiya_plans');
  if (parseInt(countRes.rows[0].count) === 0) {
    console.log('Seeding default Mafiya plans...');
    const plans = [
      {
        name: 'Starter', price: 1999,
        features: [
          { key: 'mafiya_profiles', name: 'GMB Profiles Limit', limit: 1 },
          { key: 'mafiya_keywords', name: 'Turf Keywords Limit', limit: 15 },
          { key: 'mafiya_ai_replies', name: 'AI Review Replies Limit', limit: 20 },
          { key: 'mafiya_ai_suggestions', name: 'AI Post Suggestions Limit', limit: 10 },
          { key: 'mafiya_geogrid_scans', name: 'Rivals Map Scans Limit', limit: 3 },
          { key: 'mafiya_citations_scans', name: 'Citations Audits Limit', limit: 2 }
        ]
      },
      {
        name: 'Growth', price: 4999,
        features: [
          { key: 'mafiya_profiles', name: 'GMB Profiles Limit', limit: 5 },
          { key: 'mafiya_keywords', name: 'Turf Keywords Limit', limit: 50 },
          { key: 'mafiya_ai_replies', name: 'AI Review Replies Limit', limit: 150 },
          { key: 'mafiya_ai_suggestions', name: 'AI Post Suggestions Limit', limit: 50 },
          { key: 'mafiya_geogrid_scans', name: 'Rivals Map Scans Limit', limit: 15 },
          { key: 'mafiya_citations_scans', name: 'Citations Audits Limit', limit: 10 }
        ]
      },
      {
        name: 'Pro Agency', price: 9999,
        features: [
          { key: 'mafiya_profiles', name: 'GMB Profiles Limit', limit: 20 },
          { key: 'mafiya_keywords', name: 'Turf Keywords Limit', limit: 150 },
          { key: 'mafiya_ai_replies', name: 'AI Review Replies Limit', limit: 500 },
          { key: 'mafiya_ai_suggestions', name: 'AI Post Suggestions Limit', limit: 200 },
          { key: 'mafiya_geogrid_scans', name: 'Rivals Map Scans Limit', limit: 50 },
          { key: 'mafiya_citations_scans', name: 'Citations Audits Limit', limit: 30 }
        ]
      }
    ];

    for (const p of plans) {
      const res = await pool.query(
        'INSERT INTO mafiya_plans (name, price) VALUES ($1, $2) RETURNING id',
        [p.name, p.price]
      );
      const planId = res.rows[0].id;
      for (const f of p.features) {
        await pool.query(
          'INSERT INTO mafiya_plan_features (plan_id, feature_key, feature_name, limit_value) VALUES ($1, $2, $3, $4)',
          [planId, f.key, f.name, f.limit]
        );
      }
    }
    console.log('✅ Seeded Starter, Growth, and Pro Agency plans');
  }

  console.log('\n✅ Setup completed successfully!');
  await pool.end();
}

setup().catch(err => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
