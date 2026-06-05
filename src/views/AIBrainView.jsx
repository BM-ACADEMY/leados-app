import { useState, useEffect } from 'react';
import { Brain, Plus } from 'lucide-react';
import { C } from '../constants/theme.js';
import { api } from '../services/api.js';

export const AIBrainView = () => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [tab, setTab] = useState('product');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState({});

  const [productText, setProductText] = useState('');
  const [pricingList, setPricingList] = useState([]);
  const [objectionsList, setObjectionsList] = useState([]);
  const [proofList, setProofList] = useState([]);
  const [flowList, setFlowList] = useState([]);
  const [promptText, setPromptText] = useState('');

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
  const selectedBrandName = selectedBrand?.name || 'BM Academy';

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
    const productVal = docs.product || '';

    let pricingVal = [];
    try { if (docs.pricing) pricingVal = JSON.parse(docs.pricing); } catch (e) { }

    let objectionsVal = [];
    try { if (docs.objections) objectionsVal = JSON.parse(docs.objections); } catch (e) { }

    let proofVal = [];
    try { if (docs.proof) proofVal = JSON.parse(docs.proof); } catch (e) { }

    let flowVal = [];
    try { if (docs.flow) flowVal = JSON.parse(docs.flow); } catch (e) { }

    const promptVal = docs.prompt || `You are a friendly WhatsApp assistant for ${selectedBrandName}.
Please define your custom prompt here.`;

    setProductText(productVal);
    setPricingList(pricingVal);
    setObjectionsList(objectionsVal);
    setProofList(proofVal);
    setFlowList(flowVal);
    setPromptText(promptVal);
  }, [docs, selectedClientId, selectedBrandName]);

  // Dynamically auto-compile the prompt whenever any feed data changes
  useEffect(() => {
    if (!selectedClientId) return;
    
    const pricingStr = pricingList.map(p => `${p[0]}: ${p[2]} (orig ${p[1]}) - EMI: ${p[3]}`).join('\n');
    const objectionsStr = objectionsList.map(o => `Objection: ${o[0]} -> AI Reply: ${o[1]}`).join('\n');
    const proofStr = proofList.map(p => `${p[0]}: ${p[1]}`).join('\n');
    const flowStr = flowList.map((q, i) => `Step ${i + 1}: ${q[1]} [Options: ${q[2].join(', ')}]`).join('\n');
    
    const generated = `You are a friendly WhatsApp sales assistant for ${selectedBrandName}.\n\nRULES:\n- Keep replies SHORT (max 4-5 lines)\n- Be warm and natural, not robotic\n- Always end with ONE question\n- Respond in same language as lead\n\nPRODUCT:\n${productText}\n\nPRICING:\n${pricingStr}\n\nOBJECTIONS:\n${objectionsStr}\n\nPROOF:\n${proofStr}\n\nQUALIFYING CONVERSATION FLOW:\n${flowStr}\n\nFLAGS:\n- PAYMENT_READY when lead agrees to pay\n- CALL_REQUESTED when lead wants call\n- LEAD_COLD after 3 failed attempts`;
    
    setPromptText(generated);
  }, [productText, pricingList, objectionsList, proofList, flowList, selectedBrandName, selectedClientId]);

  const handleSave = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await Promise.all([
        api.saveBrainDoc(selectedClientId, 'product', productText),
        api.saveBrainDoc(selectedClientId, 'pricing', JSON.stringify(pricingList)),
        api.saveBrainDoc(selectedClientId, 'objections', JSON.stringify(objectionsList)),
        api.saveBrainDoc(selectedClientId, 'proof', JSON.stringify(proofList)),
        api.saveBrainDoc(selectedClientId, 'flow', JSON.stringify(flowList)),
        api.saveBrainDoc(selectedClientId, 'prompt', promptText)
      ]);
      alert('AI Brain saved and activated successfully for ' + selectedBrandName + '!');
    } catch (err) {
      alert('Failed to save AI Brain config: ' + err.message);
    } finally {
      setSaving(false);
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
            {['product', 'pricing', 'objections', 'proof', 'flow', 'prompt'].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 15px', fontSize: 11, fontWeight: 600, border: 'none', background: tab === t ? C.accent : 'transparent', color: tab === t ? '#fff' : C.muted, textTransform: 'capitalize' }}>{t === 'flow' ? 'Conv Flow' : t === 'prompt' ? 'System Prompt' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 22 }}>
            {tab === 'product' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Product Info</h3>
                <textarea placeholder="Enter detailed product information, features, and benefits here. E.g., 'We offer a 12-week Digital Marketing bootcamp with 100% placement assistance. Key modules include SEO, Performance Marketing...'" value={productText} onChange={(e) => setProductText(e.target.value)} style={{ width: '100%', height: 180, background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: 13, fontSize: 12, outline: 'none', resize: 'vertical', lineHeight: 1.7 }} />
              </div>
            )}

            {tab === 'pricing' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Pricing Table</h3>
                {pricingList.map((p, i) => (
                  <div key={i} className="flex-col-mobile" style={{ display: 'flex', gap: 11, marginBottom: 11, padding: 13, background: C.surface, borderRadius: 9, border: '1px solid ' + C.border, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <input placeholder="E.g. Full Stack Dev Course" value={p[0]} onChange={(e) => { const newList = [...pricingList]; newList[i][0] = e.target.value; setPricingList(newList); }} style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 12, fontWeight: 600, outline: 'none', width: '100%' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: C.muted }}>Original</p>
                      <input placeholder="E.g. Rs 15,000" value={p[1]} onChange={(e) => { const newList = [...pricingList]; newList[i][1] = e.target.value; setPricingList(newList); }} style={{ background: 'transparent', border: 'none', color: C.dim, fontSize: 12, outline: 'none', textAlign: 'center', width: 80 }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: C.muted }}>Offer</p>
                      <input placeholder="E.g. Rs 9,999" value={p[2]} onChange={(e) => { const newList = [...pricingList]; newList[i][2] = e.target.value; setPricingList(newList); }} style={{ background: 'transparent', border: 'none', color: C.green, fontWeight: 700, fontSize: 12, outline: 'none', textAlign: 'center', width: 80 }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: C.muted }}>EMI</p>
                      <input placeholder="E.g. Rs 999/mo" value={p[3]} onChange={(e) => { const newList = [...pricingList]; newList[i][3] = e.target.value; setPricingList(newList); }} style={{ background: 'transparent', border: 'none', color: C.blue, fontSize: 11, outline: 'none', textAlign: 'center', width: 120 }} />
                    </div>
                    <button type="button" onClick={() => setPricingList(pricingList.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>×</button>
                  </div>
                ))}
                <button type="button" onClick={() => setPricingList([...pricingList, ['', '', '', '']])} style={{ background: 'transparent', border: '1px dashed ' + C.border, borderRadius: 9, color: C.muted, padding: '9px', width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}><Plus size={12} />Add Pricing Tier</button>
              </div>
            )}

            {tab === 'objections' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Objection Bank</h3>
                {objectionsList.map((o, i) => (
                  <div key={i} style={{ marginBottom: 13, background: C.surface, border: '1px solid ' + C.border, borderRadius: 9, overflow: 'hidden' }}>
                    <div style={{ padding: '9px 13px', background: '#2d1010', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="flex-col-mobile" style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                        <span style={{ fontSize: 11, color: C.red, fontWeight: 700, marginRight: 5 }}>Objection:</span>
                        <input placeholder="E.g. It's too expensive" value={o[0]} onChange={(e) => { const newList = [...objectionsList]; newList[i][0] = e.target.value; setObjectionsList(newList); }} style={{ background: 'transparent', border: 'none', color: C.red, fontSize: 11, fontWeight: 700, outline: 'none', flex: 1 }} />
                      </div>
                      <button type="button" onClick={() => setObjectionsList(objectionsList.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}>×</button>
                    </div>
                    <div className="flex-col-mobile" style={{ padding: '9px 13px', display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 12, color: C.green, fontWeight: 600, marginRight: 5 }}>AI Reply:</span>
                      <input placeholder="E.g. We offer flexible EMI starting at just Rs 999/mo." value={o[1]} onChange={(e) => { const newList = [...objectionsList]; newList[i][1] = e.target.value; setObjectionsList(newList); }} style={{ background: 'transparent', border: 'none', color: C.green, fontSize: 12, outline: 'none', flex: 1 }} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setObjectionsList([...objectionsList, ['', '']])} style={{ background: 'transparent', border: '1px dashed ' + C.border, borderRadius: 9, color: C.muted, padding: '9px', width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}><Plus size={12} />Add Objection</button>
              </div>
            )}

            {tab === 'proof' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Proof Bank</h3>
                <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 13 }}>
                  {proofList.map((p, i) => (
                    <div key={i} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 9, padding: 13, position: 'relative' }}>
                      <button type="button" onClick={() => setProofList(proofList.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}>×</button>
                      <input placeholder="E.g. 500+ Placements" value={p[0]} onChange={(e) => { const newList = [...proofList]; newList[i][0] = e.target.value; setProofList(newList); }} style={{ background: 'transparent', border: 'none', color: C.accent, fontWeight: 700, fontSize: 10, letterSpacing: 0.8, outline: 'none', width: '85%', marginBottom: 5 }} />
                      <textarea placeholder="E.g. Over 500 of our students have been successfully placed in top MNCs." value={p[1]} onChange={(e) => { const newList = [...proofList]; newList[i][1] = e.target.value; setProofList(newList); }} style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 12, lineHeight: 1.6, outline: 'none', width: '100%', height: 60, resize: 'none' }} />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setProofList([...proofList, ['', '']])} style={{ background: 'transparent', border: '1px dashed ' + C.border, borderRadius: 9, color: C.muted, padding: '9px', width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}><Plus size={12} />Add Proof Point</button>
              </div>
            )}

            {tab === 'flow' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Conversation Flow</h3>
                {flowList.map((q, i) => (
                  <div key={i} className="flex-col-mobile" style={{ display: 'flex', gap: 11, marginBottom: 13, alignItems: 'flex-start' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.accent + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{q[0]}</div>
                    <div style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 9, padding: 13, position: 'relative' }}>
                      <button type="button" onClick={() => setFlowList(flowList.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}>×</button>
                      <input placeholder="E.g. Are you a student or a working professional?" value={q[1]} onChange={(e) => { const newList = [...flowList]; newList[i][1] = e.target.value; setFlowList(newList); }} style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 12, outline: 'none', width: '90%', marginBottom: 7, fontWeight: 600 }} />
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {q[2].map((o, j) => (
                          <span key={j} style={{ background: C.blue + '20', color: C.blue, padding: '2px 9px', borderRadius: 11, fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <input placeholder={`Option ${j + 1}`} value={o} onChange={(e) => { const newList = [...flowList]; newList[i][2][j] = e.target.value; setFlowList(newList); }} style={{ background: 'transparent', border: 'none', color: C.blue, fontSize: 10, outline: 'none', width: 100 }} />
                            <button type="button" onClick={() => { const newList = [...flowList]; newList[i][2] = newList[i][2].filter((_, optionIdx) => optionIdx !== j); setFlowList(newList); }} style={{ background: 'transparent', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 9, fontWeight: 700 }}>×</button>
                          </span>
                        ))}
                        <button type="button" onClick={() => { const newList = [...flowList]; newList[i][2].push(''); setFlowList(newList); }} style={{ background: 'transparent', border: '1px dashed ' + C.border, borderRadius: 11, color: C.muted, padding: '1px 7px', fontSize: 9, cursor: 'pointer' }}>+ Option</button>
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setFlowList([...flowList, [`Q${flowList.length + 1}`, '', ['', '']]])} style={{ background: 'transparent', border: '1px dashed ' + C.border, borderRadius: 9, color: C.muted, padding: '9px', width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}><Plus size={12} />Add Question Flow</button>
              </div>
            )}

            {tab === 'prompt' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Generated System Prompt</h3>
                <div style={{ background: C.accent + '08', border: '1px solid ' + C.accentDim, borderRadius: 7, padding: 11, marginBottom: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 11, color: C.accent }}>Auto-compiled dynamically from your inputs. Used by Groq AI for every conversation.</p>
                </div>
                <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} style={{ width: '100%', height: 260, background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: '#10b981', padding: 13, fontSize: 11, outline: 'none', fontFamily: 'monospace', lineHeight: 1.8, resize: 'none' }} />
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
