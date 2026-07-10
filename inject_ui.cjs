const fs = require('fs');
const file = 'src/views/mafiya/StreetPosts.jsx';
const content = fs.readFileSync(file, 'utf8');

const insertStates = `  const [locations, setLocations] = useState([]);
  const [fetchingLocations, setFetchingLocations] = useState(false);
  const [selectedLocationStr, setSelectedLocationStr] = useState('');

  useEffect(() => {
    if (showModal && activeClient && !activeClient.google_location_id) {
      const fetchLocs = async () => {
        setFetchingLocations(true);
        try {
          const res = await fetch(\`/api/mafiya/reviews/google-locations?clientId=\${activeClient.id}\`);
          if (res.ok) {
            const data = await res.json();
            setLocations(data);
            if (data.length > 0) setSelectedLocationStr(data[0].accountId + '|' + data[0].locationId);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setFetchingLocations(false);
        }
      };
      fetchLocs();
    }
  }, [showModal, activeClient]);

  const handleSaveConnection = async () => {
    if (!selectedLocationStr) return;
    const [accId, locId] = selectedLocationStr.split('|');
    setSaving(true);
    try {
      const res = await fetch('/api/mafiya/reviews/google-locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: activeClient.id,
          google_account_id: accId,
          google_location_id: locId
        })
      });
      if (res.ok) {
        toast.success('Connected to GMB Location!');
        activeClient.google_account_id = accId;
        activeClient.google_location_id = locId;
        setLocations([...locations]); // force re-render
      }
    } catch(err) {
      toast.error('Failed to connect location');
    } finally {
      setSaving(false);
    }
  };
`;

const setupJsx = `
                {!activeClient?.google_location_id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40, textAlign: 'center' }}>
                    <div style={{ background: '#f973161a', padding: 16, borderRadius: '50%', marginBottom: 16 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </div>
                    <h3 style={{ color: '#e8eaed', fontSize: 20, margin: '0 0 12px 0' }}>Connect Google Business Location</h3>
                    <p style={{ color: '#9aa0a6', fontSize: 14, maxWidth: 400, marginBottom: 24 }}>
                      To publish posts to Google, please select the specific business location for {clientName} from your Google Account.
                    </p>
                    
                    {fetchingLocations ? (
                      <p style={{ color: '#8ab4f8' }}>Fetching your locations...</p>
                    ) : locations.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 350 }}>
                        <select 
                          value={selectedLocationStr}
                          onChange={e => setSelectedLocationStr(e.target.value)}
                          style={{ background: '#202124', border: '1px solid #5f6368', color: '#e8eaed', padding: '12px 16px', borderRadius: 6, fontSize: 14, outline: 'none' }}
                        >
                          {locations.map((loc, i) => (
                            <option key={i} value={loc.accountId + '|' + loc.locationId}>{loc.title}</option>
                          ))}
                        </select>
                        <button 
                          onClick={handleSaveConnection}
                          disabled={saving}
                          style={{ background: '#f97316', color: '#fff', border: 'none', padding: '12px', borderRadius: 6, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}
                        >
                          {saving ? 'Connecting...' : 'Save Connection'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(239,68,68,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', width: '100%', maxWidth: 400 }}>
                        <p style={{ color: '#ef4444', margin: 0, fontSize: 14 }}>
                          We couldn't find any locations in your Google Account. Please ensure you have connected an account that manages Google Business Profiles in the Local SEO Bridge.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
`;

const lines = content.split('\n');

const stateInsertLine = lines.findIndex(l => l.includes('const [showTerms, setShowTerms] = useState(false);'));
lines.splice(stateInsertLine + 1, 0, insertStates);

const modalBodyStart = lines.findIndex(l => l.includes('{/* Tabs */}'));
lines.splice(modalBodyStart, 0, setupJsx);

// Add the closing tag for the new ternary before Footer
const footerIndex = lines.findIndex((l, i) => i > modalBodyStart && l.includes('{/* Footer */}'));
lines.splice(footerIndex, 0, '                  </>\n                )');

fs.writeFileSync(file, lines.join('\n'), 'utf8');
