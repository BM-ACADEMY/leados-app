require('dotenv').config();
const db=require('./db/connection');
const crypto=require('./utils/crypto');
db.query("SELECT facebook_page_id, access_token FROM brand_social_accounts WHERE facebook_page_id='823437744195116'").then(r=>{
  if(r.rows.length===0){console.log('No row found'); process.exit(0);}
  console.log('Decrypted Token:', crypto.decrypt(r.rows[0].access_token));
  process.exit(0);
});
