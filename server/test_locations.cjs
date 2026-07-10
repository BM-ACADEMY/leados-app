const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
});
const axios = require('axios');

async function test(clientId) {
  try {
    const res = await pool.query('SELECT access_token FROM mafiya_gmb_tokens WHERE client_id = $1', [clientId]);
    if (res.rows.length === 0) {
      console.log('No token for client', clientId);
      return pool.end();
    }
    const token = res.rows[0].access_token;
    console.log('Got token for client', clientId);
    
    const headers = { Authorization: 'Bearer ' + token };
    const accRes = await axios.get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers });
    console.log('Accounts:', accRes.data);
    
    for (const acc of accRes.data.accounts || []) {
      const locRes = await axios.get('https://mybusinessbusinessinformation.googleapis.com/v1/' + acc.name + '/locations?readMask=name,title,storeCode', { headers });
      console.log('Locations for', acc.name, ':', locRes.data);
    }
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  } finally {
    pool.end();
  }
}
test(9);
