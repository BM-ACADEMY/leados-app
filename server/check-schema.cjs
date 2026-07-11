const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
});
const checkSchema = async (table) => {
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
    console.log(`Schema for ${table}:`, res.rows);
}
const run = async () => {
    await checkSchema('mafiya_gmb_clients');
    await checkSchema('mafiya_gmb_tokens');
    await checkSchema('mafiya_gmb_posts');
    pool.end();
}
run();
