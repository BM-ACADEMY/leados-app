const fs = require('fs');

let c = fs.readFileSync('server.js', 'utf8');

if (!c.includes('./services/aiBrain')) {
    c = c.replace(
        "const pool = require('./db/connection');",
        "const pool = require('./db/connection');\nconst { evaluateLeadBrandAndSchedule, evaluateStuckLeads } = require('./services/aiBrain');"
    );
}

if (!c.includes('evaluateLeadBrandAndSchedule(rows[0].id)')) {
    c = c.replace(
        "res.status(201).json({ lead: rows[0] });",
        "evaluateLeadBrandAndSchedule(rows[0].id).catch(console.error);\n\n    res.status(201).json({ lead: rows[0] });"
    );
}

if (!c.includes('evaluateStuckLeads();')) {
    c = c.replace(
        "processCampaignQueue();",
        "cron.schedule('0 * * * *', async () => {\n  console.log('[Cron] Running AI Brain Follow-Up Manager for Stuck Leads...');\n  await evaluateStuckLeads();\n});\n\n// Process queues\nprocessCampaignQueue();"
    );
}

fs.writeFileSync('server.js', c);


let ic = fs.readFileSync('controllers/integrationsController.js', 'utf8');
if (!ic.includes('./services/aiBrain')) {
    ic = ic.replace(
        "const axios = require('axios');",
        "const axios = require('axios');\nconst { evaluateLeadBrandAndSchedule } = require('../services/aiBrain');"
    );
}

if (!ic.includes('evaluateLeadBrandAndSchedule(newLead.rows[0].id)')) {
    ic = ic.replace(
        "console.log(`Successfully saved Meta lead ${leadgenId}`);",
        "const newLead = await db.query('SELECT id FROM leads WHERE leadgen_id = $1', [leadgenId]);\n            if(newLead.rows.length) { evaluateLeadBrandAndSchedule(newLead.rows[0].id).catch(console.error); }\n            console.log(`Successfully saved Meta lead ${leadgenId}`);"
    );
    
    ic = ic.replace(
        "totalSynced++;\n        } catch(e) {",
        "totalSynced++;\n          const newLead = await db.query('SELECT id FROM leads WHERE leadgen_id = $1', [leadgenId]); if(newLead.rows.length) { evaluateLeadBrandAndSchedule(newLead.rows[0].id).catch(console.error); }\n        } catch(e) {"
    );

    ic = ic.replace(
        "totalSynced++;\n              } catch(e) {",
        "totalSynced++;\n                const newLead = await db.query('SELECT id FROM leads WHERE leadgen_id = $1', [leadgenId]); if(newLead.rows.length) { evaluateLeadBrandAndSchedule(newLead.rows[0].id).catch(console.error); }\n              } catch(e) {"
    );
}

fs.writeFileSync('controllers/integrationsController.js', ic);

console.log("Done");
