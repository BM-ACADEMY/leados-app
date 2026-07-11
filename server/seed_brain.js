const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

const flowText = fs.readFileSync('flow_output_node.txt', 'utf8');
const brands = [
  { name: 'BM academy', header: '=== BM Academy ===', endHeader: '=== Core Talents ===' },
  { name: 'Core talents', header: '=== Core Talents ===', endHeader: '=== Namma Pondy ===' },
  { name: 'Namma pondy properties', header: '=== Namma Pondy ===', endHeader: '=== BM TechX ===' },
  { name: 'Bmtechx', header: '=== BM TechX ===', endHeader: null }
];

function extractWorkflow(header, endHeader) {
  const start = flowText.indexOf(header);
  if (start === -1) return '';
  const end = endHeader ? flowText.indexOf(endHeader) : flowText.length;
  return flowText.substring(start + header.length, end).trim();
}

async function run() {
  try {
    const { rows: clients } = await pool.query('SELECT id, name FROM clients');
    
    for (const b of brands) {
      let client = clients.find(c => c.name.toLowerCase().replace(/[\s\-_]+/g, '') === b.name.toLowerCase().replace(/[\s\-_]+/g, ''));
      if (!client) {
        if (b.name === 'Core talents') {
           const plan = clients.length > 0 ? (await pool.query('SELECT plan FROM clients WHERE id=$1', [clients[0].id])).rows[0].plan : 'basic';
           const { rows } = await pool.query("INSERT INTO clients (name, type, plan, status, created_at) VALUES ('Core Talents', 'business', $1, 'active', NOW()) RETURNING id, name", [plan]);
           client = rows[0];
           console.log("🌟 Created missing client: Core Talents");
        } else {
           console.log(`❌ Client not found for: ${b.name}`);
           continue;
        }
      }

      const workflowText = extractWorkflow(b.header, b.endHeader);
      
      const prompt = `You are a friendly WhatsApp sales assistant for ${client.name}.

CORE RULES:
- Keep replies SHORT (max 4-5 lines)
- Be warm and conversational, like a real person — not robotic
- Always end with exactly ONE question to keep conversation going
- Respond in the same language the lead uses
- Never say you are an AI
- Never repeat what the lead just said

WORKFLOW STRUCTURE:
This is the conversation flow you must follow:
${workflowText}

PRODUCT KNOWLEDGE:
Offer details as per the workflow structure.

PRICING:
Prices are listed in the workflow structure above.

HANDLING OBJECTIONS:
Handle objections empathetically and redirect to value. Follow the workflow paths for doubts.

SOCIAL PROOF:
We have successful students and satisfied clients.

AI TRAINING INSTRUCTIONS (follow this conversation strategy):
Qualify the lead by following the exact workflow paths. Only move to the next step when the user has provided the required information. Then guide them towards a demo call, expert chat, or finish state.

FLAGS (add these to your response context when applicable):
- PAYMENT_READY: when lead explicitly agrees to pay or enroll
- CALL_REQUESTED: when lead wants to speak with someone
- LEAD_COLD: when lead shows no interest after multiple messages`;

      await pool.query(`
        INSERT INTO brain_docs (client_id, doc_type, content, updated_at)
        VALUES ($1, 'prompt', $2, NOW())
        ON CONFLICT (client_id, doc_type)
        DO UPDATE SET content = $2, updated_at = NOW()
      `, [client.id, prompt]);
      
      console.log(`✅ Seeded AI Brain prompt for: ${client.name}`);
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
