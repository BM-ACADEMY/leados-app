/**
 * Quick DB diagnostic for WF04 payment debugging
 * Run: node check_payment_debug.js
 */
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function run() {
  console.log('\n=== DB Diagnostic for WF04 Payment Flow ===\n');

  // 1. Check lead 92
  const lead = await pool.query(`
    SELECT l.id, l.name, l.phone, l.client_id, c.name as brand
    FROM leads l
    LEFT JOIN clients c ON c.id = l.client_id
    WHERE l.id = 92
  `);
  console.log('Lead ID 92:', lead.rows.length ? lead.rows[0] : '❌ NOT FOUND');

  // 2. Last 5 payments
  const payments = await pool.query(`
    SELECT p.lead_id, p.razorpay_link_id, p.razorpay_payment_id, p.status, p.amount, p.created_at
    FROM payments p
    ORDER BY p.created_at DESC
    LIMIT 5
  `);
  console.log('\nLast 5 payments:');
  payments.rows.forEach((r, i) => console.log(`  ${i+1}.`, r));

  // 3. All leads (last 10 by id)
  const leads = await pool.query(`
    SELECT id, name, phone, client_id FROM leads ORDER BY id DESC LIMIT 10
  `);
  console.log('\nLast 10 leads (by ID):');
  leads.rows.forEach(r => console.log(`  ID ${r.id}: ${r.name} | ${r.phone} | client_id: ${r.client_id}`));

  // 4. Check what lead_id=92 maps to in payments
  const linkCheck = await pool.query(`
    SELECT p.*, l.name as lead_name FROM payments p
    LEFT JOIN leads l ON l.id = p.lead_id
    WHERE p.lead_id = 92 OR p.razorpay_payment_id = 'pay_TEZvS2Q6yMGqhv'
    LIMIT 5
  `);
  console.log('\nPayments for lead_id=92 or pay_TEZvS2Q6yMGqhv:');
  linkCheck.rows.forEach(r => console.log('  ', r));

  await pool.end();
  console.log('\n=== Done ===');
}

run().catch(e => { console.error('DB Error:', e.message); pool.end(); });
