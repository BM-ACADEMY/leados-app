require('dotenv').config();
const axios = require('axios');

const dataForSeoAuth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

async function testReviews(keyword) {
  try {
    console.log(`Querying DataForSEO reviews for keyword "${keyword}"...`);
    const dfsReviewsRes = await axios({
      method: 'post',
      url: 'https://api.dataforseo.com/v3/reviews/google/live',
      data: [{ keyword, language_code: "en", location_name: "India", depth: 20 }],
      headers: { 'Authorization': `Basic ${dataForSeoAuth}`, 'Content-Type': 'application/json' }
    });

    const task = dfsReviewsRes.data.tasks[0];
    console.log(`Status: ${task.status_code} - ${task.status_message}`);
    const items = task.result?.[0]?.items || [];
    console.log(`Found ${items.length} reviews`);
    if (items.length > 0) {
      console.log('First reviewer name:', items[0].profile_name);
    }
  } catch (err) {
    console.error('Test error:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  }
}

async function run() {
  await testReviews("BM Academy Pondicherry");
}

run();
