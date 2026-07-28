require('dotenv').config();
const db = require('./db/connection');
const axios = require('axios');
const cryptoHelper = require('./utils/crypto');

async function checkMetaLeads() {
  try {
    const { rows } = await db.query(`
      SELECT bsa.account_name, bsa.brand_name, bsa.facebook_page_id, bsa.access_token 
      FROM brand_social_accounts bsa
      WHERE bsa.platform = 'facebook' AND bsa.is_active = true AND bsa.facebook_page_id IS NOT NULL
    `);
    
    console.log(`Found ${rows.length} connected Facebook pages.`);
    
    for (const acc of rows) {
      console.log(`\n--- Checking Page: ${acc.account_name} (${acc.brand_name}) ---`);
      const pageId = acc.facebook_page_id;
      const masterToken = cryptoHelper.decrypt(acc.access_token);
      
      try {
        const pageTokenRes = await axios.get(
          `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${masterToken}`
        );
        const pageToken = pageTokenRes.data.access_token;
        
        const formsRes = await axios.get(
          `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms`,
          { params: { access_token: pageToken } }
        );
        
        const forms = formsRes.data.data;
        if (!forms || forms.length === 0) {
          console.log(`  No Lead Generation Forms found for this page.`);
          continue;
        }
        
        console.log(`  Found ${forms.length} Lead Forms:`);
        let totalLeadsForPage = 0;
        
        for (const form of forms) {
          const formId = form.id;
          const leadsRes = await axios.get(
            `https://graph.facebook.com/v18.0/${formId}/leads`,
            { params: { access_token: pageToken, limit: 100 } }
          );
          
          const leadsCount = leadsRes.data.data ? leadsRes.data.data.length : 0;
          console.log(`    - Form "${form.name}" (ID: ${form.id}): ${leadsCount} leads available.`);
          totalLeadsForPage += leadsCount;
        }
        console.log(`  Total leads available across all forms: ${totalLeadsForPage}`);
      } catch (err) {
        console.error(`  Error fetching data for page ${pageId}: ${err.response?.data?.error?.message || err.message}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkMetaLeads();
