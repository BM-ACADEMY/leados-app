const { Pool } = require('pg');
const pool = new Pool({
  host: 'leados-api.abmgroups.org',
  user: 'leados_user',
  password: 'LeadOS_DB@2026',
  database: 'leados_db',
  port: 5432
});

const axios = require('axios');
async function run() {
  const url = 'https://leados-api.abmgroups.org/uploads/transcoded_1LPxfMUbe_spaztPt3_YazpaW_VwUCYgG.mp4';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1'
      },
      responseType: 'stream'
    });
    console.log('FB Crawler GET status:', res.status, res.headers['content-type']);
  } catch (e) {
    if (e.response) {
      console.log('FB Crawler GET failed with status:', e.response.status, e.response.headers['content-type']);
      // Read a bit of the error response if it is HTML
      let body = '';
      e.response.data.on('data', chunk => { body += chunk; });
      e.response.data.on('end', () => { console.log('Error Body Snippet:', body.substring(0, 500)); });
    } else {
      console.log('FB Crawler GET failed:', e.message);
    }
  }
}
run();
