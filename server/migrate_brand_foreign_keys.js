const pool = require('./db/connection');

const DRY_RUN = false; // Safety flag disabled for real execution

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('--- STARTING DATABASE MIGRATION ---');

    // 1. Check and add missing clients into "clients" table
    console.log('\nStep 1: Ingesting missing clients if necessary...');
    const missingClients = ['ABM Groups', 'Namma Pondy Properties'];
    for (const name of missingClients) {
      const existRes = await client.query('SELECT id FROM clients WHERE name = $1 LIMIT 1', [name]);
      if (existRes.rows.length === 0) {
        console.log(`  Inserting missing client: ${name}`);
        await client.query(
          "INSERT INTO clients (name, type, plan, status) VALUES ($1, 'Corporate', 'Starter', 'active')",
          [name]
        );
      } else {
        console.log(`  Client "${name}" already exists.`);
      }
    }

    // 2. Fetch duplicate client names
    console.log('\nStep 2: Identifying duplicate client records...');
    const dupRes = await client.query(`
      SELECT name, array_agg(id ORDER BY id) as ids, MIN(id) as survivor_id
      FROM clients 
      GROUP BY name 
      HAVING COUNT(*) > 1
      ORDER BY name
    `);
    
    // 3. Remap references to survivor_id
    console.log('\nStep 3: Remapping references to primary (survivor) client IDs...');
    for (const row of dupRes.rows) {
      const { name, ids, survivor_id } = row;
      const duplicateIds = ids.filter(id => id !== survivor_id);
      console.log(`  Client "${name}": keeping ID ${survivor_id}, duplicate IDs: ${duplicateIds.join(', ')}`);

      // Special handling for brain_docs to avoid UNIQUE constraint violation on (client_id, doc_type)
      const checkDocsTable = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables WHERE table_name = 'brain_docs'
        )
      `);
      if (checkDocsTable.rows[0].exists) {
        const { rows: dupDocs } = await client.query(
          'SELECT id, doc_type FROM brain_docs WHERE client_id = ANY($1::int[])',
          [duplicateIds]
        );
        for (const doc of dupDocs) {
          const { rows: survDoc } = await client.query(
            'SELECT id FROM brain_docs WHERE client_id = $1 AND doc_type = $2',
            [survivor_id, doc.doc_type]
          );
          if (survDoc.length > 0) {
            console.log(`    Deleting duplicate brain_doc ${doc.id} (type: ${doc.doc_type}) since survivor already has it.`);
            await client.query('DELETE FROM brain_docs WHERE id = $1', [doc.id]);
          } else {
            console.log(`    Remapping brain_doc ${doc.id} (type: ${doc.doc_type}) to survivor ${survivor_id}.`);
            await client.query('UPDATE brain_docs SET client_id = $1 WHERE id = $2', [survivor_id, doc.id]);
          }
        }
      }

      // Remap other tables (only if they exist and contain the client_id column)
      const tablesToUpdate = [
        { name: 'leads', col: 'client_id' },
        { name: 'templates', col: 'client_id' },
        { name: 'campaigns', col: 'client_id' },
        { name: 'messages', col: 'client_id' }
      ];

      for (const table of tablesToUpdate) {
        const checkTable = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables WHERE table_name = $1
          )
        `, [table.name]);
        
        if (checkTable.rows[0].exists) {
          const checkCol = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = $1 AND column_name = $2
            )
          `, [table.name, table.col]);

          if (checkCol.rows[0].exists) {
            const updateRes = await client.query(
              `UPDATE ${table.name} SET ${table.col} = $1 WHERE ${table.col} = ANY($2::int[])`,
              [survivor_id, duplicateIds]
            );
            console.log(`    Updated ${updateRes.rowCount} rows in "${table.name}"`);
          } else {
            console.log(`    Skipping column update: "${table.name}.${table.col}" does not exist.`);
          }
        }
      }
    }

    // 4. Verify no orphaned references BEFORE deleting duplicates
    console.log('\nStep 4: Verifying there are no orphaned references...');
    const tablesToVerify = ['leads', 'templates', 'campaigns', 'messages', 'brain_docs'];
    let totalOrphans = 0;
    for (const tableName of tablesToVerify) {
      const checkTable = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables WHERE table_name = $1
        )
      `, [tableName]);

      if (checkTable.rows[0].exists) {
        const colName = 'client_id';
        const checkCol = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = $2
          )
        `, [tableName, colName]);

        if (checkCol.rows[0].exists) {
          const orphanRes = await client.query(`
            SELECT id, ${colName} 
            FROM ${tableName} 
            WHERE ${colName} IS NOT NULL AND ${colName} NOT IN (SELECT id FROM clients)
          `);
          if (orphanRes.rows.length > 0) {
            console.error(`  ❌ Orphans found in table "${tableName}":`, orphanRes.rows);
            totalOrphans += orphanRes.rows.length;
          } else {
            console.log(`  ✓ Table "${tableName}" has no orphaned references.`);
          }
        } else {
          console.log(`  ✓ Table "${tableName}" does not have "${colName}" column (no orphans possible).`);
        }
      }
    }

    if (totalOrphans > 0) {
      throw new Error(`Orphaned references detected! Aborting migration.`);
    }

    // 5. Delete duplicate client records
    console.log('\nStep 5: Deleting duplicate clients...');
    for (const row of dupRes.rows) {
      const { ids, survivor_id } = row;
      const duplicateIds = ids.filter(id => id !== survivor_id);
      if (duplicateIds.length > 0) {
        const delRes = await client.query('DELETE FROM clients WHERE id = ANY($1::int[])', [duplicateIds]);
        console.log(`  Deleted ${delRes.rowCount} duplicate client records.`);
      }
    }

    // 6. Add UNIQUE constraint to clients(name)
    console.log('\nStep 6: Enforcing UNIQUE constraint on clients(name)...');
    await client.query('ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_name_unique');
    await client.query('ALTER TABLE clients ADD CONSTRAINT clients_name_unique UNIQUE (name)');
    console.log('  ✓ Constraint clients_name_unique added.');

    // 7. Add foreign key constraints to child tables
    console.log('\nStep 7: Enforcing foreign key constraints with ON UPDATE CASCADE...');
    
    // content_queue
    await client.query('ALTER TABLE content_queue DROP CONSTRAINT IF EXISTS fk_content_queue_brand_name');
    await client.query(`
      ALTER TABLE content_queue 
      ADD CONSTRAINT fk_content_queue_brand_name 
      FOREIGN KEY (brand_name) 
      REFERENCES clients(name) 
      ON UPDATE CASCADE
    `);
    console.log('  ✓ Constraint fk_content_queue_brand_name added.');

    // brand_social_accounts
    await client.query('ALTER TABLE brand_social_accounts DROP CONSTRAINT IF EXISTS fk_brand_social_accounts_brand_name');
    await client.query(`
      ALTER TABLE brand_social_accounts 
      ADD CONSTRAINT fk_brand_social_accounts_brand_name 
      FOREIGN KEY (brand_name) 
      REFERENCES clients(name) 
      ON UPDATE CASCADE
    `);
    console.log('  ✓ Constraint fk_brand_social_accounts_brand_name added.');

    if (DRY_RUN) {
      console.log('\n[DRY RUN] Rolling back transaction. No changes were saved.');
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
      console.log('\nTransaction committed successfully! Database is normalized. ✅');
    }

    // 8. Final test: verify foreign key constraint rejection
    console.log('\nStep 8: Final test - attempting to insert invalid brand_name...');
    try {
      await pool.query(`
        INSERT INTO content_queue (brand_name, file_name, status)
        VALUES ('INVALID_BRAND_XYZ', 'test.mp4', 'PENDING')
      `);
      console.error('  ❌ Test FAILED: Postgres allowed insertion of invalid brand_name!');
    } catch (dbErr) {
      console.log('  ✓ Test PASSED: Postgres successfully rejected the invalid brand name.');
      console.log(`  Expected error message: "${dbErr.message}"`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nMigration failed: ❌', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
