const pool = require('./db/connection');
async function test() {
  const { rows } = await pool.query("SELECT * FROM templates LIMIT 5");
  console.log(rows);
  process.exit(0);
}
test();
