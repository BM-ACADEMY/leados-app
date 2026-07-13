const fs = require('fs');

const path = '../leados-workflows-final/wf1-whatsapp-receiver.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// The new node to add
const saveMessageNode = {
  "parameters": {
    "operation": "executeQuery",
    "query": "INSERT INTO messages (conversation_id, tenant_id, direction, content, is_ai, sent_at, msg_type, status)\nSELECT cv.id, cv.tenant_id, 'outbound', $1, true, NOW(), 'text', 'sent'\nFROM conversations cv\nWHERE cv.lead_id = $2\nLIMIT 1;",
    "additionalFields": {
      "queryParams": "={{ JSON.stringify([$('Process & Score').first().json.aiText, $('Process & Score').first().json.lead_id]) }}"
    }
  },
  "id": "save-ai-message",
  "name": "Save AI Message to DB",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2.4,
  "position": [2000, 200],
  "credentials": {
    "postgres": {
      "name": "LeadOS DB"
    }
  }
};

data.nodes.push(saveMessageNode);

// Update connections:
// Send WhatsApp Reply -> [ Update Lead Score + Flow, Save AI Message to DB ]
const sendWaMain = data.connections['Send WhatsApp Reply'].main[0];
sendWaMain.push({
  "node": "Save AI Message to DB",
  "type": "main",
  "index": 0
});

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log("Successfully added Save AI Message node!");
