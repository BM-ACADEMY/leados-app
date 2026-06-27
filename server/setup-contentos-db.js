const pool = require('./db/connection');

async function setupContentOS() {
  console.log('🔧 LeadOS - Content OS Database Setup Starting...\n');

  // ── 1. CONTENT QUEUE ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_queue (
      id SERIAL PRIMARY KEY,
      brand_name VARCHAR(150) NOT NULL REFERENCES clients(name) ON UPDATE CASCADE,
      file_name VARCHAR(255),
      video_url TEXT,
      public_video_url TEXT,
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
      failure_reason TEXT,
      failed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table verified/created: content_queue');

  // ── 2. BRAND SOCIAL ACCOUNTS ────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brand_social_accounts (
      id SERIAL PRIMARY KEY,
      brand_name VARCHAR(150) NOT NULL REFERENCES clients(name) ON UPDATE CASCADE,
      platform VARCHAR(50) NOT NULL,
      account_name VARCHAR(150) NOT NULL,
      account_id VARCHAR(100),
      instagram_business_id VARCHAR(100),
      facebook_page_id VARCHAR(100),
      access_token TEXT,
      token_expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table verified/created: brand_social_accounts');

  // Ensure columns exist if the table was already created
  await pool.query(`
    ALTER TABLE brand_social_accounts 
    ADD COLUMN IF NOT EXISTS access_token TEXT,
    ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP
  `);

  // Add unique constraint to brand_social_accounts to support ON CONFLICT
  await pool.query(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brand_platform_account_unique') THEN
            ALTER TABLE brand_social_accounts ADD CONSTRAINT brand_platform_account_unique UNIQUE (brand_name, platform, account_name);
        END IF;
    END;
    $$;
  `);

  // ── 3. PUBLISHING LOGS ──────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS publishing_logs (
      id SERIAL PRIMARY KEY,
      content_id INTEGER,
      brand_name VARCHAR(150),
      platform VARCHAR(50),
      post_id VARCHAR(255),
      status VARCHAR(20) DEFAULT 'success',
      published_at TIMESTAMP DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    )
  `);
  console.log('✅ Table verified/created: publishing_logs');

  // ══════════════════════════════════════════════════════
  // SEED: SOCIAL ACCOUNTS
  // ══════════════════════════════════════════════════════
  console.log('\n🌱 Seeding Brand Social Accounts...');

  const accounts = [
    {
      brand_name: 'BM Academy',
      platform: 'instagram',
      account_name: 'learnwithkamar.ai',
      account_id: '17841469214255982',
      instagram_business_id: null,
      facebook_page_id: null
    },
    {
      brand_name: 'BM Academy',
      platform: 'facebook',
      account_name: 'The BM Academy',
      account_id: '507830985738117',
      instagram_business_id: null,
      facebook_page_id: null
    },
    {
      brand_name: 'BM Academy',
      platform: 'linkedin',
      account_name: 'BM Academy Company',
      account_id: null,
      instagram_business_id: null,
      facebook_page_id: null
    },
    {
      brand_name: 'BM TechX',
      platform: 'instagram',
      account_name: 'bmtechx',
      account_id: null,
      instagram_business_id: null,
      facebook_page_id: null
    },
    {
      brand_name: 'BM TechX',
      platform: 'facebook',
      account_name: 'BM TechX',
      account_id: null,
      instagram_business_id: null,
      facebook_page_id: null
    },
    {
      brand_name: 'BM TechX',
      platform: 'linkedin',
      account_name: 'BM TechX Company',
      account_id: null,
      instagram_business_id: null,
      facebook_page_id: null
    },
    {
      brand_name: 'Namma Pondy Properties',
      platform: 'instagram',
      account_name: 'namma_pondy_properties',
      account_id: null,
      instagram_business_id: '17841473556289794',
      facebook_page_id: null
    },
    {
      brand_name: 'Namma Pondy Properties',
      platform: 'facebook',
      account_name: 'Namma Pondy Properties',
      account_id: null,
      instagram_business_id: null,
      facebook_page_id: '112855270143630'
    },
    {
      brand_name: "Dada's Kitchen",
      platform: 'instagram',
      account_name: '_dadaskitchen_',
      account_id: null,
      instagram_business_id: null,
      facebook_page_id: null
    },
    {
      brand_name: "Dada's Kitchen",
      platform: 'facebook',
      account_name: "Dada's Kitchen",
      account_id: null,
      instagram_business_id: null,
      facebook_page_id: null
    },
    {
      brand_name: 'ABM Groups',
      platform: 'instagram',
      account_name: 'abmgroups_',
      account_id: null,
      instagram_business_id: null,
      facebook_page_id: null
    },
    {
      brand_name: 'ABM Groups',
      platform: 'facebook',
      account_name: 'ABM Groups',
      account_id: null,
      instagram_business_id: null,
      facebook_page_id: null
    }
  ];

  let seededCount = 0;
  for (const acc of accounts) {
    // Check if the record already exists in the table to prevent duplicates
    const { rows } = await pool.query(
      'SELECT id FROM brand_social_accounts WHERE brand_name = $1 AND platform = $2',
      [acc.brand_name, acc.platform]
    );

    if (rows.length === 0) {
      await pool.query(`
        INSERT INTO brand_social_accounts (
          brand_name, platform, account_name, account_id, instagram_business_id, facebook_page_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [acc.brand_name, acc.platform, acc.account_name, acc.account_id, acc.instagram_business_id, acc.facebook_page_id]);
      console.log(`  ✓ ${acc.brand_name} - ${acc.platform} (${acc.account_name}) seeded`);
      seededCount++;
    } else {
      console.log(`  - ${acc.brand_name} - ${acc.platform} already exists (skipped)`);
    }
  }

  console.log(`\n✅ Brand Social Accounts seeding completed (seeded ${seededCount} new records).`);
  console.log('✅ Content OS Database setup complete!\n');
  await pool.end();
}

setupContentOS().catch(err => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
