const db = require('./db/connection');
const { evaluateLeadBrandAndSchedule } = require('./services/aiBrain');

async function fixExistingLeads() {
  console.log("=== Starting Data Migration for Existing Leads ===");
  try {
    // 2. Fix ALL remaining leads that have NO next_follow_up date
    console.log("\n2. Finding leads with NO next_follow_up date...");
    const nullFollowupLeads = await db.query(`
      SELECT id FROM leads 
      WHERE next_follow_up IS NULL 
        AND status != 'lost' 
        AND status != 'converted' 
    `);
    console.log(`Found ${nullFollowupLeads.rowCount} leads with null follow-up dates.`);
    
    if (nullFollowupLeads.rowCount > 0) {
      console.log("Initializing their next_follow_up to NOW() so n8n picks them up immediately...");
      // We stagger the follow_ups slightly so n8n doesn't crash sending 600 at once!
      // Distributing them across the next 2 hours
      await db.query(`
        UPDATE leads 
        SET next_follow_up = NOW() + (random() * interval '120 minutes')
        WHERE next_follow_up IS NULL 
          AND status != 'lost' 
          AND status != 'converted'
      `);
      console.log("Successfully updated all existing leads!");
    } else {
      console.log("No leads to update.");
    }

  } catch (err) {
    console.error("Migration Error:", err);
  } finally {
    process.exit(0);
  }
}

fixExistingLeads();
