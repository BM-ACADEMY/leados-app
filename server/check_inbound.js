const pool = require('./db/connection');

(async () => {
  try {
    const res = await pool.query(`
      SELECT * FROM messages 
      WHERE direction = 'inbound' 
      ORDER BY sent_at DESC 
      LIMIT 10
    `);
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
