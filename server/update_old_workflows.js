const fs = require('fs');

// UPDATE WF0
const wf0Path = 'd:/projects/leados-portal/leados-workflows-final/wf0-welcome-dynamic.json';
const wf0 = JSON.parse(fs.readFileSync(wf0Path, 'utf8'));
const saveNode0 = {
  parameters: {
    operation: 'executeQuery',
    query: 'INSERT INTO messages (conversation_id, tenant_id, direction, content, is_ai, sent_at, msg_type, status) SELECT cv.id, cv.tenant_id, \'outbound\', $1, true, NOW(), \'template\', \'sent\' FROM conversations cv WHERE cv.lead_id = $2 LIMIT 1;',
    additionalFields: {
      queryParams: '={{ JSON.stringify([$(\'Prepare Template\').first().json.templateName, $(\'Extract Lead Info\').first().json.lead_id]) }}'
    },
    options: {}
  },
  id: 'save-welcome-msg',
  name: 'Save Welcome Message to DB',
  type: 'n8n-nodes-base.postgres',
  typeVersion: 2.4,
  position: [1340, 100],
  credentials: { postgres: { name: 'LeadOS DB' } }
};
wf0.nodes.push(saveNode0);
wf0.connections['Send Welcome Template'] = { main: [[{ node: 'Save Welcome Message to DB', type: 'main', index: 0 }]] };
wf0.connections['Save Welcome Message to DB'] = { main: [[{ node: 'Set Initial Flow Step', type: 'main', index: 0 }]] };
fs.writeFileSync(wf0Path, JSON.stringify(wf0, null, 2));


// UPDATE WF1
const wf1Path = 'd:/projects/leados-portal/leados-workflows-final/wf1-whatsapp-receiver.json';
const wf1 = JSON.parse(fs.readFileSync(wf1Path, 'utf8'));
const saveNode1 = {
  parameters: {
    operation: 'executeQuery',
    query: 'INSERT INTO messages (conversation_id, tenant_id, direction, content, is_ai, sent_at, msg_type, status) SELECT cv.id, cv.tenant_id, \'inbound\', $1, false, NOW(), \'text\', \'received\' FROM conversations cv WHERE cv.lead_id = $2 LIMIT 1;',
    additionalFields: {
      queryParams: '={{ JSON.stringify([$(\'Extract Data\').first().json.message, $(\'Extract Data\').first().json.lead_id]) }}'
    },
    options: {}
  },
  id: 'save-inbound-msg',
  name: 'Save Inbound Message to DB',
  type: 'n8n-nodes-base.postgres',
  typeVersion: 2.4,
  position: [680, 100],
  credentials: { postgres: { name: 'LeadOS DB' } }
};
wf1.nodes.push(saveNode1);

// Connect Extract Data to Save Inbound
wf1.connections['Extract Data'].main[0].push({ node: 'Save Inbound Message to DB', type: 'main', index: 0 });

fs.writeFileSync(wf1Path, JSON.stringify(wf1, null, 2));

console.log('Workflows updated successfully');
