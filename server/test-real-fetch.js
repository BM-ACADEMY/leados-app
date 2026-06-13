const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function run() {
  const { rows } = await pool.query('SELECT id, name, google_email, oauth_status, access_token, refresh_token FROM clients WHERE id = 53');
  if (rows.length === 0) {
    console.log('Client 52 not found');
    await pool.end();
    return;
  }
  const client = rows[0];
  console.log('Client Name:', client.name);
  console.log('OAuth Status:', client.oauth_status);

  let token = client.access_token;
  console.log('Using Access Token:', token ? token.substring(0, 20) + '...' : 'none');

  try {
    console.log('Step 1: Fetch Accounts from mybusinessbusinessinformation...');
    const accountsRes = await axios.get('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Accounts Response Status:', accountsRes.status);
    console.log('Accounts Response Data:', JSON.stringify(accountsRes.data, null, 2));

    const accounts = accountsRes.data.accounts || [];
    if (accounts.length === 0) {
      console.log('No accounts returned.');
      await pool.end();
      return;
    }

    const accountName = accounts[0].name; // e.g. "accounts/12345"
    console.log('Step 2: Fetch Locations for account:', accountName);
    const locationsRes = await axios.get(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Locations Response Status:', locationsRes.status);
    console.log('Locations Response Data:', JSON.stringify(locationsRes.data, null, 2));

    const locations = locationsRes.data.locations || [];
    if (locations.length === 0) {
      console.log('No locations returned.');
      await pool.end();
      return;
    }

    const locationName = locations[0].name; // e.g. "locations/67890" or "accounts/123/locations/456"
    console.log('Step 3: Fetch Reviews for location:', locationName);
    const reviewsRes = await axios.get(`https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Reviews Response Status:', reviewsRes.status);
    console.log('Reviews Response Data:', JSON.stringify(reviewsRes.data, null, 2));

  } catch (err) {
    console.error('Error occurred in flow:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }

  await pool.end();
}

run().catch(console.error);
