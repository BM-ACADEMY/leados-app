const fs = require('fs');
const files = [
  'd:/projects/leados-portal/server/services/openai.js',
  'd:/projects/leados-portal/server/routes/upload.js',
  'd:/projects/leados-portal/server/routes/knowledge.js',
  'd:/projects/leados-portal/server/routes/pipeline.js',
  'd:/projects/leados-portal/server/routes/analyze.js',
  'd:/projects/leados-portal/server/setup-alliance-db.js'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
});
