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
  console.log('🔧 Thedal OS Database Setup Starting...\n');

  // 1. thedal_clients
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_clients (
      id SERIAL PRIMARY KEY,
      domain VARCHAR(255) NOT NULL,
      plan VARCHAR(50) DEFAULT 'Growth',
      gsc_connected BOOLEAN DEFAULT false,
      gmb_client_id INTEGER,
      score INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 1/15: thedal_clients');

  // 2. thedal_keywords
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_keywords (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      keyword VARCHAR(255) NOT NULL,
      device VARCHAR(50) DEFAULT 'desktop',
      location VARCHAR(255) DEFAULT 'Pondicherry',
      current_rank INTEGER DEFAULT 0,
      best_rank INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 2/15: thedal_keywords');

  // 3. thedal_rank_history
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_rank_history (
      id SERIAL PRIMARY KEY,
      keyword_id INTEGER REFERENCES thedal_keywords(id) ON DELETE CASCADE,
      checked_date DATE DEFAULT CURRENT_DATE,
      rank INTEGER NOT NULL,
      serp_features JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 3/15: thedal_rank_history');

  // 4. thedal_gsc_tokens
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_gsc_tokens (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMP
    )
  `);
  console.log('✅ Table 4/15: thedal_gsc_tokens');

  // 5. thedal_gsc_snapshots
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_gsc_snapshots (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      snapshot_date DATE DEFAULT CURRENT_DATE,
      total_clicks INTEGER DEFAULT 0,
      total_impressions INTEGER DEFAULT 0,
      avg_ctr NUMERIC(5,2) DEFAULT 0,
      avg_position NUMERIC(5,2) DEFAULT 0
    )
  `);
  console.log('✅ Table 5/15: thedal_gsc_snapshots');

  // 6. thedal_gsc_queries
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_gsc_queries (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      query VARCHAR(255) NOT NULL,
      clicks INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      ctr NUMERIC(5,2) DEFAULT 0,
      position NUMERIC(5,2) DEFAULT 0,
      fetched_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 6/15: thedal_gsc_queries');

  // 7. thedal_gsc_pages
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_gsc_pages (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      page_url TEXT NOT NULL,
      clicks INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      ctr NUMERIC(5,2) DEFAULT 0,
      position NUMERIC(5,2) DEFAULT 0,
      fetched_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 7/15: thedal_gsc_pages');

  // 8. thedal_gsc_coverage
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_gsc_coverage (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      indexed_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      excluded_count INTEGER DEFAULT 0,
      fetched_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 8/15: thedal_gsc_coverage');

  // 9. thedal_audits
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_audits (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      overall_score INTEGER DEFAULT 0,
      pass_count INTEGER DEFAULT 0,
      warn_count INTEGER DEFAULT 0,
      fail_count INTEGER DEFAULT 0,
      run_date TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 9/15: thedal_audits');

  // 10. thedal_audit_items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_audit_items (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER REFERENCES thedal_audits(id) ON DELETE CASCADE,
      check_key VARCHAR(100) NOT NULL,
      status VARCHAR(20) DEFAULT 'fail',
      score INTEGER DEFAULT 0,
      message TEXT,
      fix_guide TEXT
    )
  `);
  console.log('✅ Table 10/15: thedal_audit_items');

  // 11. thedal_content
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_content (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      content_type VARCHAR(50) NOT NULL,
      title VARCHAR(255),
      body TEXT,
      target_keyword VARCHAR(255),
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 11/15: thedal_content');

  // 12. thedal_schema_library
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_schema_library (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      schema_type VARCHAR(100) NOT NULL,
      schema_json JSONB NOT NULL,
      target_page VARCHAR(255),
      is_deployed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 12/15: thedal_schema_library');

  // 13. thedal_backlinks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_backlinks (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      source_domain VARCHAR(255) NOT NULL,
      anchor_text VARCHAR(255),
      link_type VARCHAR(50) DEFAULT 'dofollow',
      is_toxic BOOLEAN DEFAULT false,
      discovered_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 13/15: thedal_backlinks');

  // 14. thedal_rivals
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_rivals (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      rival_domain VARCHAR(255) NOT NULL,
      shared_keywords INTEGER DEFAULT 0,
      content_gap_json JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 14/15: thedal_rivals');

  // 15. thedal_reports
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thedal_reports (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES thedal_clients(id) ON DELETE CASCADE,
      report_month VARCHAR(50) NOT NULL,
      file_url TEXT,
      keywords_tracked INTEGER DEFAULT 0,
      avg_rank NUMERIC(5,2) DEFAULT 0,
      generated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table 15/15: thedal_reports');

  // SEED SAMPLE DATA
  console.log('\n🌱 Seeding sample Thedal clients & keywords...');
  
  const clients = [
    { domain: 'raahathdentalcare.in', plan: 'Growth', score: 85 },
    { domain: 'ramyaagencies.com', plan: 'Starter', score: 92 },
    { domain: 'vajradoors.in', plan: 'Growth', score: 76 },
    { domain: 'cmipondy.edu.in', plan: 'Pro', score: 88 },
  ];

  for (const c of clients) {
    const res = await pool.query(`
      INSERT INTO thedal_clients (domain, plan, score) 
      VALUES ($1, $2, $3) RETURNING id
    `, [c.domain, c.plan, c.score]);
    const cid = res.rows[0].id;

    // Add some keywords
    await pool.query(`
      INSERT INTO thedal_keywords (client_id, keyword, current_rank, best_rank)
      VALUES 
        ($1, 'dentist pondicherry', 4, 3),
        ($1, 'dental clinic near me', 12, 12)
    `, [cid]);
  }

  console.log('  ✓ 4 sample clients seeded');
  console.log('\n✅ Database setup complete!\n');
  await pool.end();
}

setup().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
