const axios = require('axios');
const auth = Buffer.from('admin@abmgroups.org:aa3cbcc106cb7395').toString('base64');

async function testDataForSeo() {
  const postData = [{
    keyword: "RKS Infotech",
    location_name: "Puducherry,India",
    language_code: "en"
  }];
  
  try {
    const res = await axios({
      method: 'post',
      url: 'https://api.dataforseo.com/v3/serp/google/maps/live/advanced',
      data: postData,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(JSON.stringify(res.data.tasks[0].result[0].items[0], null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
testDataForSeo();
