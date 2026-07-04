/**
 * LeadOS — Schema Analysis & Real Schema Migration
 * 
 * ACTUAL SCHEMA:
 * - conversations: thread-level (one per lead/phone), has lead_id
 * - messages: individual messages, linked via conversation_id → conversations.id
 * 
 * PLAN:
 * 1. Ensure messages table has all needed columns
 * 2. Add lead_id index via conversations join (no schema change needed)
 * 3. Server reads: JOIN conversations ON messages.conversation_id = conversations.id WHERE conversations.lead_id = $1
 * 4. Server writes: Find/create conversation for lead, then insert message
 * 
 * This is actually the CORRECT normalized schema. We just need to:
 * - Fix GET /api/leads/:id to join correctly
 * - Fix POST /api/whatsapp/send to upsert conversation then insert message  
 * - Fix POST /webhook/whatsapp same way
 * - Fix frontend to render m.content (already done)
 */

const pool = require('./db/connection');

(async () => {
  try {
    // Check if messages table needs wa_msg_id → standardize column presence
    const existing = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'messages' AND table_schema = 'public'
    `);
    const cols = existing.rows.map(r => r.column_name);
    console.log('Current messages columns:', cols.join(', '));

    // Ensure we have a proper index on conversation_id
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id)`);
    console.log('✅ Indexes ensured');

    // Show sample data
    const sample = await pool.query(`SELECT c.lead_id, m.id, m.direction, m.content, m.wa_msg_id FROM messages m JOIN conversations c ON m.conversation_id = c.id LIMIT 5`);
    console.log('\nSample joined messages:');
    sample.rows.forEach(r => console.log(JSON.stringify(r)));

    console.log('\n✅ Schema is ready. No destructive migration needed.');
    console.log('The server.js and InboxView.jsx will be updated to use the correct join queries.');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();
