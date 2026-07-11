import { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';
import { C } from '../constants/theme.js';
import { api } from '../services/api.js';

export const AIBrainView = () => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [tab, setTab] = useState('prompt');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState({});

  const [promptText, setPromptText] = useState('');
  const [welcomeTemplate, setWelcomeTemplate] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [dupCheckResult, setDupCheckResult] = useState(null);
  const [dupChecking, setDupChecking] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await api.getClients();
        setClients(res.clients || []);
        if (res.clients && res.clients.length > 0) {
          setSelectedClientId(res.clients[0].id);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    };
    loadClients();
  }, []);

  const selectedBrand = clients.find(c => c.id === selectedClientId);
  const selectedBrandName = selectedBrand?.name || 'Your Brand';

  useEffect(() => {
    if (!selectedClientId) return;
    const loadBrainDocs = async () => {
      setLoading(true);
      try {
        const res = await api.getBrainDocs(selectedClientId);
        const docMap = {};
        res.docs?.forEach(d => {
          docMap[d.doc_type] = d.content;
        });
        setDocs(docMap);
      } catch (err) {
        console.error('Error loading brain docs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadBrainDocs();
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) return;

    const defaultTemplate = `You are a friendly WhatsApp sales assistant for ${selectedBrandName}.

CORE RULES:
- Keep replies SHORT (max 4-5 lines)
- Be warm and conversational, like a real person — not robotic
- Always end with exactly ONE question to keep conversation going
- Respond in the same language the lead uses
- Never say you are an AI
- Never repeat what the lead just said

WORKFLOW STRUCTURE:
No workflow structure added yet.

PRODUCT KNOWLEDGE:
No product info added yet.

PRICING:
No pricing added yet.

HANDLING OBJECTIONS:
Handle objections empathetically and redirect to value.

SOCIAL PROOF:
No proof points added yet.

AI TRAINING INSTRUCTIONS (follow this conversation strategy):
Qualify the lead by asking about their goals, background, and availability. Then guide them towards a demo call or enrollment.

FLAGS (add these to your response context when applicable):
- PAYMENT_READY: when lead explicitly agrees to pay or enroll
- CALL_REQUESTED: when lead wants to speak with someone
- LEAD_COLD: when lead shows no interest after multiple messages`;

    const promptVal = docs.prompt || defaultTemplate;
    const welcomeTemplateVal = docs.welcome_template || '';

    setPromptText(promptVal);
    setWelcomeTemplate(welcomeTemplateVal);
  }, [docs, selectedClientId, selectedBrandName]);

  const handleSave = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await Promise.all([
        api.saveBrainDoc(selectedClientId, 'prompt', promptText),
        api.saveBrainDoc(selectedClientId, 'welcome_template', welcomeTemplate),
      ]);
      alert('AI Brain saved and activated successfully for ' + selectedBrandName + '!');
    } catch (err) {
      alert('Failed to save AI Brain config: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMigrateDB = async () => {
    setMigrating(true);
    try {
      const res = await api.post('/leads/migrate-flow-step', {});
      alert(res.message || 'DB migration successful!');
    } catch (err) {
      alert('Migration failed: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  const handleCheckDuplicates = async () => {
    setDupChecking(true);
    setDupCheckResult(null);
    try {
      const res = await api.getClients();
      const allClients = res.clients || [];

      // Group clients by normalized name (lowercase, strip spaces/hyphens/underscores)
      const groups = {};
      allClients.forEach(c => {
        const key = c.name.toLowerCase().replace(/[\s\-_]+/g, '');
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
      });

      // Find groups with more than 1 client (duplicates)
      const duplicateGroups = Object.values(groups).filter(g => g.length > 1);

      if (duplicateGroups.length === 0) {
        setDupCheckResult({ message: 'No duplicate brands found! All brands are unique.', type: 'ok' });
        return;
      }

      // For each duplicate group, check which one has brain docs or leads
      const results = [];
      for (const group of duplicateGroups) {
        const checked = await Promise.all(group.map(async (c) => {
          let hasBrainDocs = false;
          let hasLeads = false;
          try {
            const brainRes = await api.getBrainDocs(c.id);
            hasBrainDocs = (brainRes.docs || []).some(d => d.content && d.content.trim().length > 0);
          } catch (e) { }
          try {
            const leadsRes = await api.getLeads({ brand: c.name, limit: 1 });
            hasLeads = (leadsRes.leads || []).length > 0;
          } catch (e) { }
          return { ...c, hasBrainDocs, hasLeads, isActive: hasBrainDocs || hasLeads };
        }));
        results.push(checked);
      }

      setDupCheckResult({ groups: results, type: 'found' });
    } catch (err) {
      setDupCheckResult({ message: 'Check failed: ' + err.message, type: 'error' });
    } finally {
      setDupChecking(false);
    }
  };

  const handleDeleteDuplicate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" (ID: ${id})?\n\nThis is the INACTIVE duplicate with no leads or brain data. This action cannot be undone.`)) return;
    try {
      await api.deleteClient(id);
      const res = await api.getClients();
      setClients(res.clients || []);
      setDupCheckResult({ message: `"${name}" was successfully deleted. The duplicate has been removed!`, type: 'ok' });
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="p-mobile" style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>AI Brain Configuration</h1>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Configure what each brand AI agent knows and how it closes</p>
        </div>
        <select value={selectedClientId || ''} onChange={(e) => setSelectedClientId(parseInt(e.target.value))} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '8px 12px', fontSize: 12, outline: 'none' }}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Loading AI Brain Configuration...</div>
      ) : (
        <>
          <div className="flex-col-mobile" style={{ background: C.accent + '10', border: '1px solid ' + C.accentDim, borderRadius: 11, padding: '11px 15px', marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <Brain size={15} color={C.accent} />
            <p style={{ fontSize: 12, color: C.accent }}>AI Agent for <strong>{selectedBrandName}</strong> is <strong>Active</strong> · Status: Connected to Postgres DB</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, background: C.card, border: '1px solid ' + C.border, borderRadius: 9, overflow: 'hidden', marginBottom: 18 }}>
            {['prompt', 'settings', 'guide'].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 15px', fontSize: 11, fontWeight: 600, border: 'none', background: tab === t ? C.accent : 'transparent', color: tab === t ? '#fff' : C.muted, textTransform: 'capitalize' }}>
                {t === 'prompt' ? 'System Prompt' : t === 'settings' ? '⚙ Settings' : '📖 How to Use'}
              </button>
            ))}
          </div>

          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 22 }}>

            {tab === 'prompt' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>System Prompt — <span style={{ color: C.accent }}>{selectedBrandName}</span></h3>
                <div style={{ background: C.accent + '08', border: '1px solid ' + C.accentDim, borderRadius: 7, padding: 11, marginBottom: 13 }}>
                  <p style={{ fontSize: 11, color: C.accent }}>This is the exact instruction manual sent to the Gemini AI for <strong>{selectedBrandName}</strong>. Edit it directly — each brand has its own saved version.</p>
                </div>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  style={{ width: '100%', height: 420, background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: '#10b981', padding: 16, fontSize: 13, outline: 'none', fontFamily: 'monospace', lineHeight: 1.8, resize: 'vertical' }}
                />
              </div>
            )}

            {tab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Brand Automation Settings</h3>

                {/* Welcome Template */}
                <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 9, padding: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>📱 WhatsApp Welcome Template Name</label>
                  <p style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>The exact Meta-approved template name to send when a new lead is added for <strong style={{ color: C.accent }}>{selectedBrandName}</strong>. Must be approved in your Meta Business Manager.</p>
                  <input
                    type="text"
                    value={welcomeTemplate}
                    onChange={(e) => setWelcomeTemplate(e.target.value)}
                    placeholder="e.g. bm_academy_welcome  or  hello_world"
                    style={{ width: '100%', background: C.bg, border: '1px solid ' + C.border, borderRadius: 7, padding: '10px 13px', color: C.text, fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
                  />
                  <p style={{ fontSize: 10, color: C.muted, marginTop: 7 }}>💡 Each brand can have its own unique template. Add a new brand anytime — just set its template name here and save.</p>
                </div>

                {/* Duplicate Brand Checker */}
                <div style={{ background: '#1a2a1a', border: '1px solid #16a34a33', borderRadius: 9, padding: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>🔍 Check & Remove Duplicate Brands</label>
                  <p style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                    Scans all brands, detects duplicates by similar name, checks which one has active leads or brain data, and marks the safe-to-delete one. The <strong style={{ color: '#16a34a' }}>active brand</strong> is always kept. Only the <strong style={{ color: '#dc2626' }}>empty duplicate</strong> gets a delete button.
                  </p>
                  <button
                    type="button"
                    onClick={handleCheckDuplicates}
                    disabled={dupChecking}
                    style={{ background: '#16a34a', border: 'none', borderRadius: 7, color: '#fff', padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: dupChecking ? 'not-allowed' : 'pointer', opacity: dupChecking ? 0.6 : 1 }}
                  >
                    {dupChecking ? '⏳ Checking...' : '🔍 Run Duplicate Check'}
                  </button>

                  {dupCheckResult && dupCheckResult.type !== 'found' && (
                    <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 7, background: dupCheckResult.type === 'ok' ? '#16a34a22' : '#dc262622', border: '1px solid ' + (dupCheckResult.type === 'ok' ? '#16a34a55' : '#dc262655') }}>
                      <p style={{ fontSize: 12, color: dupCheckResult.type === 'ok' ? '#16a34a' : '#dc2626', margin: 0 }}>{dupCheckResult.message}</p>
                    </div>
                  )}

                  {dupCheckResult && dupCheckResult.type === 'found' && dupCheckResult.groups.map((group, gi) => (
                    <div key={gi} style={{ marginTop: 14, background: C.surface, border: '1px solid ' + C.border, borderRadius: 9, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 14px', background: '#2a1a00', borderBottom: '1px solid ' + C.border }}>
                        <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>⚠ Duplicate Group Detected</p>
                      </div>
                      {group.map(c => (
                        <div key={c.id} style={{ padding: '12px 14px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: c.isActive ? '#16a34a' : '#dc2626' }}>
                              {c.isActive ? '✅' : '❌'} {c.name} <span style={{ fontSize: 10, color: C.muted, fontWeight: 400 }}>(ID: {c.id})</span>
                            </p>
                            <p style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                              {c.hasBrainDocs ? '🧠 Has brain docs' : '🧠 No brain docs'} &nbsp;·&nbsp; {c.hasLeads ? '👤 Has leads' : '👤 No leads'}
                            </p>
                          </div>
                          {!c.isActive ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteDuplicate(c.id, c.name)}
                              style={{ background: '#dc2626', border: 'none', borderRadius: 6, color: '#fff', padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              🗑 Delete (Safe)
                            </button>
                          ) : (
                            <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700, whiteSpace: 'nowrap', background: '#16a34a22', padding: '4px 10px', borderRadius: 5 }}>KEEP — Active</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* DB Migration */}
                <div style={{ background: '#1a1a2e', border: '1px solid #3b82f633', borderRadius: 9, padding: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3b82f6', marginBottom: 6 }}>🛢 One-Time Database Migration</label>
                  <p style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Run this once to add the <code style={{ color: '#3b82f6' }}>flow_step</code> column to your leads table. Required for the conversation flow tracking to work. Safe to run multiple times.</p>
                  <button
                    type="button"
                    onClick={handleMigrateDB}
                    disabled={migrating}
                    style={{ background: '#3b82f6', border: 'none', borderRadius: 7, color: '#fff', padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: migrating ? 'not-allowed' : 'pointer', opacity: migrating ? 0.6 : 1 }}
                  >
                    {migrating ? 'Running Migration...' : '▶ Run DB Migration'}
                  </button>
                </div>

                {/* How It Works */}
                <div style={{ background: C.accent + '08', border: '1px solid ' + C.accentDim, borderRadius: 9, padding: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10 }}>⚡ How the Automation Works</label>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.9 }}>
                    <p>1. <strong style={{ color: C.text }}>New Lead Added</strong> → Webhook fires to n8n → Sends your brand's welcome template to the lead via WhatsApp</p>
                    <p>2. <strong style={{ color: C.text }}>Lead Replies</strong> → Meta sends to your server → Server forwards to n8n AI Agent</p>
                    <p>3. <strong style={{ color: C.text }}>n8n reads Conv Flow</strong> → Checks lead's <code>flow_step</code> → Asks the next qualifying question using Gemini AI</p>
                    <p>4. <strong style={{ color: C.text }}>After all questions</strong> → AI switches to free mode using your System Prompt knowledge</p>
                    <p>5. <strong style={{ color: C.text }}>Lead Score updates</strong> → InboxView shows the conversation in real-time</p>
                  </div>
                </div>
              </div>
            )}

            {tab === 'guide' && (
              <div style={{ lineHeight: 1.7, padding: '0 10px' }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 18 }}>📖 AI Brain Configuration Guide</h3>

                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, color: C.accent, marginBottom: 6 }}>1. Select Your Brand</h4>
                  <p style={{ fontSize: 12, color: C.muted }}>Use the top-right dropdown to switch between brands. Each brand has its own separate System Prompt stored independently in the database. Switching brands loads that brand's specific configuration.</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, color: C.accent, marginBottom: 6 }}>2. Edit the System Prompt</h4>
                  <p style={{ fontSize: 12, color: C.muted }}>The "System Prompt" tab contains the complete instruction set for the AI. Fill in each section directly in the text box — WORKFLOW STRUCTURE, PRODUCT KNOWLEDGE, PRICING, HANDLING OBJECTIONS, SOCIAL PROOF, and AI TRAINING INSTRUCTIONS.</p>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 13, color: C.accent, marginBottom: 6 }}>3. Settings & Maintenance</h4>
                  <p style={{ fontSize: 12, color: C.muted }}>Use the "Settings" tab to configure the WhatsApp welcome template for each brand. You can also run the duplicate brand checker here to keep your brand list clean.</p>
                </div>

                <div style={{ background: C.accent + '11', border: '1px solid ' + C.accent + '44', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ fontSize: 13, color: C.text, marginBottom: 6 }}>Don't forget to Save!</h4>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>When you are done editing, click the orange <strong>Save and Activate</strong> button. Changes apply immediately to all new AI responses for the selected brand.</p>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 18, paddingTop: 18, borderTop: '1px solid ' + C.border }}>
            <button type="button" onClick={() => setDocs({ ...docs })} style={{ background: 'transparent', border: '1px solid ' + C.border, borderRadius: 7, color: C.muted, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>Reset</button>
            <button type="button" onClick={handleSave} disabled={saving} style={{ background: C.accent, border: 'none', borderRadius: 7, color: '#fff', padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Activating...' : 'Save and Activate'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
