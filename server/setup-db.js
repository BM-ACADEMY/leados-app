/**
 * LeadOS — Database Setup
 * Run once: node setup-db.js
 * Creates 9 tables + seeds 7 ABM brands + 1 admin user
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function setup() {
  console.log('🔧 LeadOS Database Setup Starting...\n');

  // ── 1. USERS ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent')),
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 1/9: users');

  // ── 2. CLIENTS (brands) ────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      type VARCHAR(50),
      plan VARCHAR(20) DEFAULT 'Starter' CHECK (plan IN ('Starter', 'Pro', 'Enterprise')),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      phone_number_id VARCHAR(100),
      wa_access_token TEXT,
      wa_business_id VARCHAR(100),
      whatsapp_number VARCHAR(20),
      monthly_revenue NUMERIC(10,2) DEFAULT 0,
      joined_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 2/9: clients');

  // ── 3. LEADS ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(150),
      source VARCHAR(50) DEFAULT 'WhatsApp',
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(20) DEFAULT 'new'
        CHECK (status IN ('new', 'hot', 'warm', 'cold', 'converted', 'lost')),
      score INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
      interest TEXT,
      notes TEXT,
      last_contact TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id)');
  console.log('✅ Table 3/9: leads');

  // ── 4. CONVERSATIONS ───────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
      message TEXT NOT NULL,
      message_type VARCHAR(20) DEFAULT 'text',
      sender VARCHAR(20) DEFAULT 'ai' CHECK (sender IN ('ai', 'human', 'lead')),
      wa_message_id VARCHAR(100),
      sent_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_conv_lead ON conversations(lead_id)');
  console.log('✅ Table 4/9: conversations');

  // ── 5. TEMPLATES ───────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      category VARCHAR(20) DEFAULT 'UTILITY' CHECK (category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
      body TEXT NOT NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
      meta_template_id VARCHAR(100),
      submitted_at TIMESTAMP,
      approved_at TIMESTAMP,
      uses INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 5/9: templates');

  // ── 6. CAMPAIGNS ───────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
      target_status VARCHAR(20),
      scheduled_at TIMESTAMP,
      launched_at TIMESTAMP,
      status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'failed')),
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 6/9: campaigns');

  // ── 7. CAMPAIGN LOGS ───────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaign_logs (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed')),
      sent_at TIMESTAMP,
      wa_message_id VARCHAR(100)
    )
  `);
  console.log('✅ Table 7/9: campaign_logs');

  // ── 8. PAYMENTS ────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      currency VARCHAR(5) DEFAULT 'INR',
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
      razorpay_payment_id VARCHAR(100),
      razorpay_link_id VARCHAR(100),
      payment_link TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 8/9: payments');

  // ── 9. BRAIN DOCS ──────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brain_docs (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      doc_type VARCHAR(50) NOT NULL
        CHECK (doc_type IN ('product', 'pricing', 'objections', 'proof', 'flow', 'prompt')),
      content TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(client_id, doc_type)
    )
  `);
  console.log('✅ Table 9/9: brain_docs\n');

  // ══════════════════════════════════════════════════════
  // SEED: 7 ABM BRANDS (clients)
  // ══════════════════════════════════════════════════════
  console.log('🌱 Seeding 7 ABM brands...');

  const brands = [
    { name: 'BM Academy', type: 'Education', plan: 'Pro' },
    { name: 'BM TechX', type: 'Technology', plan: 'Pro' },
    { name: 'EduConsultants', type: 'Education', plan: 'Starter' },
    { name: 'Real Estate', type: 'Real Estate', plan: 'Enterprise' },
    { name: 'Haramain', type: 'Travel', plan: 'Starter' },
    { name: "Dada's Kitchen", type: 'F&B', plan: 'Starter' },
    { name: 'TravellersNeed', type: 'Travel', plan: 'Starter' },
  ];

  for (const b of brands) {
    await pool.query(`
      INSERT INTO clients (name, type, plan, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT DO NOTHING
    `, [b.name, b.type, b.plan]);
    console.log(`  ✓ ${b.name}`);
  }

  // ══════════════════════════════════════════════════════
  // SEED: ADMIN USER
  // ══════════════════════════════════════════════════════
  console.log('\n👤 Creating admin user...');
  const hash = await bcrypt.hash('Admin@1234', 12);
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Kamar', 'kamar@abmgroups.org', $1, 'admin')
    ON CONFLICT (email) DO NOTHING
  `, [hash]);
  console.log('  ✓ kamar@abmgroups.org / Admin@1234');

  // ══════════════════════════════════════════════════════
  // SEED: DEFAULT TEMPLATES
  // ══════════════════════════════════════════════════════
  console.log('\n📄 Seeding default templates...');

  const academyId = (await pool.query("SELECT id FROM clients WHERE name = 'BM Academy'")).rows[0]?.id;

  const templates = [
    {
      name: 'welcome_qualifier',
      category: 'UTILITY',
      client_id: academyId,
      body: 'Hi {{1}}! 👋 Thanks for your interest in BM Academy.\n\nWhich course interests you?\n1️⃣ Digital Marketing\n2️⃣ Full Stack Dev\n3️⃣ Video Editing\n\nReply with 1, 2 or 3 to know more!',
      status: 'approved',
    },
    {
      name: 'followup_day3',
      category: 'MARKETING',
      client_id: null,
      body: 'Hi {{1}}! 👋 Just checking in — did you get a chance to review what we shared?\n\nWe have limited seats this batch. Reply YES to block your spot! 🎯',
      status: 'approved',
    },
    {
      name: 'call_booking',
      category: 'UTILITY',
      client_id: null,
      body: 'Hi {{1}}! Our counsellor would love to speak with you for 10 minutes.\n\nShall I schedule a free call? Reply YES and your preferred time. 📞',
      status: 'approved',
    },
    {
      name: 'special_offer_academy',
      category: 'MARKETING',
      client_id: academyId,
      body: '🎉 Special offer for you, {{1}}!\n\nBM Academy Scholarship Batch:\n✅ Digital Marketing — Rs 2,999 (orig Rs 5,999)\n✅ EMI: Rs 999 now, rest after placement!\n\nOnly 3 seats left. Reply CLAIM to book now!',
      status: 'pending',
    },
  ];

  for (const t of templates) {
    await pool.query(`
      INSERT INTO templates (name, category, client_id, body, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO NOTHING
    `, [t.name, t.category, t.client_id, t.body, t.status]);
    console.log(`  ✓ ${t.name} (${t.status})`);
  }

  // ══════════════════════════════════════════════════════
  // SEED: SAMPLE LEADS (for testing)
  // ══════════════════════════════════════════════════════
  console.log('\n👥 Seeding sample leads...');

  const agentId = (await pool.query("SELECT id FROM users WHERE email = 'kamar@abmgroups.org'")).rows[0]?.id;

  const sampleLeads = [
    { name: 'Arjun Kumar', phone: '919876543210', source: 'Meta Ads', brand: 'BM Academy', status: 'hot', score: 87, interest: 'Digital Marketing' },
    { name: 'Priya Devi', phone: '919865432109', source: 'Instagram DM', brand: 'BM Academy', status: 'warm', score: 62, interest: 'Full Stack Dev' },
    { name: 'Mohamed Salim', phone: '919854321098', source: 'Website', brand: 'BM TechX', status: 'hot', score: 91, interest: 'Clinic Package' },
    { name: 'Kavitha R', phone: '919843210987', source: 'WhatsApp', brand: 'EduConsultants', status: 'warm', score: 55, interest: 'MBBS Abroad' },
    { name: 'Ravi Shankar', phone: '919832109876', source: 'Meta Ads', brand: 'Real Estate', status: 'cold', score: 28, interest: 'Plot Investment' },
    { name: 'Deepa M', phone: '919821098765', source: 'Referral', brand: 'BM Academy', status: 'converted', score: 100, interest: 'Video Editing' },
  ];

  for (const l of sampleLeads) {
    const clientId = (await pool.query('SELECT id FROM clients WHERE name = $1', [l.brand])).rows[0]?.id;
    await pool.query(`
      INSERT INTO leads (name, phone, source, client_id, assigned_to, status, score, interest, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - (RANDOM() * INTERVAL '3 days'))
      ON CONFLICT DO NOTHING
    `, [l.name, l.phone, l.source, clientId, agentId, l.status, l.score, l.interest]);
  }
  console.log('  ✓ 6 sample leads seeded');

  // ══════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════
  const counts = await Promise.all([
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COUNT(*) FROM clients'),
    pool.query('SELECT COUNT(*) FROM leads'),
    pool.query('SELECT COUNT(*) FROM templates'),
  ]);

  console.log('\n✅ Database setup complete!');
  console.log('─────────────────────────────');
  console.log(`  Users:     ${counts[0].rows[0].count}`);
  console.log(`  Brands:    ${counts[1].rows[0].count}`);
  console.log(`  Leads:     ${counts[2].rows[0].count}`);
  console.log(`  Templates: ${counts[3].rows[0].count}`);
  console.log('─────────────────────────────');
  console.log('  9 tables created ✓');
  console.log('  7 brands seeded ✓');
  console.log('  1 admin user created ✓');
  console.log('\nLogin: kamar@abmgroups.org / Admin@1234');
  console.log('⚠️  Change this password immediately after first login!\n');

  await pool.end();
}

setup().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
