const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'src/views/thedal');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const f of files) {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('import SopModal')) {
    // Remove all SopModal imports first
    content = content.replace(/import SopModal from '..\/..\/components\/common\/SopModal\.jsx';\n?/g, '');
    
    // Add it after the very first line (import React...)
    const firstLineEnd = content.indexOf('\n');
    content = content.slice(0, firstLineEnd + 1) + "import SopModal from '../../components/common/SopModal.jsx';\n" + content.slice(firstLineEnd + 1);
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
}
console.log('Fixed imports');
