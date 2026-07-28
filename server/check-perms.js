const axios = require('axios');
async function check() {
  try {
    const pageId = '826912293840782';
    const masterToken = 'EAAXSTuNdEm8BSD1KiMGnHNBS52cCLQluMNtognVawd2TsKosZCkpPYbpCZC1ZCKtpEGjiQtbbp1uleXCcijYS7RuNFZCNG5cZCqyKQhvZBE7vZB6qo47RI7qbZB5y3KZCyUKRlej05XxKJcGwDzhInN6izZAVy1EXAj1w3Fi0hwUfx6Tz2utULs95Rlu4d88SAcJy7jgZDZD';
    
    // 1. Get Page Token
    console.log('Getting page token...');
    const res = await axios.get(`https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${masterToken}`);
    const pageToken = res.data.access_token;
    
    console.log('Got Page Token. Subscribing to webhook...');
    // 2. Subscribe
    const subRes = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
      { subscribed_fields: ['leadgen'] },
      { params: { access_token: pageToken } }
    );
    console.log('Success:', subRes.data);
    
  } catch (err) {
    console.log('Error:', err.response ? err.response.data : err.message);
  }
}
check();
