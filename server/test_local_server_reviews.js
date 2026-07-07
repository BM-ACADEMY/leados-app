require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function run() {
  try {
    const token = jwt.sign({ id: 1, email: 'kamar@abmgroups.org' }, process.env.JWT_SECRET);
    console.log('Generated local JWT token:', token);

    console.log('Querying reviews status...');
    const statusRes = await axios.get('http://localhost:3600/api/mafiya/reviews/status?clientId=6', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Status Response:', statusRes.data);

    console.log('Querying reviews data (this will search maps and poll DataForSEO)...');
    const dataRes = await axios.get('http://localhost:3600/api/mafiya/reviews/data?clientId=6', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Data Response keys:', Object.keys(dataRes.data));
    console.log('Business:', dataRes.data.business);
    console.log(`Found ${dataRes.data.recentReviews?.length || 0} reviews`);
  } catch (err) {
    console.error('API call failed:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  }
}

run();
