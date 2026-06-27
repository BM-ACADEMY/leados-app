const pool = require('./db/connection');

async function run() {
  const client = await pool.connect();
  try {
    // Find check constraints on brand_name
    const res = await client.query(`
      SELECT DISTINCT
        tc.constraint_name, 
        tc.table_name
      FROM 
        information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
      WHERE 
        tc.constraint_type = 'CHECK'
        AND ccu.column_name = 'brand_name'
        AND tc.table_name IN ('content_queue', 'brand_social_accounts')
    `);
    
    console.log('Found check constraints:', res.rows);
    
    for (const row of res.rows) {
      console.log(`Dropping constraint "${row.constraint_name}" on table "${row.table_name}"...`);
      await client.query(`ALTER TABLE ${row.table_name} DROP CONSTRAINT "${row.constraint_name}"`);
    }
    
    console.log('Successfully dropped all brand_name check constraints! ✅');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
