require('dotenv').config();
const axios = require('axios');

const dataForSeoAuth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testReviews(cid) {
  try {
    console.log(`Creating task for CID "${cid}"...`);
    const postRes = await axios({
      method: 'post',
      url: 'https://api.dataforseo.com/v3/business_data/google/reviews/task_post',
      data: [{ cid, location_name: "India", language_code: "en", depth: 20 }],
      headers: { 'Authorization': `Basic ${dataForSeoAuth}`, 'Content-Type': 'application/json' }
    });

    const task = postRes.data.tasks[0];
    if (task.status_code !== 20100) {
      console.error('Task creation failed:', task.status_message);
      return;
    }

    const taskId = task.id;
    console.log(`Task created successfully. Task ID: ${taskId}`);

    // Poll for results
    let attempts = 0;
    const maxAttempts = 15;
    while (attempts < maxAttempts) {
      console.log(`Polling attempt ${attempts + 1}...`);
      const getRes = await axios({
        method: 'get',
        url: `https://api.dataforseo.com/v3/business_data/google/reviews/task_get/${taskId}`,
        headers: { 'Authorization': `Basic ${dataForSeoAuth}` }
      });

      const getTask = getRes.data.tasks[0];
      if (getTask.status_code === 20000) {
        console.log('Task completed!');
        const reviews = getTask.result?.[0]?.items || [];
        console.log(`Found ${reviews.length} reviews`);
        if (reviews.length > 0) {
          console.log('First reviewer:', reviews[0].profile_name);
          console.log('First review text:', reviews[0].review_text);
        }
        return;
      }

      attempts++;
      await sleep(2000); // Wait 2 seconds before retrying
    }

    console.log('Polling timed out.');
  } catch (err) {
    console.error('Error:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  }
}

async function run() {
  await testReviews("12274444016073923575");
}

run();
