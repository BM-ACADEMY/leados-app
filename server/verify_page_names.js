const pool = require('./db/connection');
const cryptoHelper = require('./utils/crypto');
const axios = require('axios');

async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT id, brand_name, platform, account_name, facebook_page_id, access_token FROM brand_social_accounts WHERE is_active = true AND platform = 'facebook'");
    console.log('Verifying connected Facebook pages in DB:\n');
    
    for (const acc of rows) {
      if (!acc.access_token) {
        console.log(`- Brand: ${acc.brand_name} | DB Name: ${acc.account_name} | No access token`);
        continue;
      }
      
      try {
        const decryptedToken = cryptoHelper.decrypt(acc.access_token);
        const fbRes = await axios.get(`https://graph.facebook.com/v19.0/${acc.facebook_page_id}`, {
          params: {
            access_token: decryptedToken,
            fields: 'name,id'
          }
        });
        console.log(`✓ Brand: ${acc.brand_name} | DB Page ID: ${acc.facebook_page_id} | DB Name: ${acc.account_name} => ACTUAL Meta Page Name: "${fbRes.data.name}"`);
      } catch (fbErr) {
        console.error(`✗ Brand: ${acc.brand_name} | DB Name: ${acc.account_name} | API Error:`, fbErr.response?.data || fbErr.message);
      }
    }
  } catch (err) {
    console.error('Error running check:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
