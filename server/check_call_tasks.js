const pool = require('./db/connection.js'); 
pool.query("SELECT * FROM sales_tasks WHERE task_type = 'call'").then(res => { 
  console.log('Count:', res.rows.length); 
  console.table(res.rows);
  pool.end(); 
});
