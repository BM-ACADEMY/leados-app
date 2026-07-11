const fs = require('fs');

const data = JSON.parse(fs.readFileSync('../chat/chat/chatbot.flowsteps.json', 'utf8'));

// Build a map of steps
const stepMap = {};
data.forEach(s => {
  stepMap[s.stepId] = s;
});

function buildTextFlow(startStepId) {
  let text = "";
  const queue = [startStepId];
  const visited = new Set();
  
  while(queue.length > 0) {
    const currId = queue.shift();
    if(visited.has(currId)) continue;
    visited.add(currId);
    
    const step = stepMap[currId];
    if(!step) continue;
    
    text += `[Step: ${currId}]\n`;
    text += `Agent asks: ${step.question.replace(/\n/g, ' ')}\n`;
    
    if(step.options && step.options.length > 0) {
      step.options.forEach(opt => {
        text += `  - If user replies "${opt.label}" -> go to [Step: ${opt.nextStep}]\n`;
        queue.push(opt.nextStep);
      });
    } else if (step.nextStep) {
      text += `  - Automatically go to [Step: ${step.nextStep}]\n`;
      queue.push(step.nextStep);
    }
    text += "\n";
  }
  return text;
}

const bmAcademyFlow = buildTextFlow("academy_entry");
const coreTalentsFlow = buildTextFlow("talents_entry");
const pondyFlow = buildTextFlow("namma_pondy_entry");
const techxFlow = buildTextFlow("techx_entry");

const output = `=== BM Academy ===
${bmAcademyFlow}
=== Core Talents ===
${coreTalentsFlow}
=== Namma Pondy ===
${pondyFlow}
=== BM TechX ===
${techxFlow}
`;

fs.writeFileSync('flow_output_node.txt', output, 'utf8');
