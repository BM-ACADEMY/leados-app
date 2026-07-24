require('dotenv').config();
const db=require('./db/connection');
db.query("SELECT id, platform, brand_name, access_token FROM brand_social_accounts WHERE facebook_page_id='823437744195116'").then(r=>{
  console.log(r.rows);
  process.exit(0);
});
