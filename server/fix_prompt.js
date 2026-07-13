const fs = require('fs');

const path = '../leados-workflows-final/wf1-whatsapp-receiver.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Find the Build AI Prompt node
const buildNode = data.nodes.find(n => n.name === 'Build AI Prompt');
if (buildNode) {
  // Replace the generationConfig line in the JS Code
  buildNode.parameters.jsCode = buildNode.parameters.jsCode.replace(
    /generationConfig: \{ maxOutputTokens: 300, temperature: 0\.75, topP: 0\.9 \}/,
    '// generationConfig removed to prevent cut-off responses'
  );
  
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  console.log("Successfully updated Build AI Prompt node to remove generationConfig!");
} else {
  console.log("Could not find Build AI Prompt node");
}
