import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
import { C } from '../../constants/theme.js';
import { 
  Megaphone, Plus, Trash2, Download, Sparkles, 
  Loader2, Check, Star 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StreetPosts() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClientState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Brain Entries states
  const [brainEntries, setBrainEntries] = useState([]);
  const [brainLoading, setBrainLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Offers');
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Modal & Generation states
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Generated results
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedSubtitle, setGeneratedSubtitle] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [customImagePrompt, setCustomImagePrompt] = useState('');

  const setActiveClient = (client) => {
    setActiveClientState(client);
    if (client) {
      localStorage.setItem('activeGmbClient', JSON.stringify(client));
    } else {
      localStorage.removeItem('activeGmbClient');
    }
  };

  // Fetch Clients
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
      toast.error('Failed to load GMB clients');
    } finally {
      setLoading(false);
    }
  };

  // Fetch GMB Posts
  const fetchGmbPosts = async (clientId) => {
    if (!clientId) return;
    setPostsLoading(true);
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch(`/api/mafiya/reviews/posts?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPostsLoading(false);
    }
  };

  // Fetch AI Brain Entries for active client
  const fetchBrainEntries = async (clientId) => {
    if (!clientId) return;
    setBrainLoading(true);
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch(`/api/mafiya/reviews/brain?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBrainEntries(data);
        const filtered = data.filter(e => e.entry_type.toLowerCase() === selectedCategory.toLowerCase());
        if (filtered.length > 0) {
          setSelectedEntry(filtered[0]);
        } else {
          setSelectedEntry(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBrainLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (activeClient) {
      fetchGmbPosts(activeClient.id);
      fetchBrainEntries(activeClient.id);
    }
  }, [activeClient]);

  // Refetch and auto-select when selectedCategory changes
  useEffect(() => {
    if (brainEntries.length > 0) {
      const filtered = brainEntries.filter(e => {
        const type = e.entry_type.toLowerCase();
        const cat = selectedCategory.toLowerCase();
        if (cat === 'q&a bank') return type === 'qa' || type === 'q&a bank';
        if (cat === 'offers') return type === 'offer' || type === 'offers';
        if (cat === 'keywords') return type === 'keyword' || type === 'keywords';
        if (cat === 'creative brief') return type === 'creative_brief';
        return type === cat;
      });
      if (filtered.length > 0) {
        setSelectedEntry(filtered[0]);
      } else {
        setSelectedEntry(null);
      }
    }
  }, [selectedCategory, brainEntries]);

  // Trigger AI Generation
  const handleGenerate = async () => {
    if (!selectedEntry) {
      toast.error('Please select an active brain entry first');
      return;
    }

    setGenerating(true);
    setGeneratedCaption('Generating caption...');
    setGeneratedTitle('Generating Title...');
    setGeneratedSubtitle('Generating Subtitle...');
    setGeneratedImageUrl('');
    
    try {
      let entryTitle = '';
      let entryText = '';

      if (selectedCategory.toLowerCase() === 'seasonal') {
        try {
          const parsed = JSON.parse(selectedEntry.content);
          entryTitle = parsed.title;
          entryText = parsed.text;
        } catch (e) {
          entryText = selectedEntry.content;
        }
      } else {
        entryText = selectedEntry.content;
      }

      const token = localStorage.getItem('leados_token');
      const res = await fetch('/api/mafiya/reviews/posts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: activeClient.id,
          postType: selectedCategory,
          selectedEntryText: entryText,
          selectedEntryTitle: entryTitle,
          customImagePrompt: customImagePrompt.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedCaption(data.caption);
        setGeneratedTitle(data.posterTitle);
        setGeneratedSubtitle(data.posterSubtitle);
        setGeneratedImageUrl(data.imageUrl);
      } else {
        throw new Error('AI Generation failed');
      }
    } catch (err) {
      toast.error('AI Generation Failed. Fallback defaults used.');
      setGeneratedCaption(`Visit ${activeClient?.business_name} today! Call us at ${activeClient?.phone_number}.`);
      setGeneratedTitle('SPECIAL UPDATE');
      setGeneratedSubtitle('Contact us for details');
      setGeneratedImageUrl('https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600');
    } finally {
      setGenerating(false);
    }
  };

  // Save Generated Post
  const handleSavePost = async (status = 'draft') => {
    if (!generatedCaption) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch('/api/mafiya/reviews/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: activeClient.id,
          postType: selectedCategory,
          caption: generatedCaption,
          posterTitle: generatedTitle,
          posterSubtitle: generatedSubtitle,
          bgTheme: 'custom_stock',
          imageUrl: generatedImageUrl,
          status
        })
      });

      if (res.ok) {
        toast.success(status === 'published' ? 'Published to GMB Successfully!' : 'Saved to drafts');
        setShowModal(false);
        fetchGmbPosts(activeClient.id);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Download Poster Image
  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.download = `${activeClient?.business_name || 'GMB'}_post_${Date.now()}.png`;
    link.href = generatedImageUrl;
    link.target = '_blank';
    link.click();
    toast.success('Opening poster image in a new tab for download!');
  };

  // Delete Post
  const handleDeletePost = async (id) => {
    if (!confirm('Are you sure you want to delete this GMB post record?')) return;
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch(`/api/mafiya/reviews/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Post deleted');
        fetchGmbPosts(activeClient.id);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
        <div style={{ textAlign: 'center' }}>
          <Megaphone size={42} className="animate-pulse" style={{ color: C.accent, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>Loading Street Posts dashboard...</p>
        </div>
      </div>
    );
  }

  const clientName = activeClient?.business_name || 'GMB Profile';
  const contactPhone = activeClient?.phone_number || '';

  // Filter brain entries for UI dropdown selector based on active category
  const filteredBrainEntries = brainEntries.filter(e => {
    const type = e.entry_type.toLowerCase();
    const cat = selectedCategory.toLowerCase();
    if (cat === 'q&a bank') return type === 'qa' || type === 'q&a bank';
    if (cat === 'offers') return type === 'offer' || type === 'offers';
    if (cat === 'keywords') return type === 'keyword' || type === 'keywords';
    if (cat === 'creative brief') return type === 'creative_brief';
    return type === cat;
  });

  return (
    <div className="p-mobile" style={{ padding: 26, overflowY: 'auto', height: '100%', background: C.bg, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400, background: 'radial-gradient(circle at 50% -20%, rgba(249,115,22,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header toolbar */}
        <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 26 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
                Street Posts <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(249,115,22,0.12)', color: C.accent, padding: '3px 8px', borderRadius: 20, marginLeft: 8 }}>GMB Posts</span>
              </h1>
            </div>
            <p style={{ color: C.muted, fontSize: 12.5, marginTop: 5 }}>
              8 posts/month · {posts.length} generated · {Math.max(0, 8 - posts.length)} remaining — Growth Plan · {clientName}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 450, justifyContent: 'flex-end' }} className="flex-col-mobile">
            <select 
              value={activeClient ? activeClient.id : ''} 
              onChange={(e) => {
                const c = clients.find(cl => cl.id === parseInt(e.target.value));
                if (c) setActiveClient(c);
              }} 
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: '10px 14px', fontSize: 13, outline: 'none', cursor: 'pointer', flex: 1 }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.business_name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setGeneratedCaption('');
                setGeneratedTitle('');
                setGeneratedSubtitle('');
                setGeneratedImageUrl('');
                setShowModal(true);
              }}
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.25)' }}
            >
              <Plus size={15} /> Generate Post
            </button>
          </div>
        </div>

        {/* Existing posts grid */}
        {postsLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: C.muted }}>
            <Loader2 size={24} className="spin" style={{ color: C.accent, margin: '0 auto 10px auto' }} />
            Loading post history...
          </div>
        ) : posts.length === 0 ? (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '60px 20px', textAlign: 'center', color: C.muted }}>
            <Megaphone size={40} style={{ color: C.border, marginBottom: 14 }} />
            <h3 style={{ color: '#fff', fontSize: 15, margin: '0 0 4px 0' }}>No GMB Posts Yet</h3>
            <p style={{ fontSize: 12.5, margin: 0 }}>Click "Generate Post" above to create your first GMB Post.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {posts.map((post) => (
              <div 
                key={post.id} 
                style={{ 
                  background: C.surface, 
                  border: `1px solid ${C.border}`, 
                  borderRadius: 16, 
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Poster visual representation mock */}
                <div style={{ 
                  height: 200, 
                  backgroundImage: post.image_url ? `url(${post.image_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 100%)' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{clientName.substring(0, 20)}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                      {post.post_type}
                    </span>
                  </div>

                  <div style={{ textAlign: 'center', color: '#fff', position: 'relative', zIndex: 1 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0', letterSpacing: 0.5, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                      {post.poster_title || 'UPDATE'}
                    </h3>
                    <p style={{ fontSize: 12, color: '#e2e8f0', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                      {post.poster_subtitle || 'Contact us for details'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#f1f5f9', fontWeight: 600, position: 'relative', zIndex: 1 }}>
                    <span>📞 {activeClient?.phone_number}</span>
                    <span>Google Business</span>
                  </div>
                </div>

                {/* Caption / description */}
                <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 14px 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {post.caption}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                    <span style={{ fontSize: 11, color: post.status === 'published' ? C.green : C.muted, fontWeight: 600 }}>
                      • {post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        style={{ background: `${C.red}12`, border: 'none', borderRadius: 6, padding: 6, color: C.red, display: 'flex', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ AI Post Generation Modal ═══ */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 20, zIndex: 9999, overflowY: 'auto' }}>
            <div style={{ background: C.surface, width: '100%', maxWidth: 1080, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)', marginBottom: 50 }}>
              
              {/* Header */}
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, transparent 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Megaphone size={18} color={C.accent} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Generate GMB Post & Poster</h3>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: C.text, fontWeight: 600 }}
                >
                  Close
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, padding: 24 }} className="grid-responsive">
                
                {/* Left Side: Parameters / Caption */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  
                  {/* Category Dropdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>1. Brain Category</label>
                      <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px 12px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="Offers">Offers</option>
                        <option value="Seasonal">Seasonal</option>
                        <option value="Q&A Bank">Q&A Bank</option>
                        <option value="Keywords">Keywords</option>
                        <option value="Creative Brief">Creative Brief</option>
                      </select>
                    </div>

                    {/* Specific Entry Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>2. Active Brain Entry</label>
                      {brainLoading ? (
                        <div style={{ padding: '10px 0', fontSize: 12, color: C.muted }}>Loading entries...</div>
                      ) : filteredBrainEntries.length === 0 ? (
                        <div style={{ padding: '11px 12px', fontSize: 12.5, color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, background: 'rgba(239,68,68,0.05)' }}>
                          No entries found in GMB Brain!
                        </div>
                      ) : (
                        <select 
                          value={selectedEntry ? selectedEntry.id : ''} 
                          onChange={(e) => {
                            const found = filteredBrainEntries.find(ent => ent.id === parseInt(e.target.value));
                            if (found) setSelectedEntry(found);
                          }}
                          style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px 12px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' }}
                        >
                          {filteredBrainEntries.map(entry => {
                            let labelText = entry.content;
                            if (selectedCategory.toLowerCase() === 'seasonal') {
                              try {
                                const parsed = JSON.parse(entry.content);
                                labelText = `[${parsed.title}] ${parsed.text}`;
                              } catch(e){}
                            } else if (selectedCategory.toLowerCase() === 'creative brief') {
                              try {
                                const parsed = JSON.parse(entry.content);
                                labelText = `[Creative Brief] Style: ${parsed.brandStyle}, Colors: ${parsed.brandColors}`;
                              } catch(e){}
                            }
                            return (
                              <option key={entry.id} value={entry.id}>
                                {labelText.substring(0, 45)}...
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Selected Preview Box */}
                  {selectedEntry && (
                    <div style={{ background: 'rgba(249,115,22,0.04)', border: '1px dashed rgba(249,115,22,0.2)', borderRadius: 10, padding: 14 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Brain Data Source:</span>
                      <p style={{ fontSize: 12.5, color: '#e2e8f0', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                        {(() => {
                          if (selectedCategory.toLowerCase() === 'seasonal') {
                            try {
                              const parsed = JSON.parse(selectedEntry.content);
                              return <strong>{parsed.title}: <span style={{ fontWeight: 400 }}>{parsed.text}</span></strong>;
                            } catch(e){}
                          } else if (selectedCategory.toLowerCase() === 'creative brief') {
                            try {
                              const parsed = JSON.parse(selectedEntry.content);
                              return (
                                <span>
                                  <strong>AI Creative Brief Guidelines:</strong><br/>
                                  • Style: {parsed.brandStyle} ({parsed.brandColors})<br/>
                                  • Audience: {parsed.targetAudience}<br/>
                                  • Visuals: {parsed.imageStyle} ({parsed.cameraAngle})
                                </span>
                              );
                            } catch(e){}
                          }
                          return selectedEntry.content;
                        })()}
                      </p>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Custom Image Prompt (Optional overrides Creative Brief visual instructions)</label>
                    <textarea
                      placeholder="e.g. Create a dark theme educational poster showing a modern tech office in Pondicherry with students learning AI digital marketing"
                      value={customImagePrompt}
                      onChange={(e) => setCustomImagePrompt(e.target.value)}
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 12.5, outline: 'none', resize: 'vertical', minHeight: 60 }}
                    />
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={generating || !selectedEntry}
                    style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 8, padding: 13, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', opacity: (generating || !selectedEntry) ? 0.6 : 1 }}
                  >
                    {generating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                    {generating ? 'Generating AI Post...' : 'Generate AI Post Content'}
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>GMB Caption</label>
                    <textarea
                      value={generatedCaption}
                      onChange={(e) => setGeneratedCaption(e.target.value)}
                      placeholder="Your generated GMB post caption will appear here..."
                      style={{ width: '100%', flex: 1, minHeight: 180, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: '#cbd5e1', fontSize: 12.5, outline: 'none', resize: 'none', lineHeight: 1.6 }}
                    />
                  </div>
                </div>

                {/* Right Side: Poster Live Preview Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', justifyContent: 'center' }}>
                  
                  {/* Poster Graphic Card Container */}
                  <div style={{ 
                    width: '100%', 
                    maxWidth: 380, 
                    aspectRatio: '1/1', 
                    borderRadius: 14, 
                    overflow: 'hidden', 
                    border: `2px solid ${C.border}`,
                    background: '#090d16',
                    position: 'relative',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                  }}>
                    {generating ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
                        <Loader2 size={24} className="spin" style={{ color: C.accent, marginBottom: 10 }} />
                        <span>Generating poster...</span>
                      </div>
                    ) : generatedImageUrl ? (
                      <>
                        <img 
                          src={generatedImageUrl} 
                          alt="AI Generated Banner" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        {/* Branded Text Overlay on top of DALL-E/Unsplash background */}
                        <div style={{ 
                          position: 'absolute', 
                          inset: 0, 
                          background: 'linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 60%, rgba(15,23,42,0.15) 100%)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: 20
                        }}>
                          {/* Header Brand */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {activeClient?.logo_url ? (
                                <img 
                                  src={activeClient.logo_url} 
                                  alt="Brand Logo" 
                                  style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.4)' }}
                                />
                              ) : (
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                                  {clientName.substring(0, 1)}
                                </div>
                              )}
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                                {clientName.substring(0, 24)}
                              </span>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(249,115,22,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                              {selectedCategory}
                            </span>
                          </div>

                          {/* Center Copy */}
                          <div style={{ textAlign: 'center', padding: '0 10px' }}>
                            <h2 style={{ 
                              fontSize: 22, 
                              fontWeight: 900, 
                              color: '#fbbf24', 
                              margin: '0 0 6px 0', 
                              textTransform: 'uppercase',
                              textShadow: '0 2px 5px rgba(0,0,0,0.8)',
                              transform: 'skewX(-4deg)'
                            }}>
                              {generatedTitle}
                            </h2>
                            <p style={{ 
                              fontSize: 12.5, 
                              color: '#f1f5f9', 
                              fontWeight: 700, 
                              margin: 0, 
                              textShadow: '0 2px 4px rgba(0,0,0,0.7)' 
                            }}>
                              {generatedSubtitle}
                            </p>
                          </div>

                          {/* Footer */}
                          <div style={{ 
                            background: 'rgba(249, 115, 22, 0.12)', 
                            border: '1px solid rgba(249, 115, 22, 0.25)', 
                            borderRadius: 6,
                            padding: 8,
                            textAlign: 'center'
                          }}>
                            <span style={{ fontSize: 13, color: '#fff', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                              📞 CALL US: {contactPhone}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted, padding: 20, textAlign: 'center' }}>
                        <Sparkles size={28} style={{ color: C.border, marginBottom: 12 }} />
                        <span style={{ fontSize: 13 }}>Select an entry above and click generate to design your GMB poster.</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
                    <button
                      onClick={handleDownload}
                      disabled={!generatedImageUrl}
                      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      <Download size={14} /> Download Poster
                    </button>
                    <button
                      onClick={() => handleSavePost('draft')}
                      disabled={saving || !generatedCaption}
                      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      Save Draft
                    </button>
                  </div>

                  <button
                    onClick={() => handleSavePost('published')}
                    disabled={saving || !generatedCaption}
                    style={{ width: '100%', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 8, padding: 14, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <Check size={16} /> Publish Post to GMB Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
