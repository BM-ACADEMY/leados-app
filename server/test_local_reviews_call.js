const axios = require('axios');

async function check() {
  try {
    console.log('Fetching reviews status from local server...');
    const statusRes = await axios.get('http://localhost:3600/api/mafiya/reviews/status?clientId=6');
    console.log('Status Response:', statusRes.data);

    console.log('Fetching reviews data from local server...');
    const dataRes = await axios.get('http://localhost:3600/api/mafiya/reviews/data?clientId=6');
    console.log('Data Response keys:', Object.keys(dataRes.data));
    console.log('Business:', dataRes.data.business);
    console.log('Reviews Count:', dataRes.data.recentReviews?.length);
  } catch (err) {
    console.error('Local call failed:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  }
}

check();
