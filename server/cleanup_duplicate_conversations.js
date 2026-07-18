require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/leados',
});

async function run() {
  console.log('Starting duplicate conversations cleanup...');
  try {
    // 1. Group conversations by the last 10 digits of phone and tenant_id
    const duplicatesRes = await pool.query(`
      SELECT tenant_id, RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) as phone10, array_agg(id) as conv_ids
      FROM conversations
      WHERE phone IS NOT NULL
      GROUP BY tenant_id, RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10)
      HAVING count(id) > 1
    `);

    const groups = duplicatesRes.rows;
    console.log(`Found ${groups.length} groups of duplicate conversations.`);

    for (const group of groups) {
      const convIds = group.conv_ids;
      
      // Get full details to pick the primary
      const convsRes = await pool.query(`
        SELECT id, created_at, lead_id FROM conversations 
        WHERE id = ANY($1) 
        ORDER BY created_at ASC
      `, [convIds]);
      
      const convs = convsRes.rows;
      // Pick the first one (oldest) as primary
      const primary = convs[0];
      const duplicates = convs.slice(1);

      console.log(`Merging ${duplicates.length} duplicates into primary conversation ${primary.id} for phone ${group.phone10}...`);

      // Ensure the primary has a valid lead_id if any of the duplicates do
      const validLeadId = convs.find(c => c.lead_id)?.lead_id;
      if (validLeadId && !primary.lead_id) {
        await pool.query('UPDATE conversations SET lead_id = $1 WHERE id = $2', [validLeadId, primary.id]);
      }

      for (const dup of duplicates) {
        // Move messages
        await pool.query(`
          UPDATE messages 
          SET conversation_id = $1 
          WHERE conversation_id = $2
        `, [primary.id, dup.id]);

        // Delete duplicate conversation
        await pool.query(`
          DELETE FROM conversations 
          WHERE id = $1
        `, [dup.id]);
      }
    }

    console.log('Cleanup completed successfully!');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    pool.end();
  }
}

run();
