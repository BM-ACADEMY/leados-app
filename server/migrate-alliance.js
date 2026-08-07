const db = require('./db/connection');
const ensureAllianceSchema = require('./db/alliance-schema');

async function migrate() {
  await ensureAllianceSchema();
  const result = await db.query(`
    SELECT COUNT(1)::int AS tables
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'alliance_%'
  `);
  console.log(`AllianceOS migration complete: ${result.rows[0].tables} tables available.`);
  await db.end();
}

migrate().catch(async (error) => {
  console.error('AllianceOS migration failed:', error.stack || error.message || error);
  await db.end().catch(() => {});
  process.exit(1);
});
