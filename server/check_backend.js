const axios = require('axios');

async function check() {
  try {
    console.log('Sending request to local server health endpoint...');
    const res = await axios.get('http://localhost:3600/health');
    console.log('Health check response:', res.data);
  } catch (err) {
    console.error('Backend connection failed:', err.message);
  }
}

check();
