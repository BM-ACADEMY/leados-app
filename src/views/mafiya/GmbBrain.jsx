import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
import { C } from '../../constants/theme.js';
import { 
  Brain, Plus, Trash2, Edit2, Check, X, Sparkles, 
  MessageSquare, HelpCircle, AlertTriangle, ShieldAlert, 
  Tag, Calendar, Volume2 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function GmbBrain() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClientState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Brain entries list
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Form states
  const [entryType, setEntryType] = useState('tone');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [seasonTitle, setSeasonTitle] = useState('');
  const [editSeasonTitle, setEditSeasonTitle] = useState('');

  // Creative brief fields
  const [briefTargetAudience, setBriefTargetAudience] = useState('');
  const [briefGoal, setBriefGoal] = useState('Awareness');
  const [briefBrandColors, setBriefBrandColors] = useState('');
  const [briefBrandStyle, setBriefBrandStyle] = useState('Modern');
  const [briefImageStyle, setBriefImageStyle] = useState('Realistic photography');
  const [briefCameraAngle, setBriefCameraAngle] = useState('Cinematic front shot');
  const [briefLighting, setBriefLighting] = useState('Cinematic lighting');
  const [briefNegativePrompt, setBriefNegativePrompt] = useState('no watermark, no blur, low quality');

  // Active tab/filter for the list
  const [activeTab, setActiveTab] = useState('all');

  const setActiveClient = (client) => {
    setActiveClientState(client);
    if (client) {
      localStorage.setItem('activeGmbClient', JSON.stringify(client));
    } else {
      localStorage.removeItem('activeGmbClient');
    }
  };

  // 1. Fetch Clients
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('leados_token');
      const { data: clientsData } = await axios.get(`${API_URL}/api/mafiya/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(clientsData);
      if (clientsData.length > 0) {
        const savedGmbClient = localStorage.getItem('activeGmbClient');
        if (savedGmbClient) {
          try {
            const parsed = JSON.parse(savedGmbClient);
            const found = clientsData.find(c => c.id === parsed.id);
            if (found) {
              setActiveClient(found);
              setLoading(false);
              return;
            }
          } catch (e) {}
        }
        setActiveClient(clientsData[0]);
      }
    } catch (err) {
      console.error('Fetch clients error:', err);
      toast.error('Failed to load GMB clients');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Brain Entries for active client
  const fetchBrainEntries = async (clientId) => {
    if (!clientId) return;
    setEntriesLoading(true);
    try {
      const token = localStorage.getItem('leados_token');
      const { data } = await axios.get(`${API_URL}/api/mafiya/reviews/brain?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries(data);
    } catch (err) {
      console.error('Fetch brain error:', err);
      toast.error('Failed to load brain entries');
    } finally {
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (activeClient) {
      fetchBrainEntries(activeClient.id);
    }
  }, [activeClient]);

  // 3. Save New Entry
  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!activeClient) return;

    if (entryType !== 'creative_brief' && !content.trim()) {
      toast.error('Please enter content for the brain entry');
      return;
    }
    if (entryType === 'seasonal' && !seasonTitle.trim()) {
      toast.error('Please enter a Season Title');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('leados_token');
      let finalContent = '';
      if (entryType === 'seasonal') {
        finalContent = JSON.stringify({ title: seasonTitle.trim(), text: content.trim() });
      } else if (entryType === 'creative_brief') {
        finalContent = JSON.stringify({
          targetAudience: briefTargetAudience.trim(),
          goal: briefGoal,
          brandColors: briefBrandColors.trim(),
          brandStyle: briefBrandStyle,
          imageStyle: briefImageStyle.trim(),
          cameraAngle: briefCameraAngle.trim(),
          lighting: briefLighting.trim(),
          negativePrompt: briefNegativePrompt.trim()
        });
      } else {
        finalContent = content.trim();
      }

      await axios.post(`${API_URL}/api/mafiya/reviews/brain`, {
        clientId: activeClient.id,
        entryType,
        content: finalContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Saved to brain successfully!');
      setContent('');
      setSeasonTitle('');
      // reset brief inputs
      setBriefTargetAudience('');
      setBriefBrandColors('');
      fetchBrainEntries(activeClient.id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 4. Update Existing Entry
  const handleUpdateEntry = async (id, type) => {
    if (!editContent.trim()) return;
    if (type === 'seasonal' && !editSeasonTitle.trim()) {
      toast.error('Please enter a Season Title');
      return;
    }

    try {
      const token = localStorage.getItem('leados_token');
      const finalContent = type === 'seasonal' 
        ? JSON.stringify({ title: editSeasonTitle.trim(), text: editContent.trim() })
        : editContent.trim();

      await axios.post(`${API_URL}/api/mafiya/reviews/brain`, {
        id,
        clientId: activeClient.id,
        entryType: type,
        content: finalContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Updated brain entry!');
      setEditingId(null);
      setEditContent('');
      setEditSeasonTitle('');
      fetchBrainEntries(activeClient.id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // 5. Delete Entry
  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this brain entry?')) return;
    try {
      const token = localStorage.getItem('leados_token');
      await axios.delete(`${API_URL}/api/mafiya/reviews/brain/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Entry deleted from brain');
      fetchBrainEntries(activeClient.id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Entry type cards/tabs configuration
  const cardTypes = [
    { type: 'tone', title: 'Tone', desc: 'How AI sounds', Icon: Volume2, color: C.purple },
    { type: 'offer', title: 'Offers', desc: 'Current deals', Icon: Tag, color: C.green },
    { type: 'keyword', title: 'Keywords', desc: 'Target terms', Icon: Sparkles, color: '#f59e0b' },
    { type: 'qa', title: 'Q&A Bank', desc: 'Questions + answers', Icon: HelpCircle, color: C.blue },
    { type: 'blacklist', title: 'Blacklist', desc: 'Never use words', Icon: ShieldAlert, color: C.red },
    { type: 'seasonal', title: 'Seasonal', desc: 'Time-based focus', Icon: Calendar, color: C.pink },
    { type: 'creative_brief', title: 'AI Creative Brief', desc: 'Poster visual styles & rules', Icon: Sparkles, color: C.accent }
  ];

  const getBadgeStyle = (type) => {
    switch (type.toLowerCase()) {
      case 'tone': return { background: `${C.purple}22`, color: C.purple, border: `1px solid ${C.purple}44` };
      case 'offer': return { background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}44` };
      case 'keyword': return { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'qa': return { background: `${C.blue}22`, color: C.blue, border: `1px solid ${C.blue}44` };
      case 'blacklist': return { background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}44` };
      case 'seasonal': return { background: `${C.pink}22`, color: C.pink, border: `1px solid ${C.pink}44` };
      case 'creative_brief': return { background: `${C.accent}22`, color: C.accent, border: `1px solid ${C.accent}44` };
      default: return { background: `${C.muted}22`, color: C.text, border: `1px solid ${C.border}` };
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
        <div style={{ textAlign: 'center' }}>
          <Brain size={42} className="animate-pulse" style={{ color: C.accent, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>Loading GMB Brain Configurations...</p>
        </div>
      </div>
    );
  }

  // Filter entries based on the activeTab
  const filteredEntries = activeTab === 'all' 
    ? entries 
    : entries.filter(e => e.entry_type.toLowerCase() === activeTab.toLowerCase());

  const clientName = activeClient?.business_name || 'GMB Profile';

  // Extract main title and subtitle from potentially long GMB names
  let displayTitle = clientName;
  let displaySubtitle = '';
  if (clientName.includes(' - ')) {
    const parts = clientName.split(' - ');
    displayTitle = parts[0];
    displaySubtitle = parts.slice(1).join(' - ');
  } else if (clientName.includes(',')) {
    const parts = clientName.split(',');
    displayTitle = parts[0];
    displaySubtitle = parts.slice(1).join(', ');
  }

  return (
    <div className="p-mobile" style={{ padding: 26, overflowY: 'auto', height: '100%', background: C.bg, position: 'relative' }}>
      {/* Background Radiance gradient */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400, background: 'radial-gradient(circle at 50% -20%, rgba(249,115,22,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header Section */}
        <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
                {displayTitle}'s Brain
              </h1>
              <span style={{ fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Training</span>
            </div>
            {displaySubtitle && (
              <div style={{ color: C.accent, fontSize: 12, fontWeight: 600, marginTop: 6, opacity: 0.9 }}>
                {displaySubtitle}
              </div>
            )}
            <p style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
              Your inputs control every post, review reply, keyword suggestion & Q&A answer
            </p>
          </div>
          
          {/* Client Select dropdown */}
          <select 
            value={activeClient ? activeClient.id : ''} 
            onChange={(e) => {
              const c = clients.find(cl => cl.id === parseInt(e.target.value));
              if (c) setActiveClient(c);
            }} 
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: '10px 16px', fontSize: 13, outline: 'none', cursor: 'pointer', minWidth: 200 }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </select>
        </div>

        {/* Explain Banner */}
        <div style={{ background: 'rgba(249, 115, 22, 0.04)', border: `1px solid ${C.accent}22`, borderRadius: 14, padding: 18, marginBottom: 28, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ background: `${C.accent}15`, padding: 8, borderRadius: 10, color: C.accent, display: 'flex' }}>
            <Brain size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>How {clientName}'s Brain works:</h4>
            <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
              Every entry you add here gets injected into every AI prompt for this GMB profile. Post generation, review replies, Q&A answers, keyword suggestions — all pull from this brain first. Change one entry and every future AI action changes instantly.
            </p>
          </div>
        </div>

        {/* Brain Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, marginBottom: 28 }} className="grid-responsive">
          {/* Left Column: Category Tabs */}
          <div style={{ gridColumn: 'span 7', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="grid-responsive">
            {cardTypes.map((card) => {
              const cardCount = entries.filter(e => e.entry_type.toLowerCase() === card.type).length;
              return (
                <div 
                  key={card.type}
                  onClick={() => {
                    setEntryType(card.type);
                    setActiveTab(card.type);
                  }}
                  style={{ 
                    background: entryType === card.type ? 'rgba(249, 115, 22, 0.04)' : C.surface, 
                    border: entryType === card.type ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                    borderRadius: 14, 
                    padding: 18, 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ background: `${card.color}15`, padding: 8, borderRadius: 10, color: card.color, display: 'flex' }}>
                      <card.Icon size={18} />
                    </div>
                    {cardCount > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: card.color, background: `${card.color}10`, padding: '2px 8px', borderRadius: 12 }}>
                        {cardCount} Active
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 4px 0' }}>{card.title}</h3>
                  <p style={{ fontSize: 11.5, color: C.muted, margin: 0 }}>{card.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Input Box */}
          <div style={{ gridColumn: 'span 5' }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Plus size={16} color={C.accent} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Add New Brain Entry</h3>
              </div>

              <form onSubmit={handleSaveEntry} style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entry Type</label>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value)}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="tone">Tone</option>
                    <option value="offer">Offers</option>
                    <option value="keyword">Keywords</option>
                    <option value="qa">Q&A Bank</option>
                    <option value="blacklist">Blacklist</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="creative_brief">AI Creative Brief</option>
                  </select>
                </div>

                {entryType === 'seasonal' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Season Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Diwali Sale 2026, Summer Camp"
                      value={seasonTitle}
                      onChange={(e) => setSeasonTitle(e.target.value)}
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', marginBottom: 6 }}
                    />
                  </div>
                )}

                {entryType === 'creative_brief' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>Target Audience</label>
                      <input type="text" placeholder="e.g. College students, local homeowners" value={briefTargetAudience} onChange={(e) => setBriefTargetAudience(e.target.value)} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>Poster Goal</label>
                      <select value={briefGoal} onChange={(e) => setBriefGoal(e.target.value)} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none' }}>
                        <option value="Lead">Lead Generation</option>
                        <option value="Awareness">Brand Awareness</option>
                        <option value="Offer">Special Offers & Sales</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>Brand Style</label>
                      <select value={briefBrandStyle} onChange={(e) => setBriefBrandStyle(e.target.value)} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none' }}>
                        <option value="Modern">Modern</option>
                        <option value="Luxury">Luxury</option>
                        <option value="Premium">Premium</option>
                        <option value="Minimal">Minimalist</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>Brand Theme Colors</label>
                      <input type="text" placeholder="e.g. Black and Gold, Teal and White" value={briefBrandColors} onChange={(e) => setBriefBrandColors(e.target.value)} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>Image / Photo Style</label>
                      <input type="text" placeholder="e.g. Realistic photography, 3D render illustration" value={briefImageStyle} onChange={(e) => setBriefImageStyle(e.target.value)} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>Camera Angle & Lighting</label>
                      <input type="text" placeholder="e.g. Cinematic front shot, warm studio light" value={briefCameraAngle} onChange={(e) => setBriefCameraAngle(e.target.value)} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>Negative Prompt (What to Avoid)</label>
                      <input type="text" placeholder="e.g. no watermark, no text in background, no blur" value={briefNegativePrompt} onChange={(e) => setBriefNegativePrompt(e.target.value)} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Content</label>
                    <textarea
                      placeholder={
                        entryType === 'tone' ? "e.g. Friendly Tamil-English mix. Warm, confident. Never stiff formal English." :
                        entryType === 'offer' ? "e.g. Free demo class every Saturday 11AM. Digital Marketing course Rs.8,999." :
                        entryType === 'keyword' ? "e.g. digital marketing course Pondicherry, social media training" :
                        entryType === 'qa' ? "e.g. Q: What is the fee? A: Courses start from Rs.4,999." :
                        entryType === 'blacklist' ? "e.g. cheap - low-cost - discount — instead use: affordable" :
                        "e.g. Summer special campaign, focus on high school graduates."
                      }
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      style={{ width: '100%', flex: 1, minHeight: 120, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  style={{ width: '100%', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 8, padding: '12px', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'opacity 0.2s', opacity: saving ? 0.7 : 1 }}
                >
                  <Plus size={15} />
                  {saving ? 'Saving...' : 'Save to Brain'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Section: List of Saved Entries */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, paddingBottom: 16, marginBottom: 20, gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              Saved Entries — {clientName}
              <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: C.muted, padding: '2px 8px', borderRadius: 10 }}>
                {entries.length} active
              </span>
            </h2>

            {/* List Filter Toolbar */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveTab('all')} 
                style={{ background: activeTab === 'all' ? C.border : 'transparent', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                All
              </button>
              {cardTypes.map(c => (
                <button 
                  key={c.type}
                  onClick={() => setActiveTab(c.type)} 
                  style={{ background: activeTab === c.type ? C.border : 'transparent', border: 'none', borderRadius: 6, padding: '6px 12px', color: activeTab === c.type ? '#fff' : C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>

          {entriesLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              Loading brain entries...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              No brain entries found for this {activeTab === 'all' ? 'client' : `category`}. Add one above!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredEntries.map((entry) => {
                const isEditing = editingId === entry.id;
                const badge = getBadgeStyle(entry.entry_type);

                return (
                  <div 
                    key={entry.id} 
                    style={{ 
                      background: C.bg, 
                      border: `1px solid ${C.border}`, 
                      borderRadius: 10, 
                      padding: '14px 18px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      gap: 20
                    }}
                    className="flex-col-mobile"
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }} className="flex-col-mobile">
                      <span style={{ 
                        fontSize: 10, 
                        fontWeight: 700, 
                        padding: '3px 10px', 
                        borderRadius: 6, 
                        textTransform: 'uppercase', 
                        letterSpacing: 0.5,
                        alignSelf: 'flex-start',
                        minWidth: 80,
                        textAlign: 'center',
                        ...badge
                      }}>
                        {entry.entry_type}
                      </span>
                                       {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                          {entry.entry_type === 'seasonal' && (
                            <input
                              type="text"
                              placeholder="Season Title (e.g. Summer Camp)"
                              value={editSeasonTitle}
                              onChange={(e) => setEditSeasonTitle(e.target.value)}
                              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: '#fff', fontSize: 13, padding: '8px 12px', outline: 'none' }}
                            />
                          )}
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            style={{ flex: 1, minHeight: 60, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: '#fff', fontSize: 13, padding: 8, outline: 'none', resize: 'vertical' }}
                          />
                        </div>
                      ) : (
                        <div style={{ flex: 1 }}>
                          {entry.entry_type === 'seasonal' ? (() => {
                            let title = 'Seasonal Campaign';
                            let text = entry.content;
                            try {
                              const parsed = JSON.parse(entry.content);
                              title = parsed.title || title;
                              text = parsed.text || text;
                            } catch (e) {}
                            return (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.pink, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                  {title}
                                </div>
                                <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                  {text}
                                </p>
                              </div>
                            );
                          })() : entry.entry_type === 'creative_brief' ? (() => {
                            let briefData = {};
                            try {
                              briefData = JSON.parse(entry.content);
                            } catch (e) {}
                            return (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                  AI Prompt Builder Guidelines
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12, color: '#94a3b8' }}>
                                  <div><strong>Target Audience:</strong> {briefData.targetAudience || 'Any'}</div>
                                  <div><strong>Goal:</strong> {briefData.goal || 'Awareness'}</div>
                                  <div><strong>Colors:</strong> {briefData.brandColors || 'Any'}</div>
                                  <div><strong>Style:</strong> {briefData.brandStyle || 'Modern'}</div>
                                  <div><strong>Visual Style:</strong> {briefData.imageStyle || 'Realistic'}</div>
                                  <div><strong>Angle/Lighting:</strong> {briefData.cameraAngle} / {briefData.lighting}</div>
                                  <div style={{ gridColumn: 'span 2' }}><strong>Negative Prompt:</strong> {briefData.negativePrompt || 'None'}</div>
                                </div>
                              </div>
                            );
                          })() : (
                            <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                              {entry.content}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
 
                    {/* Actions panel */}
                    <div style={{ display: 'flex', gap: 8, alignSelf: 'center' }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdateEntry(entry.id, entry.entry_type)}
                            title="Save"
                            style={{ background: `${C.green}15`, border: 'none', borderRadius: 6, padding: 8, color: C.green, display: 'flex', cursor: 'pointer' }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditContent('');
                              setEditSeasonTitle('');
                            }}
                            title="Cancel"
                            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, padding: 8, color: C.text, display: 'flex', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(entry.id);
                              if (entry.entry_type === 'seasonal') {
                                try {
                                  const parsed = JSON.parse(entry.content);
                                  setEditSeasonTitle(parsed.title || '');
                                  setEditContent(parsed.text || '');
                                } catch (e) {
                                  setEditSeasonTitle('');
                                  setEditContent(entry.content);
                                }
                              } else {
                                setEditContent(entry.content);
                              }
                            }}
                            title="Edit"
                            style={{ background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 6, padding: 8, color: C.text, display: 'flex', cursor: 'pointer' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            title="Delete"
                            style={{ background: `${C.red}10`, border: 'none', borderRadius: 6, padding: 8, color: C.red, display: 'flex', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
