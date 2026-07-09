const pool = require('./db/connection');

async function test() {
  try {
    const res = await pool.query('SELECT * FROM mafiya_gmb_clients LIMIT 5');
    console.log('Columns:', Object.keys(res.rows[0] || {}));
    console.log('Rows:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

test();
