require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST, 
  port: process.env.DB_PORT, 
  database: process.env.DB_NAME, 
  user: process.env.DB_USER, 
  password: process.env.DB_PASS, 
  ssl: false
});

pool.query(`
  UPDATE leads 
  SET campaign_name = NULL 
  WHERE campaign_name = 'B3_SEP26_LEAD-WA_PROSPECT' 
  AND (ad_id IS NULL OR ad_id != '120253841166270057');
`)
.then(res => console.log('Fixed', res.rowCount))
.catch(console.error)
.finally(()=>pool.end());
