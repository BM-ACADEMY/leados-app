require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});
pool.query("UPDATE clients SET wa_access_token = $1 WHERE name ILIKE '%bm academy%' OR name ILIKE '%bm-academy%'", [process.env.META_PAGE_ACCESS_TOKEN]).then(r => {
  console.log("Updated BM Academy token successfully!");
  process.exit(0);
});
