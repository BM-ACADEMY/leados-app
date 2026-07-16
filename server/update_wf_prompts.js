const fs = require('fs');

const paths = [
  'd:/projects/leados-portal/leados-workflows-final/wf1-whatsapp-receiver.json',
  'd:/projects/leados-portal/leados-workflows-final/updated-workflow/WF01_-_Sales_Engine.json'
];

paths.forEach(path => {
  try {
    const wf = JSON.parse(fs.readFileSync(path, 'utf8'));
    let modified = false;
    wf.nodes.forEach(n => {
      if (n.parameters && typeof n.parameters.query === 'string') {
        if (n.parameters.query.includes("bd_prompt.client_id = c.id AND bd_prompt.doc_type = 'prompt'")) {
          n.parameters.query = n.parameters.query.replace(
            "bd_prompt.client_id = c.id AND bd_prompt.doc_type = 'prompt'",
            "bd_prompt.client_id = (SELECT id FROM clients WHERE name = 'ABM Groups' LIMIT 1) AND bd_prompt.doc_type = 'prompt'"
          );
          modified = true;
        } else if (n.parameters.query.includes("bd_prompt.client_id = l.client_id AND bd_prompt.doc_type = 'prompt'")) {
          n.parameters.query = n.parameters.query.replace(
            "bd_prompt.client_id = l.client_id AND bd_prompt.doc_type = 'prompt'",
            "bd_prompt.client_id = (SELECT id FROM clients WHERE name = 'ABM Groups' LIMIT 1) AND bd_prompt.doc_type = 'prompt'"
          );
          modified = true;
        }
      }
    });

    if (modified) {
      fs.writeFileSync(path, JSON.stringify(wf, null, 2));
      console.log('Updated ' + path);
    }
  } catch (e) {
    console.error('Error on ' + path, e.message);
  }
});
