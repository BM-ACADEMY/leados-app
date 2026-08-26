import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import SopModal from '../../components/common/SopModal.jsx';
import { getSopForPath } from '../../constants/sopContent.js';
import { C } from '../../constants/theme.js';
import { Sparkles, Copy, Check, FileText, Wand2, Lightbulb, Code2, Loader2, Building, Calendar, Globe, Eye, ChevronDown, ChevronUp, ChevronRight, CheckCircle2, Download } from 'lucide-react';
import { api } from '../../services/api.js';
import { useClient } from '../../contexts/ClientContext.jsx';
import toast from 'react-hot-toast';

const TABS = ["Blog Drafts", "Meta Rewriter", "Topic Ideas", "Schema Library"];
const TAB_SOP_KEYS = ["/thedal/content-factory#blog-drafts", "/thedal/content-factory#meta-rewriter", "/thedal/content-factory#topic-ideas", "/thedal/content-factory#schema-library"];

const SCHEMA_TYPE_INFO = {
  LocalBusiness: { what: 'Marks this as a real, physical local business — name, address, service area and contact details.', use: 'Powers Google Maps / "near me" / Local Pack results; can show your address & contact directly in search.' },
  FAQPage: { what: 'Marks up a real question-and-answer section already on the page.', use: 'Google can show an expandable FAQ dropdown directly under your search result — more space, more clicks, no ad spend.' },
  BreadcrumbList: { what: "Describes a page's navigation path (Home > Services > This Page).", use: 'Google shows this breadcrumb trail instead of a raw URL, and understands your site structure better.' },
  Product: { what: 'Marks a specific product or paid service — name, price, availability.', use: 'Can trigger rich results showing price/stock directly in search — for a real pricing or service page.' },
  Organization: { what: 'Your business as an entity — official name, logo, and verified social profiles.', use: 'Helps Google build a Knowledge Panel and correctly link your real social accounts to your brand.' },
  Article: { what: 'A blog post or news piece — headline, author, publish date.', use: 'Tells Google this is an article, not a static page; needed for author/date display and some article rich results.' },
};

const SCHEMA_FIELDS = {
  LocalBusiness: [
    { key: 'name', label: 'Business Name', type: 'text' },
    { key: 'streetAddress', label: 'Street Address', type: 'text' },
    { key: 'addressLocality', label: 'City / Locality', type: 'text' },
    { key: 'addressRegion', label: 'State', type: 'text' },
    { key: 'postalCode', label: 'PIN Code', type: 'text' },
    { key: 'telephone', label: 'Phone Number', type: 'text' },
    { key: 'priceRange', label: 'Price Range (e.g. ₹₹)', type: 'text' },
  ],
  FAQPage: [{ key: 'faqs', label: 'Questions & Answers', type: 'faqList' }],
  BreadcrumbList: [{ key: 'crumbs', label: 'Page Path (Home → … → This Page)', type: 'breadcrumbList' }],
  Product: [
    { key: 'name', label: 'Product / Service Name', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'price', label: 'Price (INR)', type: 'text' },
    { key: 'availability', label: 'Availability', type: 'select', options: ['InStock', 'OutOfStock', 'PreOrder'] },
  ],
  Organization: [
    { key: 'name', label: 'Organization Name', type: 'text' },
    { key: 'logoUrl', label: 'Logo URL', type: 'text' },
    { key: 'socialLinks', label: 'Social Profile URLs (one per line)', type: 'textarea' },
  ],
  Article: [
    { key: 'headline', label: 'Headline', type: 'text' },
    { key: 'authorName', label: 'Author Name', type: 'text' },
    { key: 'datePublished', label: 'Date Published', type: 'date' },
    { key: 'imageUrl', label: 'Featured Image URL', type: 'text' },
  ],
};

