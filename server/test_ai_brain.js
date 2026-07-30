const db = require('./db/connection');
const { evaluateLeadBrandAndSchedule, evaluateStuckLeads } = require('./services/aiBrain');

async function testAIBrain() {
  console.log("=== Testing New Lead AI Routing ===");
  try {
    // 1. Insert a dummy lead
    const insertRes = await db.query(`
      INSERT INTO leads (name, phone, source, interest, status, score, created_at)
      VALUES ($1, $2, $3, $4, 'new', 0, NOW())
      RETURNING id, name, next_follow_up, client_id
    `, ['Test AI Lead', '918881924385', 'Website', 'I am interested in software development services and need an app built.']);
    
    const newLead = insertRes.rows[0];
    console.log("1. Inserted New Lead:");
    console.log(`   ID: ${newLead.id}, Name: ${newLead.name}`);
    console.log(`   Before AI -> client_id: ${newLead.client_id}, next_follow_up: ${newLead.next_follow_up}`);

    console.log("2. Running AI Brain...");
    await evaluateLeadBrandAndSchedule(newLead.id);

    // Fetch again to see changes
    const updatedRes = await db.query('SELECT client_id, next_follow_up FROM leads WHERE id = $1', [newLead.id]);
    const updatedLead = updatedRes.rows[0];
    
    console.log("3. After AI Brain Evaluation:");
    console.log(`   Assigned client_id: ${updatedLead.client_id}`);
    console.log(`   Scheduled next_follow_up: ${updatedLead.next_follow_up}`);
    
    // Clean up
    await db.query('DELETE FROM leads WHERE id = $1', [newLead.id]);
    console.log("   (Test Lead Deleted)\n");

    console.log("=== Testing Stuck Leads AI (Running the Cron Job Manually) ===");
    console.log("Running evaluateStuckLeads()...");
    await evaluateStuckLeads();
    console.log("Stuck Leads evaluation finished.");

  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    process.exit(0);
  }
}

testAIBrain();
