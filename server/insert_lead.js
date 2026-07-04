const pool = require('./db/connection');

(async () => {
  try {
    const res = await pool.query(`
      INSERT INTO leads (name, phone, client_id, source)
      VALUES ('Charles', '918807226257', 1, 'Manual Testing')
      RETURNING id, name, phone
    `);
    console.log('✅ Successfully inserted lead!');
    console.table(res.rows);
  } catch (e) {
    console.error('❌ Error inserting lead:', e.message);
  } finally {
    await pool.end();
  }
})();
