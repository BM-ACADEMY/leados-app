const pool = require('./db/connection');

async function checkSchema() {
  try {
    const clientsSchema = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'mafiya_gmb_clients'`
    );
    console.log('--- GMB Clients columns ---');
    clientsSchema.rows.forEach(c => console.log(`${c.column_name}: ${c.data_type}`));

    const keywordsSchema = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'mafiya_turf_keywords'`
    );
    console.log('\n--- Keywords columns ---');
    keywordsSchema.rows.forEach(k => console.log(`${k.column_name}: ${k.data_type}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

checkSchema();
