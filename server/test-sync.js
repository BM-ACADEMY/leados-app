require('dotenv').config();
const db = require('./db/connection');
const axios = require('axios');
const cryptoHelper = require('./utils/crypto');

async function testSync() {
  try {
    const { rows } = await db.query(`
      SELECT bsa.*, c.id as client_id 
      FROM brand_social_accounts bsa
      LEFT JOIN clients c ON bsa.brand_name = c.name 
      WHERE bsa.platform = 'facebook' AND bsa.is_active = true AND bsa.facebook_page_id IS NOT NULL
    `);
    
    let totalSynced = 0;
    
    for (const acc of rows) {
      const pageId = acc.facebook_page_id;
      const masterToken = cryptoHelper.decrypt(acc.access_token);
      const clientId = acc.client_id;
      console.log(`Syncing page: ${pageId} (Client ID: ${clientId})`);
      
      try {
        const pageTokenRes = await axios.get(
          `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${masterToken}`
        );
        const pageToken = pageTokenRes.data.access_token;
        
        const formsRes = await axios.get(
          `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms`,
          { params: { access_token: pageToken } }
        );
        
        for (const form of formsRes.data.data) {
          const formId = form.id;
          const leadsRes = await axios.get(
            `https://graph.facebook.com/v18.0/${formId}/leads`,
            { params: { access_token: pageToken, limit: 100 } }
          );
          
          const leads = leadsRes.data.data || [];
          for (const leadData of leads) {
            const leadgenId = leadData.id;
            
            // Skip if exists
            const checkRes = await db.query('SELECT id FROM leads WHERE leadgen_id = $1', [leadgenId]);
            if (checkRes.rows.length > 0) continue;

            let email = '', phone = '', name = '';
            if (leadData.field_data) {
              for (const field of leadData.field_data) {
                if (field.name.includes('email')) email = field.values[0];
                if (field.name.includes('phone') || field.name === 'contact_number') phone = field.values[0];
                if (field.name.includes('name')) name = field.values[0];
              }
            }
            
            if (phone.startsWith('+')) phone = phone.substring(1);
            if (phone.startsWith('0')) phone = phone.substring(1);
            if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;

            if (phone) {
               const pcRes = await db.query('SELECT id FROM leads WHERE phone = $1 AND client_id = $2', [phone, clientId]);
               if (pcRes.rows.length > 0) {
                  await db.query('UPDATE leads SET leadgen_id = $1, meta_lead_id = $1 WHERE id = $2', [leadgenId, pcRes.rows[0].id]);
                  continue;
               }
            }

            try {
              await db.query(`
                INSERT INTO leads (name, phone, email, source, status, score, client_id, leadgen_id, meta_lead_id, created_at)
                VALUES ($1, $2, $3, 'facebook', 'New', 10, $4, $5, $5, $6)
                ON CONFLICT (leadgen_id) DO NOTHING
              `, [name || 'FB Lead', phone, email, clientId, leadgenId, new Date(leadData.created_time || Date.now())]);
              totalSynced++;
            } catch(e) {
              console.error("Insert error for lead", leadgenId, e.message);
            }
          }
        }
      } catch (err) {
        console.error(`Error syncing page ${pageId}:`, err.response?.data?.error?.message || err.message);
      }
    }
    
    console.log("Total synced:", totalSynced);
    process.exit(0);
  } catch (err) {
    console.error('Error syncing all leads:', err.message);
    process.exit(1);
  }
}
testSync();
