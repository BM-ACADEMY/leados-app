const axios = require('axios');
require('dotenv').config();

async function testSerp() {
  const SERP_API_KEY = process.env.SERP_RADAR_API_KEY || process.env.SERP_API_KEY || process.env.SERPKEY;
  if (!SERP_API_KEY) {
    console.error('No SERP API Key found');
    return;
  }
  
  const q = 'RKS Infotech 4th floor, SVR Plaza, NO.88, Villianur Ma';
  const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(q)}&api_key=${SERP_API_KEY}`;
  
  try {
    const res = await axios.get(url);
    console.log('Has local_results:', !!res.data.local_results);
    console.log('Has place_results:', !!res.data.place_results);
    if (res.data.place_results) {
        console.log('place_results title:', res.data.place_results.title);
        console.log('place_results phone:', res.data.place_results.phone);
    }
  } catch(e) {
    console.error(e.message);
  }
}
testSerp();
