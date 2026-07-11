const pool = require('./db/connection');
async function test() {
  const { rows } = await pool.query("SELECT * FROM messages WHERE direction='outbound' ORDER BY id DESC LIMIT 5");
  console.log(rows);
  process.exit(0);
}
test();
