const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function test() {
  const apiKey = process.env.SERP_API_KEY;
  console.log('Using API Key:', apiKey);

  let allPlaces = [];
  try {
    for (let page = 1; page <= 3; page++) {
      console.log(`Querying page ${page}...`);
      const response = await axios.post(
        'https://google.serper.dev/places',
        { 
          q: 'full stack developer course pondicherry', 
          gl: 'in', 
          hl: 'en',
          ll: '@11.9416,79.8083,14z', // Pondicherry coordinates & zoom level
          page: page
        },
        { headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' } }
      );
      
      const pagePlaces = response.data?.places || [];
      console.log(`Page ${page} count:`, pagePlaces.length);
      allPlaces = allPlaces.concat(pagePlaces);
    }

    console.log('\n--- ALL PLACES FOUND (count):', allPlaces.length);
    allPlaces.forEach((r, i) => {
      console.log(`[${i + 1}] Title: "${r.title}"`);
    });

    const cleanClientName = 'bmacademy';
    const matchIdx = allPlaces.findIndex(r => {
      const cleanResultTitle = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanResultTitle.includes(cleanClientName) || cleanClientName.includes(cleanResultTitle);
    });

    if (matchIdx !== -1) {
      console.log(`\n🎉 Found match at position: ${matchIdx + 1}`);
    } else {
      console.log('\n❌ No match found in top 30');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
