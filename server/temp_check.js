const { Pool } = require('pg');
const pool = new Pool({
  host: 'leados-api.abmgroups.org',
  user: 'leados_user',
  password: 'LeadOS_DB@2026',
  database: 'leados_db',
  port: 5432
});

async function run() {
  try {
    const res = await pool.query("SELECT id, brand_name, thumbnail_title, status, scheduled_at, platforms, file_name, video_url, public_video_url, thumbnail_url FROM content_queue ORDER BY id DESC LIMIT 5");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
run();
