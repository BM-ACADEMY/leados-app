const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function setupAllianceDb() {
  console.log('🔧 LeadOS — AllianceOS Database Extension Setup Starting...\n');

  // ── 1. ORGANISATIONS ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organisations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL, -- college | company | clinic
      website VARCHAR(500),
      email VARCHAR(255),
      phone VARCHAR(20),
      location VARCHAR(255),
      district VARCHAR(100),
      contact_name VARCHAR(255),
      contact_role VARCHAR(100),
      industry VARCHAR(100),
      student_count INTEGER,
      lead_source VARCHAR(100),
      status VARCHAR(50) DEFAULT 'new',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table: organisations');

  // ── 2. AI ANALYSIS ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_analysis (
      id SERIAL PRIMARY KEY,
      org_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE,
      score INTEGER,
      offer_recommended TEXT,
      reason TEXT,
      bm_course_match TEXT,
      core_talents_offer TEXT,
      personalisation_hook TEXT,
      hiring_potential VARCHAR(20),
      training_potential VARCHAR(20),
      raw_json JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table: ai_analysis');

  // ── 3. KNOWLEDGE BASE ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      category VARCHAR(100), -- profile|mou|faq|strategy|template
      brand VARCHAR(100), -- BM Academy|Core Talents|BM TechX|All
      content TEXT,
      file_name VARCHAR(255),
      char_count INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table: knowledge_base');

  // ── 4. PROMPT TEMPLATES ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE,
      purpose VARCHAR(255),
      prompt_text TEXT,
      active BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table: prompt_templates');

  // ── 5. OUTREACH ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outreach (
      id SERIAL PRIMARY KEY,
      org_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE,
      channel VARCHAR(20),
      msg_type VARCHAR(10),
      content TEXT,
      sent_at TIMESTAMP,
      delivered BOOLEAN DEFAULT FALSE,
      opened BOOLEAN DEFAULT FALSE,
      replied BOOLEAN DEFAULT FALSE,
      reply_text TEXT,
      replied_at TIMESTAMP
    )
  `);
  console.log('✅ Table: outreach');

  // ── 6. PIPELINE STAGES ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id SERIAL PRIMARY KEY,
      org_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE UNIQUE,
      stage VARCHAR(50) DEFAULT 'new',
      assigned_to VARCHAR(100),
      notes TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table: pipeline_stages');

  // ══════════════════════════════════════════════════════
  // SEED: AI PROMPTS
  // ══════════════════════════════════════════════════════
  console.log('\n📄 Seeding AI prompt templates...');
  const prompts = [
    {
      name: 'college_analyzer',
      purpose: 'Analyze a college and recommend Core Talents partnership',
      prompt_text: `You are an AI analyst for ABM Groups — BM Academy, Core Talents, and BM TechX in Pondicherry, Tamil Nadu.
Analyze the following college using the scraped website data and our offerings context below.
Return ONLY valid JSON. No markdown. No explanation outside the JSON.
Organisation: {{org_name}}
Location: {{district}}
Website Content: {{website_text}}
Our Offerings:
{{kb_context}}
Return this exact JSON structure:
{
 "offer_recommended": "<specific MoU type>",
 "reason": "<2 sentences why this selection>",
 "bm_course_match": "<which BM Academy courses fit their students>",
 "core_talents_offer": "<what Core Talents can specifically offer>",
 "training_potential": "high|medium|low",
 "placement_potential": "high|medium|low",
 "personalisation_hook": "<one specific sentence about this college that makes outreach feel personal>"
}`
    },
    {
      name: 'company_analyzer',
      purpose: 'Analyze a company and recommend Core Talents hiring partnership',
      prompt_text: `You are an AI analyst for Core Talents — the talent placement division of ABM Groups, Pondicherry.
Analyze the following company using website data and our talent offerings below.
Return ONLY valid JSON. No markdown. No explanation.
Organisation: {{org_name}}
Industry: {{industry}}
Location: {{district}}
Website Content: {{website_text}}
Our Talent Offerings:
{{kb_context}}
Return this exact JSON structure:
{
 "offer_recommended": "<Free Tier | Growth Tier | Partner Retainer>",
 "reason": "<2 sentences why>",
 "skills_match": "<which of our trained skills fit this company>",
 "hiring_potential": "high|medium|low",
 "personalisation_hook": "<one specific sentence about this company>"
}`
    }
  ];

  for (const p of prompts) {
    await pool.query(`
      INSERT INTO prompt_templates (name, purpose, prompt_text)
      VALUES ($1, $2, $3)
      ON CONFLICT (name) DO NOTHING
    `, [p.name, p.purpose, p.prompt_text]);
  }
  console.log('✅ AI Prompts seeded');

  console.log('\\n✅ AllianceOS database extensions setup complete!');
  await pool.end();
}

setupAllianceDb().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
