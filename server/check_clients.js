const pool = require("./db/connection");

async function check() {
  try {
    const res = await pool.query("SELECT * FROM clients");
    console.log("Clients in DB:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
