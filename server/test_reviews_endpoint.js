require('dotenv').config();
const pool = require('./db/connection');
const axios = require('axios');

const dataForSeoAuth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

async function test(clientId) {
  try {
    console.log(`Testing reviews fetch for client ${clientId}...`);
    const clientRes = await pool.query(
      'SELECT * FROM mafiya_gmb_clients WHERE id = $1',
      [clientId]
    );
    const client = clientRes.rows[0];
    const businessName = client.business_name;

    // Call google/maps/live/advanced
    const postData = [{ keyword: `${businessName} Pondicherry`, language_code: "en", location_name: "India" }];
    const dfsRes = await axios({
      method: 'post',
      url: 'https://api.dataforseo.com/v3/serp/google/maps/live/advanced',
      data: postData,
      headers: { 'Authorization': `Basic ${dataForSeoAuth}`, 'Content-Type': 'application/json' }
    });

    const items = dfsRes.data.tasks?.[0]?.result?.[0]?.items || [];
    let gbpData = items[0];
    if (gbpData) {
      console.log('gbpData keys:', Object.keys(gbpData));
      console.log('gbpData title:', gbpData.title);
      console.log('gbpData cid:', gbpData.cid);
      console.log('gbpData url:', gbpData.url);
      console.log('gbpData place_id:', gbpData.place_id);
      console.log('gbpData rating:', gbpData.rating);
    }
  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await pool.end();
  }
}

test(6);
