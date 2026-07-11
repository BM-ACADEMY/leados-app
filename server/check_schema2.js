const pool = require('./db/connection');
async function test() {
  const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='conversations'");
  console.log("Conversations:", rows.map(r => r.column_name));
  
  const msgRows = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='messages'");
  console.log("Messages:", msgRows.rows.map(r => r.column_name));
  
  process.exit(0);
}
test();
