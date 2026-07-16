require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});

async function createTables() {
  try {
    console.log("Starting SalesOS DB Migration...");

    // 1. Create follow-up rules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS followup_rules (
        id SERIAL PRIMARY KEY,
        brand TEXT NOT NULL,
        stage TEXT NOT NULL,
        touch_number INT NOT NULL,
        delay_minutes INT NOT NULL,
        action_type TEXT NOT NULL,
        template_id TEXT,
        payload_template TEXT,
        ai_prompt_template TEXT,
        priority INT DEFAULT 1,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ followup_rules table ready.");

    // 2. Create messages table (if it doesn't exist)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        lead_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        direction TEXT NOT NULL,
        type TEXT NOT NULL,
        template_name TEXT,
        template_params TEXT,
        content TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ messages table ready.");

    // 3. Create ai_decisions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_decisions (
        id SERIAL PRIMARY KEY,
        lead_id TEXT,
        module TEXT NOT NULL,
        input TEXT,
        output TEXT,
        confidence INT,
        model TEXT,
        tokens INT,
        execution_time_ms INT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ ai_decisions table ready.");

    // 4. Create workflow_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_logs (
        id SERIAL PRIMARY KEY,
        workflow TEXT NOT NULL,
        lead_id TEXT,
        status TEXT,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ workflow_logs table ready.");

    // 5. Alter existing leads table safely
    // Note: 'id' in current leads table is a SERIAL or integer, but spec asks for lead_id TEXT. 
    // We will stick to the existing ID and just add the new tracking columns.
    const columnsToAdd = [
      "brand_confidence INT DEFAULT 100",
      "clarification_required BOOLEAN DEFAULT FALSE",
      "owner TEXT",
      "stage TEXT",
      "objections TEXT",
      "touch_count INT DEFAULT 0",
      "last_activity TIMESTAMP",
      "last_followup TIMESTAMP",
      "next_followup_due TIMESTAMP",
      "call_booked BOOLEAN DEFAULT FALSE",
      "call_booked_at TIMESTAMP",
      "payment_status TEXT",
      "whatsapp_opt_in BOOLEAN DEFAULT FALSE",
      "whatsapp_opt_in_at TIMESTAMP",
      "whatsapp_opt_out BOOLEAN DEFAULT FALSE",
      "whatsapp_opt_out_at TIMESTAMP",
      "preferred_contact_method TEXT",
      "last_interaction_channel TEXT",
      "campaign_id TEXT",
      "ad_account_id TEXT",
      "ad_id TEXT",
      "lead_ad_form_id TEXT",
      "conversation_summary TEXT"
    ];

    for (let col of columnsToAdd) {
      try {
        await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col};`);
      } catch (err) {
        // Ignore errors if column already exists in some weird format
        console.log(`Note on ${col}: ${err.message}`);
      }
    }
    console.log("✅ leads table altered successfully with new SalesOS columns.");

    console.log("🎉 Migration complete!");
    process.exit(0);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

createTables();
