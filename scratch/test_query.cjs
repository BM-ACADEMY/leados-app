require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });
const pool = require('../server/db/connection');

async function test() {
  try {
    console.log('Querying clients...');
    const clients = await pool.query('SELECT * FROM mafiya_gmb_clients LIMIT 1');
    console.log('Clients result:', clients.rows);
    
    if (clients.rows.length > 0) {
      const clientId = clients.rows[0].id;
      console.log(`Querying status for client id ${clientId}...`);
      const statusRes = await pool.query(
        'SELECT id, gmb_verified FROM mafiya_gmb_clients WHERE id = $1',
        [clientId]
      );
      console.log('Status query result:', statusRes.rows);
    } else {
      console.log('No clients found in mafiya_gmb_clients!');
    }
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await pool.end();
  }
}

test();
