const pool = require('./db/connection');

(async () => {
  try {
    const r = await pool.query(`
      SELECT column_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'leads' AND table_schema = 'public'
    `);
    console.table(r.rows);
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
})();
