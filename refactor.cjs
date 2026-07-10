const fs = require('fs');
const file = 'src/views/mafiya/StreetPosts.jsx';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

// 1. Find imports end
const lastImportIndex = lines.map(l => l.startsWith('import')).lastIndexOf(true);

// 2. Find states
const modalStatesStart = lines.findIndex(l => l.includes('// Upload Poster states'));
const modalStatesEnd = lines.findIndex(l => l.includes('const setActiveClient')) - 1;

// 3. Find handlers
const imgUploadStart = lines.findIndex(l => l.includes('const handleImageUpload'));
const savePostEnd = lines.findIndex(l => l.includes('const handleDeletePost')) - 1;

// 4. Find JSX
const modalJsxStart = lines.findIndex(l => l.includes('{/* ═══ GMB Upload Post Modal ═══ */}'));

// Just hard search for the exact line '        )}' after the modal Start
const modalJsxEnd = lines.findIndex((l, i) => i > modalJsxStart && l === '        )}');

if (modalStatesStart === -1 || imgUploadStart === -1 || modalJsxStart === -1 || modalJsxEnd === -1) {
    console.log("Failed to find bounds", {modalStatesStart, imgUploadStart, modalJsxStart, modalJsxEnd});
    process.exit(1);
}

const modalStates = lines.slice(modalStatesStart, modalStatesEnd).join('\n');
const modalHandlers = lines.slice(imgUploadStart, savePostEnd).join('\n');
const modalJsx = lines.slice(modalJsxStart + 1, modalJsxEnd + 1).join('\n');

const gmbPostModalComponent = `
const GmbPostModal = ({ activeClient, fetchGmbPosts, showModal, setShowModal }) => {
  const [saving, setSaving] = useState(false);
${modalStates}
${modalHandlers}

  const clientName = activeClient?.business_name || 'GMB Profile';
  const contactPhone = activeClient?.phone_number || '';

  return (
    <>
      ${modalJsx}
    </>
  );
};
`;

// Now remove them from StreetPosts
let newLines = [...lines];

// Replace Modal JSX with component call
newLines.splice(modalJsxStart, modalJsxEnd - modalJsxStart + 1, 
    '        {/* ═══ GMB Upload Post Modal ═══ */}',
    '        <GmbPostModal activeClient={activeClient} fetchGmbPosts={fetchGmbPosts} showModal={showModal} setShowModal={setShowModal} />'
);

// Remove handlers
newLines.splice(imgUploadStart, savePostEnd - imgUploadStart);

// Remove states
newLines.splice(modalStatesStart, modalStatesEnd - modalStatesStart);
// also remove saving state
const savingStateIdx = newLines.findIndex(l => l.includes('const [saving, setSaving]'));
if (savingStateIdx !== -1) newLines.splice(savingStateIdx, 1);

// Insert GmbPostModal after imports
newLines.splice(lastImportIndex + 1, 0, gmbPostModalComponent);

fs.writeFileSync(file, newLines.join('\n'), 'utf8');
console.log('Successfully extracted GmbPostModal component!');