const SCHEMA_BLANK_DATA = {
  LocalBusiness: { name: '', streetAddress: '', addressLocality: '', addressRegion: '', postalCode: '', telephone: '', priceRange: '' },
  FAQPage: { faqs: [{ question: '', answer: '' }] },
  BreadcrumbList: { crumbs: [{ name: 'Home', url: '' }, { name: '', url: '' }] },
  Product: { name: '', description: '', price: '', availability: 'InStock' },
  Organization: { name: '', logoUrl: '', socialLinks: '' },
  Article: { headline: '', authorName: '', datePublished: '', imageUrl: '' },
};
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
  const [pageOverrides, setPageOverrides] = useState({ heroImageUrl: '', authorName: '', sidebarBlurb: '', ctaHeading: '', ctaText: '' });
  const [suggestingBlurb, setSuggestingBlurb] = useState(false);
  const [updatingPreview, setUpdatingPreview] = useState(false);

  // Meta Rewriter State
  const [metaForm, setMetaForm] = useState({ pageUrl: '', currentTitle: '', currentMeta: '', targetKeyword: '' });
  const [metaResult, setMetaResult] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);

  // Topic Ideas State
  const [topicMonth, setTopicMonth] = useState(new Date().toISOString().slice(0, 7));
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [siteAnalyzed, setSiteAnalyzed] = useState(null);

  // Inline SOP panel State
  const [sopCollapsed, setSopCollapsed] = useState(false);

  // Schema State
  const [schemaType, setSchemaType] = useState('LocalBusiness');
  const [schemaData, setSchemaData] = useState(SCHEMA_BLANK_DATA.LocalBusiness);
  const [schemaFoundFields, setSchemaFoundFields] = useState([]);
  const [schemaSiteAnalyzed, setSchemaSiteAnalyzed] = useState(null);
  const [schemaResult, setSchemaResult] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaPrefilling, setSchemaPrefilling] = useState(false);

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
    setPageOverrides({ heroImageUrl: '', authorName: '', sidebarBlurb: '', ctaHeading: '', ctaText: '' });
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

  const handleLoadDraft = async (id) => {
    try {
      const res = await api.get(`/thedal/content/${activeClient.id}/${id}`);
      const c = res.content;
      setBlogResult({
        id: c.id,
        title: c.title,
        metaDescription: c.meta_description,
        slug: c.slug,
        content: c.body,
        fullPageHtml: c.fullPageHtml,
        jsonLd: c.jsonLd,
        wordCount: c.word_count,
        readingTime: `${Math.round((c.word_count || 800) / 200)} min read`,
        focusKeyword: c.target_keyword,
        secondaryKeywords: [],
        createdAt: c.created_at,
      });
      setPageOverrides({ heroImageUrl: '', authorName: '', sidebarBlurb: '', ctaHeading: '', ctaText: '' });
      toast.success('Draft loaded');
    } catch (err) {
      toast.error('Failed to load draft');
    }
  };

  const handleSuggestBlurb = async () => {
    if (!blogResult) return;
    setSuggestingBlurb(true);
    try {
      const res = await api.post(`/thedal/content/${activeClient.id}/suggest-sidebar-blurb`, { title: blogResult.title, keyword: blogResult.focusKeyword });
      setPageOverrides({ ...pageOverrides, sidebarBlurb: res.blurb });
      toast.success('AI suggestion added — edit it below if needed');
    } catch (err) {
      toast.error(err.message || 'Failed to get AI suggestion');
    } finally {
      setSuggestingBlurb(false);
    }
  };

  const handleUpdatePreview = async () => {
    if (!blogResult) return;
    setUpdatingPreview(true);
    try {
      const res = await api.post(`/thedal/content/${activeClient.id}/render-preview`, {
        title: blogResult.title,
        metaDescription: blogResult.metaDescription,
        leadParagraph: pageOverrides.sidebarBlurb || blogResult.metaDescription,
        bodyHtml: blogResult.content,
        slug: blogResult.slug,
        createdAt: blogResult.createdAt,
        overrides: pageOverrides,
      });
      setBlogResult({ ...blogResult, fullPageHtml: res.fullPageHtml, jsonLd: res.jsonLd });
      toast.success('Preview updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update preview');
    } finally {
      setUpdatingPreview(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!blogResult?.fullPageHtml) return;
    try {
      const zip = new JSZip();
      const styleMatch = blogResult.fullPageHtml.match(/<style>([\s\S]*?)<\/style>/);
      const css = styleMatch ? styleMatch[1].trim() : '';
      const html = blogResult.fullPageHtml
        .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="style.css">')
        .replace('</body>', '<script src="script.js"></script>\n</body>');
      zip.file('index.html', html);
      zip.file('style.css', css);
      zip.file('script.js', '// No JavaScript is required for this static page — the FAQ accordion uses native <details>/<summary>.\n// Add analytics or interactivity here if needed.\n');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blogResult.slug || 'blog-post'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded — index.html, style.css, script.js');
    } catch (err) {
      toast.error('Failed to build the ZIP file');
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
    setSiteAnalyzed(null);
    try {
      const res = await api.post(`/thedal/content/${activeClient.id}/topic-ideas`, { month: topicMonth, count: 8 });
      setTopics(res.ideas?.topics || []);
      setSiteAnalyzed(res.siteAnalyzed || null);
      toast.success(res.siteAnalyzed ? `Analyzed ${res.siteAnalyzed.pagesCrawled} live page(s) on ${res.siteAnalyzed.origin}` : 'Topic ideas generated!');
    } catch (err) {
      toast.error(err.message || 'Failed to fetch topic ideas');
    } finally {
      setTopicsLoading(false);
    }
  };

  const handleSelectSchemaType = (type) => {
    setSchemaType(type);
    setSchemaData(SCHEMA_BLANK_DATA[type]);
    setSchemaFoundFields([]);
    setSchemaSiteAnalyzed(null);
    setSchemaResult(null);
  };

  const handleAutoFillSchema = async () => {
    setSchemaPrefilling(true);
    try {
      const res = await api.post(`/thedal/content/${activeClient.id}/schema/prefill`, { schemaType });
      setSchemaData({ ...SCHEMA_BLANK_DATA[schemaType], ...res.data });
      setSchemaFoundFields(res.foundFields || []);
      setSchemaSiteAnalyzed(res.siteAnalyzed || null);
      toast.success(res.siteAnalyzed ? `Analyzed ${res.siteAnalyzed.pagesCrawled} live page(s) — filled ${res.foundFields?.length || 0} field(s) from real content` : 'Auto-fill attempted, but the site could not be reached');
    } catch (err) {
      toast.error(err.message || 'Auto-fill failed');
    } finally {
      setSchemaPrefilling(false);
    }
  };

  const handleGenerateSchema = async () => {
    setSchemaLoading(true);
    setSchemaResult(null);
    try {
      const res = await api.post(`/thedal/content/${activeClient.id}/schema`, { schemaType, data: schemaData });
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, fontFamily: "'Syne', sans-serif" }}>No Active Client Selected</h2><SopModal /></div>
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

      {/* Inline SOP panel — always visible on the page, not a popup */}
      {(() => {
        const activeSop = getSopForPath(TAB_SOP_KEYS[activeTab]);
        if (!activeSop) return null;
        return (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 24, overflow: 'hidden' }}>
            <div
              onClick={() => setSopCollapsed(c => !c)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: 'rgba(37,99,235,0.06)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{activeSop.icon}</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 1 }}>SOP Guide</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{activeSop.title}</div>
                </div>
              </div>
              {sopCollapsed ? <ChevronDown size={18} color={C.muted} /> : <ChevronUp size={18} color={C.muted} />}
            </div>
            {!sopCollapsed && (
              <div style={{ padding: '18px 20px' }}>
                <p style={{ fontSize: 13, color: '#c9d1d9', lineHeight: 1.6, margin: '0 0 18px' }}>{activeSop.overview}</p>

                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Step-by-Step Procedure</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 18 }}>
                  {activeSop.steps.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                        {s.step}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <ChevronRight size={12} color="#2563eb" />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f6fc' }}>{s.title}</span>
                        </div>
                        <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {activeSop.tips?.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>💡 Pro Tips</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {activeSop.tips.map((tip, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <CheckCircle2 size={13} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
                          <p style={{ fontSize: 12, color: '#c9d1d9', margin: 0, lineHeight: 1.5 }}>{tip}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })()}

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
                  {blogResult.fullPageHtml && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>Edit Page Details <span style={{ fontWeight: 500, color: C.muted }}>— these are placeholders by default; fill them in manually or ask AI, then update the preview</span></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: C.muted, marginBottom: 4 }}>Hero Image URL</label>
                          <input value={pageOverrides.heroImageUrl} onChange={e => setPageOverrides({ ...pageOverrides, heroImageUrl: e.target.value })} placeholder="https://... (paste an image URL)" style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: C.muted, marginBottom: 4 }}>Author Name</label>
                          <input value={pageOverrides.authorName} onChange={e => setPageOverrides({ ...pageOverrides, authorName: e.target.value })} placeholder={`${activeClient.business_name || activeClient.domain} Team (default)`} style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label style={{ fontSize: 11, color: C.muted }}>Sidebar "About" Blurb</label>
                          <button onClick={handleSuggestBlurb} disabled={suggestingBlurb} style={{ background: 'transparent', border: `1px solid ${C.accent}`, color: C.accent, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {suggestingBlurb ? <Loader2 size={10} className="spin" /> : <Sparkles size={10} />} AI Suggest
                          </button>
                        </div>
                        <textarea value={pageOverrides.sidebarBlurb} onChange={e => setPageOverrides({ ...pageOverrides, sidebarBlurb: e.target.value })} placeholder="Defaults to the lead paragraph — click AI Suggest for something written fresh for this post" rows={2} style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none', resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: C.muted, marginBottom: 4 }}>CTA Card Heading</label>
                          <input value={pageOverrides.ctaHeading} onChange={e => setPageOverrides({ ...pageOverrides, ctaHeading: e.target.value })} placeholder="Need help with this? (default)" style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: C.muted, marginBottom: 4 }}>CTA Card Text</label>
                          <input value={pageOverrides.ctaText} onChange={e => setPageOverrides({ ...pageOverrides, ctaText: e.target.value })} placeholder="Chat with us directly... (default)" style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none' }} />
                        </div>
                      </div>
                      <button onClick={handleUpdatePreview} disabled={updatingPreview} style={{ width: 'fit-content', background: C.accent, color: '#fff', border: 0, borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {updatingPreview ? <><Loader2 size={12} className="spin" /> Updating...</> : 'Update Preview'}
                      </button>
                    </div>
                  )}
                  {blogResult.fullPageHtml && (
                    <div style={{ background: '#0d1117', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>Live Preview — full page with meta tags &amp; JSON-LD included</span>
                        <button
                          onClick={handleDownloadZip}
                          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 0, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Download size={13} /> Download ZIP
                        </button>
                      </div>
                      <iframe
                        title="Blog preview"
                        srcDoc={blogResult.fullPageHtml}
                        style={{ width: '100%', height: 600, border: 'none', background: '#fff' }}
                        sandbox="allow-popups allow-popups-to-escape-sandbox"
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Body-only HTML (for pasting into an existing CMS):</span>
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
                    <div key={d.id} onClick={() => handleLoadDraft(d.id)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = C.accent} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                          {d.title || 'Untitled Draft'}
                        </div>
                        <select
                          value={d.status}
                          onClick={e => e.stopPropagation()}
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
                          <option value="draft" style={{ background: C.card, color: C.text }}>Draft</option>
                          <option value="scheduled" style={{ background: C.card, color: C.text }}>Scheduled</option>
                          <option value="published" style={{ background: C.card, color: C.text }}>Published</option>
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
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, width: 'fit-content', color: siteAnalyzed ? '#34d399' : '#fbbf24', background: siteAnalyzed ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)', border: `1px solid ${siteAnalyzed ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}` }}>
                  {siteAnalyzed ? `Grounded in ${siteAnalyzed.pagesCrawled} live page(s) crawled from ${siteAnalyzed.origin}` : "Site couldn't be reached — based on the stored business profile instead"}
                </div>
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
                      {t.basedOn && <p style={{ fontSize: 11, color: C.accent, margin: '6px 0 0' }}>Based on: {t.basedOn}</p>}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 12, fontSize: 12, color: C.muted }}>
                      <span style={{ textTransform: 'capitalize' }}>Type: {t.contentType}</span>
                      <span style={{ textTransform: 'capitalize' }}>Intent: {t.intent}</span>
                    </div>
                  </div>
                ))}
                </div>
              </>
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
                  onClick={() => handleSelectSchemaType(type)}
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

            {SCHEMA_TYPE_INFO[schemaType] && (
              <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#c9d1d9', lineHeight: 1.6 }}>
                <div><strong style={{ color: '#f8fafc' }}>What it is:</strong> {SCHEMA_TYPE_INFO[schemaType].what}</div>
                <div style={{ marginTop: 6 }}><strong style={{ color: '#f8fafc' }}>What it's for:</strong> {SCHEMA_TYPE_INFO[schemaType].use}</div>
              </div>
            )}

            {/* Option 1: auto-fill from the live site. Option 2: the form below stays editable/manual either way. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleAutoFillSchema}
                disabled={schemaPrefilling}
                style={{ background: 'transparent', border: `1px solid ${C.accent}`, color: C.accent, padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: schemaPrefilling ? 0.6 : 1 }}
              >
                {schemaPrefilling ? <><Loader2 size={14} className="spin" /> Analyzing site...</> : <><Globe size={14} /> Auto-fill from Website</>}
              </button>
              <span style={{ fontSize: 12, color: C.muted }}>or fill in the fields below manually</span>
            </div>

            {schemaSiteAnalyzed && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, width: 'fit-content', color: schemaFoundFields.length ? '#34d399' : '#fbbf24', background: schemaFoundFields.length ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)', border: `1px solid ${schemaFoundFields.length ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}` }}>
                {schemaFoundFields.length > 0
                  ? `Filled ${schemaFoundFields.length} field(s) from ${schemaSiteAnalyzed.pagesCrawled} real page(s) on ${schemaSiteAnalyzed.origin}`
                  : `Analyzed ${schemaSiteAnalyzed.pagesCrawled} page(s) on ${schemaSiteAnalyzed.origin} but found nothing usable — fill in manually`}
              </div>
            )}

            {/* Dynamic form for the selected schema type */}
            <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
              {SCHEMA_FIELDS[schemaType].map(field => {
                if (field.type === 'faqList') {
                  const faqs = schemaData.faqs || [];
                  return (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>{field.label}</label>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {faqs.map((f, i) => (
                          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, display: 'grid', gap: 8 }}>
                            <input value={f.question} onChange={e => { const next = [...faqs]; next[i] = { ...next[i], question: e.target.value }; setSchemaData({ ...schemaData, faqs: next }); }} placeholder="Question" style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none' }} />
                            <textarea value={f.answer} onChange={e => { const next = [...faqs]; next[i] = { ...next[i], answer: e.target.value }; setSchemaData({ ...schemaData, faqs: next }); }} placeholder="Answer" rows={2} style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical' }} />
                            {faqs.length > 1 && <button onClick={() => setSchemaData({ ...schemaData, faqs: faqs.filter((_, fi) => fi !== i) })} style={{ justifySelf: 'end', background: 'transparent', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>Remove</button>}
                          </div>
                        ))}
                        <button onClick={() => setSchemaData({ ...schemaData, faqs: [...faqs, { question: '', answer: '' }] })} style={{ width: 'fit-content', background: 'transparent', border: `1px dashed ${C.border}`, color: C.muted, padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>+ Add question</button>
                      </div>
                    </div>
                  );
                }
                if (field.type === 'breadcrumbList') {
                  const crumbs = schemaData.crumbs || [];
                  return (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>{field.label}</label>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {crumbs.map((c, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8 }}>
                            <input value={c.name} onChange={e => { const next = [...crumbs]; next[i] = { ...next[i], name: e.target.value }; setSchemaData({ ...schemaData, crumbs: next }); }} placeholder="Page name" style={{ boxSizing: 'border-box', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none' }} />
                            <input value={c.url} onChange={e => { const next = [...crumbs]; next[i] = { ...next[i], url: e.target.value }; setSchemaData({ ...schemaData, crumbs: next }); }} placeholder="https://..." style={{ boxSizing: 'border-box', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none' }} />
                            {crumbs.length > 1 && <button onClick={() => setSchemaData({ ...schemaData, crumbs: crumbs.filter((_, ci) => ci !== i) })} style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>✕</button>}
                          </div>
                        ))}
                        <button onClick={() => setSchemaData({ ...schemaData, crumbs: [...crumbs, { name: '', url: '' }] })} style={{ width: 'fit-content', background: 'transparent', border: `1px dashed ${C.border}`, color: C.muted, padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>+ Add page</button>
                      </div>
                    </div>
                  );
                }
                const found = schemaFoundFields.includes(field.key);
                return (
                  <div key={field.key}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
                      {field.label}
                      {found && <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '1px 6px', borderRadius: 4 }}>from site</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea value={schemaData[field.key] || ''} onChange={e => setSchemaData({ ...schemaData, [field.key]: e.target.value })} rows={3} style={{ width: '100%', boxSizing: 'border-box', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical' }} />
                    ) : field.type === 'select' ? (
                      <select value={schemaData[field.key] || field.options[0]} onChange={e => setSchemaData({ ...schemaData, [field.key]: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                        {field.options.map(o => <option key={o} value={o} style={{ background: C.card, color: C.text }}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={field.type === 'date' ? 'date' : 'text'} value={schemaData[field.key] || ''} onChange={e => setSchemaData({ ...schemaData, [field.key]: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 13, outline: 'none' }} />
                    )}
                  </div>
                );
              })}
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
