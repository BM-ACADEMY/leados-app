const pool = require('./db');

async function run() {
  const res = await pool.query('SELECT * FROM templates');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit();
}
run();
