const pool = require('./db/connection');

(async () => {
  try {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'messages'
    `);
    console.log(res.rows.map(r => r.column_name));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
