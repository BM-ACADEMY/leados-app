const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/views/thedal');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
let updatedCount = 0;

for (const f of files) {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('SopModal')) {
    console.log(`Skipping ${f}, already has SopModal`);
    continue;
  }
  
  // 1. Add import
  const importStatement = "import SopModal from '../../components/common/SopModal.jsx';\n";
  const lastImportIndex = content.lastIndexOf('import ');
  if (lastImportIndex !== -1) {
    const nextLineIndex = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, nextLineIndex + 1) + importStatement + content.slice(nextLineIndex + 1);
  }

  // 2. Inject SopModal next to header title.
  // We'll look for `<h1 ` or `<h2 `, find its closing tag, and find the parent wrapping div that contains the paragraph.
  // An easier robust way:
  // Most pages have a header like:
  // <div style={{ display: 'flex', alignItems: 'center', gap: 16... }}>
  //   <div style={{...icon...}} />
  //   <div>
  //     <h1 ...>Title</h1>
  //     <p ...>Desc</p>
  //   </div>
  // </div>
  //
  // Let's replace the first `</h1>` or `</h2>` we find with:
  // `</h1></div><div style={{ marginLeft: 'auto' }}><SopModal /></div>`
  // Wait, no, that closes the `<div>` holding the text early!
  
  // Better: replace the first occurrence of:
  //   <p style={{ color: C.muted... }}>...</p>
  //   </div>
  //   </div>
  // But each page might have slightly different spacing.
  
  // Let's just find the first `<h1` or `<h2`, and we will append a div *after* the `<div>` that contains it.
  // Actually, we can use a simpler trick: find the first title string based on known files.
  // Or, we can just replace:
  // <h1 (.*?)>(.*?)<\/h1>
  // with
  // <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
  //   <h1 $1>$2</h1>
  //   <SopModal />
  // </div>
  
  content = content.replace(/(<h[12][^>]*>.*?<\/h[12]>)/, "<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>$1<SopModal /></div>");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${f}`);
  updatedCount++;
}

console.log(`Successfully updated ${updatedCount} files.`);
