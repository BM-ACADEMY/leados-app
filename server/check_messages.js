const pool = require('./db/connection');

(async () => {
  try {
    const res = await pool.query(`
      SELECT * FROM messages 
      WHERE content IN ('Hii', 'Hello', 'What')
      ORDER BY sent_at DESC
    `);
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
