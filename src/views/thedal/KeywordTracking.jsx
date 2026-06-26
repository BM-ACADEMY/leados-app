import React, { useState, useEffect } from 'react';
import { C } from '../../constants/theme.js';
import { Loader2, TrendingUp, TrendingDown, Minus, RefreshCw, Trash2, Plus, Globe, Type } from 'lucide-react';
import { api } from '../../services/api.js';

export default function KeywordTracking() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [selectedTips, setSelectedTips] = useState(null);
  
  // Form State
  const [newKeyword, setNewKeyword] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [formError, setFormError] = useState('');
  
  // Table State
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Set to 5 for easier testing with smaller datasets

  const fetchData = async () => {
    try {
      const res = await api.get('/thedal/keywordtracking');
      if (res && res.items) {
        setData(res.items);
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!newKeyword.trim() || !newUrl.trim()) {
      setFormError('Both Keyword and Target URL are required.');
      return;
    }

    // Duplicate keyword and url check
    const isDuplicate = data.some(item => 
      item.keyword.toLowerCase().trim() === newKeyword.toLowerCase().trim() && 
      item.targetUrl.toLowerCase().trim() === newUrl.toLowerCase().trim()
    );
    if (isDuplicate) {
      setFormError('This keyword and URL combination is already tracked.');
      return;
    }

    // URL regex check
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
    if (!urlPattern.test(newUrl.trim())) {
      setFormError('Please enter a valid URL (e.g. https://yourdomain.com).');
      return;
    }

    setFormError('');
    setAdding(true);
    try {
      await api.post('/thedal/keywordtracking', { keyword: newKeyword, targetUrl: newUrl });
      setNewKeyword('');
      setNewUrl('');
      await fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to add keyword.');
    } finally {
      setAdding(false);
    }
  };

  const handleRefresh = async (id) => {
    if (refreshingId !== null) return;
    setRefreshingId(id);
    try {
      await api.post(`/thedal/keywordtracking/refresh/${id}`);
      await fetchData();
    } catch (err) {
      console.error('Failed to refresh', err);
    } finally {
      setRefreshingId(null);
    }
  };


  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to stop tracking this keyword?')) return;
    try {
      await api.delete(`/thedal/keywordtracking/${id}`);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const getTrendIcon = (current, previous) => {
    if (current === null || previous === null) return <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Minus size={16} /></span>;
    if (current < previous) return <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={16} /> ⬆️ +{previous - current}</span>;
    if (current > previous) return <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}><TrendingDown size={16} /> ⬇️ -{current - previous}</span>;
    return <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Minus size={16} /> ➡️ 0</span>;
  };

  const getRankBadgeStyle = (rank) => {
    if (rank === null) return { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' };
    if (rank <= 3) return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' }; // Green
    if (rank <= 10) return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' }; // Yellow
    return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' }; // Red
  };

  const filteredData = data.filter(item => 
    item.targetUrl.toLowerCase().includes(filterText.toLowerCase()) || 
    item.keyword.toLowerCase().includes(filterText.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.background }}>
        <Loader2 size={32} color={C.accent} className="spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: 40, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif" }}>Keyword Map</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Track your SERP rankings and map keywords to target URLs.</p>
        </div>
      </div>

      {/* Add Keyword Form */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 30, marginBottom: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 20px 0' }}>Add Keyword</h3>
        
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', height: 46, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{ background: '#3b82f6', width: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Type size={20} color="#fff" /></div>
            <input 
              type="text" 
              placeholder="Target Keyword (e.g., b2b marketplace)"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              style={{ flex: 1, background: '#060c17', border: 'none', padding: '0 16px', color: '#fff', fontSize: 15, outline: 'none' }}
            />
          </div>

          <div style={{ flex: 1, display: 'flex', height: 46, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{ background: '#8b5cf6', width: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Globe size={20} color="#fff" /></div>
            <input 
              type="text" 
              placeholder="Target URL (e.g., https://yourdomain.com)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              style={{ flex: 1, background: '#060c17', border: 'none', padding: '0 16px', color: '#fff', fontSize: 15, outline: 'none' }}
            />
          </div>

          <button 
            onClick={handleAdd}
            disabled={adding}
            style={{ height: 46, background: '#3b82f6', border: 'none', padding: '0 24px', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: adding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: adding ? 0.7 : 1 }}
          >
            {adding ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} 
            Add Keyword
          </button>
        </div>
        {formError && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{formError}</div>}
      </div>

      {/* Data Table Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ width: 320, display: 'flex', alignItems: 'center', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px' }}>
          <Globe size={16} color={C.muted} />
          <input 
            type="text" 
            placeholder="Filter by website URL or keyword..."
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: '100%', background: 'transparent', border: 'none', padding: '12px 10px', color: '#fff', fontSize: 14, outline: 'none' }}
          />
        </div>
      </div>

      {/* Data Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Keyword</th>
              <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Target URL</th>
              <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Current Rank</th>
              <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Trend</th>
              <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? paginatedData.map((item) => {
              const rankBadge = getRankBadgeStyle(item.currentRank);
              return (
              <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}55`, transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                <td style={{ padding: '20px', fontSize: 15, color: '#fff', fontWeight: 600 }}>{item.keyword}</td>
                <td style={{ padding: '20px', fontSize: 14, color: '#93c5fd' }}>
                  <a href={item.targetUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{item.targetUrl}</a>
                </td>
                <td style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, height: 36, padding: '0 8px', borderRadius: '18px', background: rankBadge.bg, color: rankBadge.color, fontWeight: 700, fontSize: 15, border: `1px solid ${rankBadge.border}` }}>
                    {item.currentRank !== null ? item.currentRank : 'N/A'}
                  </div>
                  {(item.currentRank === null || item.currentRank > 10) && (
                    <div style={{ marginTop: 8 }}>
                      <button 
                        onClick={() => setSelectedTips(item)}
                        style={{ background: 'transparent', border: 'none', color: '#a855f7', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        How to improve?
                      </button>
                    </div>
                  )}
                </td>
                <td style={{ padding: '20px', textAlign: 'center', fontWeight: 600 }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {getTrendIcon(item.currentRank, item.previousRank)}
                  </div>
                </td>
                <td style={{ padding: '20px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button 
                      onClick={() => handleRefresh(item.id)}
                      disabled={refreshingId !== null}
                      style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '8px', borderRadius: 6, color: '#3b82f6', cursor: refreshingId !== null ? 'wait' : 'pointer', opacity: refreshingId !== null ? 0.6 : 1 }}
                      title="Refresh Rank"
                    >
                      <RefreshCw size={16} className={refreshingId === item.id ? 'spin' : ''} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                    Last Checked: {item.lastChecked ? new Date(item.lastChecked).toLocaleString() : 'Never'}
                  </div>
                </td>
              </tr>
            )}) : (
              <tr><td colSpan={5} style={{ padding: '60px 0', textAlign: 'center', color: C.muted, fontSize: 15 }}>{filterText ? 'No keywords match your search.' : 'No keywords tracked yet. Start adding keywords to monitor your rankings!'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '0 10px' }}>
          <div style={{ color: C.muted, fontSize: 14 }}>
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '8px 16px', background: currentPage === 1 ? 'rgba(255,255,255,0.02)' : C.surface, border: `1px solid ${C.border}`, color: currentPage === 1 ? C.muted : '#fff', borderRadius: 6, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500 }}
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: '#93c5fd', fontSize: 14, fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '8px 16px', background: currentPage === totalPages ? 'rgba(255,255,255,0.02)' : C.surface, border: `1px solid ${C.border}`, color: currentPage === totalPages ? C.muted : '#fff', borderRadius: 6, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500 }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* SEO Tips Modal */}
      {selectedTips && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 30, width: '100%', maxWidth: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>How to Rank for "{selectedTips.keyword}"</h3>
              <button onClick={() => setSelectedTips(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 24 }}>&times;</button>
            </div>
            
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              Your current rank is <strong>{selectedTips.currentRank || 'N/A'}</strong>. To push this URL into the Top 10 results, follow this checklist:
            </p>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 10 }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <h4 style={{ color: '#3b82f6', margin: '0 0 8px 0', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>🧠 1. Search Intent & RankBrain AI</h4>
                <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  Google's RankBrain algorithm doesn't just look for keywords; it measures <strong>user satisfaction</strong>. If someone searches for <code style={{ color: '#93c5fd' }}>{selectedTips.keyword}</code>, what do they actually want? A service page? A blog post? Pricing? Ensure your page exactly matches the user's true intent, or Google will drop your rank.
                </p>
              </div>

              <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <h4 style={{ color: '#8b5cf6', margin: '0 0 8px 0', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>🤖 2. Semantic SEO (BERT Algorithm)</h4>
                <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  Google uses Natural Language Processing (NLP) to understand context. Don't just stuff the exact keyword. You must include <strong>LSI (Latent Semantic Indexing) keywords</strong>. For example, if ranking for "digital marketing", Google actively scans your page for related entities like "SEO", "PPC", "ROI", and "social media campaigns".
                </p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <h4 style={{ color: '#10b981', margin: '0 0 8px 0', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>🛡️ 3. E-E-A-T (Trust & Authority)</h4>
                <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  Google strictly filters sites based on <strong>Experience, Expertise, Authoritativeness, and Trustworthiness</strong>. To prove this to the algorithm, your page needs clear author bios, physical business addresses, an easy-to-find privacy policy, and most importantly, high-quality backlinks from other trusted websites pointing to this exact URL.
                </p>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <h4 style={{ color: '#f59e0b', margin: '0 0 8px 0', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>⚡ 4. Core Web Vitals</h4>
                <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  Google's crawler penalizes slow sites. Your page must pass the Core Web Vitals test: <strong>LCP</strong> (main content must load under 2.5s), <strong>CLS</strong> (layout shouldn't shift as it loads), and <strong>INP</strong> (buttons must respond instantly). Compress your images and use efficient caching.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 30, textAlign: 'right' }}>
              <button 
                onClick={() => setSelectedTips(null)}
                style={{ background: '#3b82f6', border: 'none', padding: '10px 20px', borderRadius: 6, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
