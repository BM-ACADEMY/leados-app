require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});

async function updateTokens() {
  try {
    const defaultToken = 'EAAXSTuNdEm8BRhOOIVijWdE3345pkYdp4DovZCrZC3gIK5kWDR2EVTNbyeq5xiwYe8eU2xg54eAnBapic8LODzDXvFAWAXsQMpBjQuMV25AyIMekj3XZB7rqNuVq73FRfR7hyiTRWMZBf4rSjZA40I3jemwZC9Aw5HNNZCUb5lSvOwGZB1E1IOLRKMt4OPrMPAZDZD';
    const defaultPhoneId = '1063493870189640';

    const result = await pool.query(`
      UPDATE clients 
      SET 
        wa_access_token = COALESCE(wa_access_token, $1),
        phone_number_id = COALESCE(phone_number_id, $2)
      WHERE wa_access_token IS NULL OR phone_number_id IS NULL
      RETURNING name
    `, [defaultToken, defaultPhoneId]);

    console.log(`Successfully updated ${result.rowCount} brands with the default WhatsApp credentials:`);
    result.rows.forEach(row => console.log(`- ${row.name}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating tokens:', error);
    process.exit(1);
  }
}

updateTokens();
