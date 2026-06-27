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
  console.log('🔧 Thedal OS Plans Database Setup Starting...\n');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_plans (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      price NUMERIC(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'INR',
      billing_cycle VARCHAR(50) DEFAULT 'Monthly',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 1/2: thedal_plans');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_plan_features (
      id SERIAL PRIMARY KEY,
      plan_id INTEGER REFERENCES thedal_plans(id) ON DELETE CASCADE,
      feature_name VARCHAR(255) NOT NULL,
      included BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 2/2: thedal_plan_features');

  // Seed default plans if empty
  const countRes = await pool.query('SELECT COUNT(*) FROM thedal_plans');
  if (parseInt(countRes.rows[0].count) === 0) {
    console.log('Seeding default plans...');
    const plans = [
      { name: 'Free', price: 0, features: ['5 Keywords Tracked', 'Basic GSC Integration', 'Monthly Technical Audit'] },
      { name: 'Starter', price: 3999, features: ['15 Keywords Tracked', '1 Competitor Tracked', '2 Blog Drafts/mo', '5 Meta Rewrites/mo'] },
      { name: 'Growth', price: 6999, features: ['30 Keywords Tracked', '3 Competitors Tracked', '4 Blog Drafts/mo', '15 Meta Rewrites/mo', 'Gap Hunter Access'] },
      { name: 'Pro', price: 11999, features: ['Unlimited Keywords', '5 Competitors Tracked', '8 Blog Drafts/mo', 'Unlimited Meta Rewrites', 'Local SEO Bridge'] }
    ];

    for (const p of plans) {
      const res = await pool.query(
        'INSERT INTO thedal_plans (name, price) VALUES ($1, $2) RETURNING id',
        [p.name, p.price]
      );
      const planId = res.rows[0].id;
      for (const f of p.features) {
        await pool.query(
          'INSERT INTO thedal_plan_features (plan_id, feature_name) VALUES ($1, $2)',
          [planId, f]
        );
      }
    }
    console.log('✅ Default plans seeded.');
  }

  console.log('\n✅ Database setup complete!\n');
  await pool.end();
}

setup().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
