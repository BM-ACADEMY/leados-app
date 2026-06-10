const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function setupContentOS() {
  console.log('🔧 LeadOS - Content OS Database Setup Starting...\n');

  // ── 1. CONTENT QUEUE ───────────────────────────────────────────
  await pool.query('DROP TABLE IF EXISTS content_queue CASCADE');
  await pool.query(`
    CREATE TABLE content_queue (
      id SERIAL PRIMARY KEY,
      brand_name VARCHAR(150) NOT NULL,
      video_url TEXT,
      thumbnail_url TEXT,
      caption TEXT,
      x_caption TEXT,
      linkedin_caption TEXT,
      thumbnail_title VARCHAR(255),
      story_1 TEXT,
      story_2 TEXT,
      story_3 TEXT,
      platforms JSONB DEFAULT '[]'::jsonb,
      selected_accounts JSONB DEFAULT '[]'::jsonb,
      scheduled_at TIMESTAMP,
      status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED', 'FAILED')),
      approved_by VARCHAR(150),
      approved_at TIMESTAMP,
      rejected_by VARCHAR(150),
      rejected_at TIMESTAMP,
      rejection_reason TEXT,
      published_at TIMESTAMP,
      platform_post_ids JSONB DEFAULT '[]'::jsonb,
      error_message TEXT,
      error_response JSONB DEFAULT '{}'::jsonb,
      failed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table created: content_queue');

  // ── 2. BRAND SOCIAL ACCOUNTS ────────────────────────────────
  await pool.query('DROP TABLE IF EXISTS brand_social_accounts CASCADE');
  await pool.query(`
    CREATE TABLE brand_social_accounts (
      id SERIAL PRIMARY KEY,
      brand_name VARCHAR(150) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      account_name VARCHAR(150) NOT NULL,
      account_id VARCHAR(100),
      instagram_business_id VARCHAR(100),
      facebook_page_id VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table created: brand_social_accounts');

  // ══════════════════════════════════════════════════════
  // SEED: SOCIAL ACCOUNTS
  // ══════════════════════════════════════════════════════
  console.log('\n🌱 Seeding Brand Social Accounts...');

  const accounts = [
    { brand: 'The Bm Academy', platform: 'instagram', account_name: 'learnwithkamar.ai', account_id: '17841469214255982' },
    { brand: 'The BM Academy', platform: 'facebook', account_name: 'The BM Academy', account_id: '507830985738117' },
    { brand: 'BM Academy', platform: 'linkedin', account_name: 'BM Academy Company', account_id: '821379' },
    { brand: 'ABM Groups', platform: 'instagram', account_name: 'abmgroups_', account_id: '17841400000000001' },
    { brand: 'ABM Groups', platform: 'facebook', account_name: 'ABM Groups', account_id: '507830000000001' },
    { brand: "Dada's Kitchen", platform: 'instagram', account_name: '_dadaskitchen_', account_id: '17841400000000002' }
  ];

  for (const acc of accounts) {
    await pool.query(`
      INSERT INTO brand_social_accounts (brand_name, platform, account_name, account_id)
      VALUES ($1, $2, $3, $4)
    `, [acc.brand, acc.platform, acc.account_name, acc.account_id]);
    console.log(`  ✓ ${acc.brand} - ${acc.platform} (${acc.account_name})`);
  }

  // ══════════════════════════════════════════════════════
  // SEED: INITIAL QUEUE ITEM (MOCK)
  // ══════════════════════════════════════════════════════
  console.log('\n🌱 Seeding Initial Content Queue...');
  await pool.query(`
    INSERT INTO content_queue (
      brand_name, caption, x_caption, linkedin_caption, thumbnail_title, 
      story_1, story_2, story_3, platforms, status, scheduled_at
    ) VALUES (
      'The Bm Academy', 
      '🎓 3 maadham training, lifetime career!\n\nBM Academy la join pannunga — Tamil Nadu la #1 Digital Marketing course.',
      '3 maadham training, lifetime career. 150+ placed from BM Academy.',
      'BM Academy has placed 150+ students in digital marketing roles across Tamil Nadu and Pondicherry.',
      '3 Maadham Training Lifetime Career',
      'Digital Marketing job cheyyanuma? 🤔',
      '1400+ students trained. 150+ placed ✅',
      'Comment LEARN now 👇 July batch filling fast!',
      '["instagram", "facebook", "linkedin"]'::jsonb,
      'PENDING',
      NOW() + INTERVAL '1 day'
    )
  `);
  console.log('  ✓ 1 pending content item seeded');

  console.log('\n✅ Content OS Database setup complete!\n');
  await pool.end();
}

setupContentOS().catch(err => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
