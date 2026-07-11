/**
 * Dedup leads that have the same normalized phone number.
 * Keeps the OLDEST (manually-added) lead and migrates conversations
 * from the duplicate (auto-created WhatsApp) lead to the original.
 * Run inside server/ folder: node dedup-leads.cjs
 */

const pool = require('./db/connection');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find all phones that have more than one lead
    const { rows: dupes } = await client.query(`
      SELECT REGEXP_REPLACE(phone, '[^0-9]', '', 'g') as phone_normalized, array_agg(id ORDER BY created_at ASC) as ids
      FROM leads
      WHERE phone IS NOT NULL AND phone <> ''
      GROUP BY phone_normalized
      HAVING COUNT(*) > 1
    `);

    if (dupes.length === 0) {
      console.log('✅ No duplicate leads found.');
      return;
    }

    console.log(`Found ${dupes.length} phone number(s) with duplicates. Merging...`);

    for (const row of dupes) {
      const [keepId, ...removeIds] = row.ids;
      console.log(`  Phone: ${row.phone_normalized} → keep ${keepId}, remove [${removeIds.join(', ')}]`);

      for (const removeId of removeIds) {
        // Move conversations to the kept lead
        await client.query(
          'UPDATE conversations SET lead_id = $1 WHERE lead_id = $2',
          [keepId, removeId]
        );
        // Delete the duplicate lead
        await client.query('DELETE FROM leads WHERE id = $1', [removeId]);
        console.log(`    ✓ Migrated conversations from ${removeId} → ${keepId} and deleted duplicate.`);
      }
    }

    await client.query('COMMIT');
    console.log('\n🎉 Done! All duplicate leads merged.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during dedup:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
