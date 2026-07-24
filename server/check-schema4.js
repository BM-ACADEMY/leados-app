require('dotenv').config();
const db = require('./db/connection');
db.query("SELECT conname as constraint_name, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'leads'::regclass").then(r=>{
  console.log(r.rows);
  process.exit(0);
});
