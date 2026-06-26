import React, { useState, useEffect } from 'react';
import { C } from '../../constants/theme.js';
import { Sparkles, Copy, Check, FileText, Wand2, Lightbulb, Code2, Loader2, Building, Calendar, Globe, Eye } from 'lucide-react';
import { api } from '../../services/api.js';
import { useClient } from '../../contexts/ClientContext.jsx';
import toast from 'react-hot-toast';

const TABS = ["Blog Drafts", "Meta Rewriter", "Topic Ideas", "Schema Library"];
const SCHEMA_TYPES = ["LocalBusiness", "FAQPage", "BreadcrumbList", "Product", "Organization", "Article"];

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={copy} 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: C.dim,
        border: `1px solid ${C.border}`,
        color: C.text,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = C.muted; }}
      onMouseOut={(e) => { e.currentTarget.style.background = C.dim; }}
    >
      {copied ? <><Check size={12} color={C.green} />Copied!</> : <><Copy size={12} />Copy</>}
    </button>
  );
}

export default function ContentFactory() {
  const { activeClient } = useClient();
  const [activeTab, setActiveTab] = useState(0);

  // Blog Tab State
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [blogForm, setBlogForm] = useState({ keyword: '', language: 'english', wordCount: 800, tone: 'professional' });
  const [blogResult, setBlogResult] = useState(null);
  const [genLoading, setGenLoading] = useState(false);

  // Meta Rewriter State
  const [metaForm, setMetaForm] = useState({ pageUrl: '', currentTitle: '', currentMeta: '', targetKeyword: '' });
  const [metaResult, setMetaResult] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);

  // Topic Ideas State
  const [topicMonth, setTopicMonth] = useState(new Date().toISOString().slice(0, 7));
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // Schema State
  const [schemaType, setSchemaType] = useState('LocalBusiness');
  const [schemaResult, setSchemaResult] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  // Fetch drafts
  const fetchDrafts = async () => {
    if (!activeClient?.id) return;
    setDraftsLoading(true);
    try {
      const res = await api.get(`/thedal/content/${activeClient.id}`);
      setDrafts(res.content || []);
    } catch (err) {
      console.error('Failed to fetch content calendar:', err);
    } finally {
      setDraftsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [activeClient]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kw = params.get('keyword');
    if (kw) {
      setBlogForm(prev => ({ ...prev, keyword: kw }));
      // Clean query parameters from address bar to avoid duplicate initialization
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGenerateBlog = async () => {
    if (!blogForm.keyword.trim()) {
      toast.error('Please enter a target keyword');
      return;
    }
    setGenLoading(true);
    setBlogResult(null);
    try {
      const res = await api.post(`/thedal/content/${activeClient.id}/generate-blog`, blogForm);
      setBlogResult(res.post);
      toast.success('Blog post generated successfully!');
      fetchDrafts(); // Reload saved drafts list
    } catch (err) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenLoading(false);
    }
  };

  const handleRewriteMeta = async () => {
    if (!metaForm.targetKeyword.trim()) {
      toast.error('Please enter a target keyword');
      return;
    }
    setMetaLoading(true);
    setMetaResult(null);
    try {
      const res = await api.post(`/thedal/content/${activeClient.id}/rewrite-meta`, metaForm);
      setMetaResult(res.result);
      toast.success('Meta tags rewritten!');
    } catch (err) {
      toast.error(err.message || 'Meta rewrite failed');
    } finally {
      setMetaLoading(false);
    }
  };

  const handleGetTopics = async () => {
    setTopicsLoading(true);
    setTopics([]);
    try {
      const res = await api.post(`/thedal/content/${activeClient.id}/topic-ideas`, { month: topicMonth, count: 8 });
      setTopics(res.ideas?.topics || []);
      toast.success('Topic ideas generated!');
    } catch (err) {
      toast.error(err.message || 'Failed to fetch topic ideas');
    } finally {
      setTopicsLoading(false);
    }
  };

  const handleGenerateSchema = async () => {
    setSchemaLoading(true);
    setSchemaResult(null);
    try {
      const res = await api.post(`/thedal/content/${activeClient.id}/schema`, { schemaType });
      setSchemaResult(res.schema?.jsonLd);
      toast.success(`${schemaType} Schema generated!`);
    } catch (err) {
      toast.error(err.message || 'Failed to generate schema');
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleUpdateStatus = async (draftId, newStatus) => {
    try {
      await api.put(`/thedal/content/${activeClient.id}/${draftId}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchDrafts();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (!activeClient) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.bg, color: C.text, padding: 30 }}>
        <div style={{ textAlign: 'center', maxWidth: 450, background: C.surface, border: `1px solid ${C.border}`, padding: 40, borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <Building size={48} color={C.accent} style={{ marginBottom: 20 }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, fontFamily: "'Syne', sans-serif" }}>No Active Client Selected</h2>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            Please select an active client from the client selector in the sidebar or onboard a new client to access the Content Factory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px 40px', color: C.text, height: '100%', overflowY: 'auto', background: C.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc', margin: 0, fontFamily: "'Syne', sans-serif" }}>Content Factory</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>
            AI-powered content writer and calendar optimization for <strong style={{ color: C.accent }}>{activeClient.business_name || activeClient.domain}</strong>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: 30, flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <button 
            key={i} 
            onClick={() => setActiveTab(i)}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === i ? C.accent : 'transparent',
              color: activeTab === i ? '#fff' : C.text,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i === 0 && <FileText size={16} />}
              {i === 1 && <Wand2 size={16} />}
              {i === 2 && <Lightbulb size={16} />}
              {i === 3 && <Code2 size={16} />}
              {t}
            </div>
          </button>
        ))}
      </div>

      {/* Main Tab Area */}
      <div style={{ minHeight: 400 }}>
        {/* Tab 0: Blog Drafts */}
        {activeTab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 30 }} className="grid-responsive">
            {/* Writer Box */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Sparkles size={20} color={C.accent} /> Generate SEO Blog Post</h3>
              
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Target Keyword</label>
                <input 
                  type="text"
                  value={blogForm.keyword}
                  onChange={e => setBlogForm({ ...blogForm, keyword: e.target.value })}
                  placeholder="e.g. root canal treatment in Pondicherry"
                  style={{
                    width: '100%',
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    color: C.text,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = C.accent}
                  onBlur={e => e.currentTarget.style.borderColor = C.border}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Language Style</label>
                  <select 
                    value={blogForm.language}
                    onChange={e => setBlogForm({ ...blogForm, language: e.target.value })}
                    style={{
                      width: '100%',
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: '12px 16px',
                      color: C.text,
                      fontSize: 14,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="english">English (Indian)</option>
                    <option value="tamil">Tamil (தமிழ்)</option>
                    <option value="tanglish">Tanglish (conversational)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Word Count</label>
                  <select 
                    value={blogForm.wordCount}
                    onChange={e => setBlogForm({ ...blogForm, wordCount: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: '12px 16px',
                      color: C.text,
                      fontSize: 14,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {[600, 800, 1000, 1200, 1500].map(n => <option key={n} value={n}>{n} words</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Tone of Voice</label>
                <select 
                  value={blogForm.tone}
                  onChange={e => setBlogForm({ ...blogForm, tone: e.target.value })}
                  style={{
                    width: '100%',
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    color: C.text,
                    fontSize: 14,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="professional">Professional & Informative</option>
                  <option value="conversational">Friendly & Casual</option>
                  <option value="educational">Academic & Instructive</option>
                  <option value="persuasive">Sales & Action-oriented</option>
                </select>
              </div>

              <button 
                onClick={handleGenerateBlog} 
                disabled={genLoading}
                style={{
                  width: '100%',
                  background: `linear-gradient(135deg, ${C.accent} 0%, #f43f5e 100%)`,
                  color: '#fff',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                  transition: 'opacity 0.2s',
                  opacity: genLoading ? 0.6 : 1,
                }}
              >
                {genLoading ? <><Loader2 size={18} className="spin" /> Writing with Gemini...</> : <><Sparkles size={18} /> Generate Post</>}
              </button>

              {blogResult && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f8fafc' }}>{blogResult.title}</h4>
                      <CopyBtn text={blogResult.title} />
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, margin: '0 0 12px 0' }}>{blogResult.metaDescription}</p>
                    <div style={{ display: 'flex', gap: 12, color: C.muted, fontSize: 12, fontWeight: 500 }}>
                      <span>Word Count: <strong>{blogResult.wordCount}</strong></span>
                      <span>•</span>
                      <span>Read Time: <strong>{blogResult.readingTime}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Use editor / copy raw HTML:</span>
                    <CopyBtn text={blogResult.content} />
                  </div>
                  <div 
                    style={{
                      maxHeight: 300,
                      overflowY: 'auto',
                      background: '#090d16',
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 20,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: '#cbd5e1',
                    }}
                    dangerouslySetInnerHTML={{ __html: blogResult.content }}
                  />
                </div>
              )}
            </div>

            {/* Saved Calendar */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Calendar size={20} color={C.blue} /> Saved Drafts & Calendar</h3>
              
              {draftsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ height: 70, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              ) : drafts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
                  <FileText size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p style={{ fontSize: 14, margin: 0 }}>No blog drafts created yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 600, overflowY: 'auto', paddingRight: 4 }}>
                  {drafts.map(d => (
                    <div key={d.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                          {d.title || 'Untitled Draft'}
                        </div>
                        <select 
                          value={d.status}
                          onChange={e => handleUpdateStatus(d.id, e.target.value)}
                          style={{
                            background: d.status === 'published' ? 'rgba(16, 185, 129, 0.1)' : d.status === 'scheduled' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            color: d.status === 'published' ? C.green : d.status === 'scheduled' ? C.blue : C.text,
                            border: `1px solid ${d.status === 'published' ? C.green : d.status === 'scheduled' ? C.blue : C.border}`,
                            borderRadius: 6,
                            padding: '2px 8px',
                            fontSize: 12,
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="draft">Draft</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="published">Published</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: C.muted }}>
                        <span>Keyword: <strong style={{ color: C.text }}>{d.target_keyword || 'None'}</strong></span>
                        <span>{d.language || 'english'} · {d.word_count || 0}w</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Meta Rewriter */}
        {activeTab === 1 && (
          <div style={{ maxWidth: 700, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 30, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Wand2 size={20} color={C.accent} /> AI Meta Tag Optimizer</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              {[
                { key: 'pageUrl', label: 'Page URL', placeholder: 'https://example.com/services/root-canal' },
                { key: 'currentTitle', label: 'Current Page Title', placeholder: 'Root Canal Treatment | Dentist Pondicherry' },
                { key: 'currentMeta', label: 'Current Meta Description', placeholder: 'Looking for a dentist? We offer root canals at our clinic. Contact us today.' },
                { key: 'targetKeyword', label: 'Target Keyword', placeholder: 'root canal cost pondicherry' }
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>{f.label}</label>
                  <input 
                    type="text"
                    value={metaForm[f.key]}
                    onChange={e => setMetaForm({ ...metaForm, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    style={{
                      width: '100%',
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: '12px 16px',
                      color: C.text,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={handleRewriteMeta}
              disabled={metaLoading}
              style={{
                width: 'fit-content',
                background: C.accent,
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: metaLoading ? 0.6 : 1,
              }}
            >
              {metaLoading ? <><Loader2 size={16} className="spin" /> Optimizing...</> : <><Sparkles size={16} /> Optimize Meta Tags</>}
            </button>

            {metaResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 10 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>OPTIMIZED TITLE ({metaResult.titleLength} chars)</span>
                    <CopyBtn text={metaResult.newTitle} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{metaResult.newTitle}</div>
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>OPTIMIZED META DESCRIPTION ({metaResult.metaLength} chars)</span>
                    <CopyBtn text={metaResult.newMetaDescription} />
                  </div>
                  <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>{metaResult.newMetaDescription}</div>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                  <h5 style={{ fontSize: 13, fontWeight: 700, color: C.blue, margin: '0 0 6px 0' }}>Strategic Improvement:</h5>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{metaResult.improvement}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Topic Ideas */}
        {activeTab === 2 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 30, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Target Month</label>
                  <input 
                    type="month"
                    value={topicMonth}
                    onChange={e => setTopicMonth(e.target.value)}
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: '10px 16px',
                      color: C.text,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <button 
                  onClick={handleGetTopics}
                  disabled={topicsLoading}
                  style={{
                    background: C.accent,
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 22,
                    opacity: topicsLoading ? 0.6 : 1,
                  }}
                >
                  {topicsLoading ? <><Loader2 size={16} className="spin" /> Brainstorming...</> : <><Lightbulb size={16} /> Get Topic Ideas</>}
                </button>
              </div>
            </div>

            {topics.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {topics.map((t, idx) => (
                  <div key={idx} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(249, 115, 22, 0.1)', color: C.accent, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                          Priority {t.priority}
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: t.estimatedTraffic === 'high' ? 'rgba(16, 185, 129, 0.1)' : t.estimatedTraffic === 'medium' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.05)',
                          color: t.estimatedTraffic === 'high' ? C.green : t.estimatedTraffic === 'medium' ? '#eab308' : C.muted,
                          padding: '2px 8px',
                          borderRadius: 4,
                          textTransform: 'capitalize'
                        }}>
                          {t.estimatedTraffic} traffic
                        </span>
                      </div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 10px 0', lineHeight: 1.4 }}>{t.title}</h4>
                      <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Keyword: <strong style={{ color: C.text }}>{t.targetKeyword}</strong></p>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 12, fontSize: 12, color: C.muted }}>
                      <span style={{ textTransform: 'capitalize' }}>Type: {t.contentType}</span>
                      <span style={{ textTransform: 'capitalize' }}>Intent: {t.intent}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Schema Library */}
        {activeTab === 3 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 30, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Code2 size={20} color={C.accent} /> JSON-LD Schema Generator</h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {SCHEMA_TYPES.map(type => (
                <button 
                  key={type} 
                  onClick={() => setSchemaType(type)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: `1px solid ${schemaType === type ? C.accent : C.border}`,
                    background: schemaType === type ? 'rgba(249, 115, 22, 0.1)' : C.card,
                    color: schemaType === type ? C.accent : C.text,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            <button 
              onClick={handleGenerateSchema}
              disabled={schemaLoading}
              style={{
                width: 'fit-content',
                background: C.accent,
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: schemaLoading ? 0.6 : 1,
              }}
            >
              {schemaLoading ? <><Loader2 size={16} className="spin" /> Generating...</> : <><Code2 size={16} /> Generate Schema Script</>}
            </button>

            {schemaResult && (
              <div style={{ background: '#090d16', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Copy script tag into the &lt;head&gt; of your page</span>
                  <CopyBtn text={schemaResult} />
                </div>
                <pre style={{ margin: 0, padding: 20, overflowX: 'auto', fontSize: 13, fontFamily: 'monospace', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {schemaResult}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
