const pool = require('./db/connection');

async function main() {
  try {
    // 1. Update style guide rule
    const res1 = await pool.query(
      `UPDATE brain_docs bd
       SET content = REPLACE(
         content,
         '- If outside KB scope, say so honestly and route to human — never guess, especially on pricing, refunds, placement guarantees, or property details.',
         '- If outside KB scope, say so honestly and route to human — never guess, especially on refunds, placement guarantees, or property details. When asked for course/service prices, fees, cost, or EMI, look up the "Course Fee", "Setup Fee", "Monthly Fee", or "One-Time Fee" in the knowledge base and tell the customer the exact amount directly.'
       )
       FROM clients c
       WHERE c.id = bd.client_id
         AND LOWER(c.name) = 'abm groups'
         AND bd.doc_type = 'prompt'
       RETURNING bd.id`
    );
    console.log(`Updated style guide rules in ${res1.rowCount} rows`);

    // 2. Update HOT signals rule
    const res2 = await pool.query(
      `UPDATE brain_docs bd
       SET content = REPLACE(
         content,
         '- Names a specific program/service + asks pricing/EMI in same message',
         '- Names a specific program/service + asks pricing/EMI in same message (answer the pricing first using the KB values, then flag/route to human for counseling/conversion)'
       )
       FROM clients c
       WHERE c.id = bd.client_id
         AND LOWER(c.name) = 'abm groups'
         AND bd.doc_type = 'prompt'
       RETURNING bd.id`
    );
    console.log(`Updated HOT signal rules in ${res2.rowCount} rows`);

  } catch (err) {
    console.error("Failed to update prompts:", err);
  } finally {
    await pool.end();
  }
}

main();
