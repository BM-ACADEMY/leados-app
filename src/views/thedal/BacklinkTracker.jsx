import React, { useState, useEffect } from 'react';
import { C } from '../../constants/theme.js';
import { api } from '../../services/api.js';
import {
  Link as LinkIcon, Search, Globe, PieChart, Shield, ExternalLink, 
  Loader2, Clock, History, Download, Eye, Star, Activity, Plus
} from 'lucide-react';

// ── Metric Card Component ──────────────────────────────────────────────────
const MetricCard = ({ title, value, compValue, icon: Icon, color }) => (
  <div style={{
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 200,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  }}>
    <div style={{
      width: 48,
      height: 48,
      borderRadius: 12,
      background: `${color}15`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
      <Icon size={24} color={color} />
    </div>
    <div>
      <p style={{ margin: 0, fontSize: 13, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
        <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f8fafc' }}>{value}</h3>
        {compValue !== undefined && (
          <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>vs <span style={{ color: '#fff'}}>{compValue}</span></span>
        )}
      </div>
    </div>
  </div>
);

// ── Main Page Component ─────────────────────────────────────────────────────
export default function BacklinkTracker() {
  const [domain, setDomain] = useState('');
  const [competitor, setCompetitor] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [compData, setCompData] = useState(null);
  const [history, setHistory] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('primary'); // 'primary' or 'competitor'
  const [sidebarTab, setSidebarTab] = useState('history'); // 'history' or 'tracked'
  const [isTracking, setIsTracking] = useState(false);
  
  const itemsPerPage = 10;

  const abortControllerRef = React.useRef(null);

  useEffect(() => {
    fetchHistory();
    fetchTracked();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (data && tracked.some(t => t.domain === data.domain)) {
      setIsTracking(true);
    } else {
      setIsTracking(false);
    }
  }, [data, tracked]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/thedal/backlinks/history');
      if (res.history) setHistory(res.history);
    } catch (err) { console.error(err); }
  };

  const fetchTracked = async () => {
    try {
      const res = await api.get('/thedal/backlinks/tracked');
      if (res.tracked) setTracked(res.tracked);
    } catch (err) { console.error(err); }
  };

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    if (!domain) return;

    const clean = (url) => url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
    const cleanedDomain = clean(domain);
    const cleanedComp = competitor ? clean(competitor) : null;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);
    setData(null);
    setCompData(null);
    setActiveTab('primary');

    try {
      const p1 = api.post('/thedal/backlinks/scan', { domain: cleanedDomain }, { signal });
      const p2 = cleanedComp ? api.post('/thedal/backlinks/scan', { domain: cleanedComp }, { signal }) : Promise.resolve(null);
      
      const [res1, res2] = await Promise.all([p1, p2]);
      
      setData(res1);
      if (res2) setCompData(res2);
      
      setCurrentPage(1);
      fetchHistory(); 
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.response?.data?.error || err.message || 'Failed to analyze backlinks.');
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  };

  const toggleTracking = async () => {
    if (!data) return;
    try {
      const res = await api.post('/thedal/backlinks/track', { domain: data.domain, metrics: data.metrics });
      setIsTracking(res.tracking);
      fetchTracked();
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    const activeData = activeTab === 'primary' ? data : compData;
    if (!activeData || !activeData.links) return;

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Source URL', 'Source Title', 'Anchor Text', 'Type', 'DR', 'Status', 'First Seen'];
    const rows = activeData.links.map(l => [
      escapeCSV(l.sourceUrl), 
      escapeCSV(l.sourceTitle), 
      escapeCSV(l.anchorText), 
      escapeCSV(l.type), 
      escapeCSV(l.dr), 
      escapeCSV(l.status), 
      escapeCSV(l.firstSeen)
    ].join(','));
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeData.domain}_backlinks.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadFromHistory = (item) => {
    setDomain(item.domain);
    setCompetitor('');
    setCompData(null);
    setData({ domain: item.domain, metrics: item.metrics, links: item.links || [], scanned_at: item.scanned_at || item.added_at });
    setCurrentPage(1);
    setError(null);
    setActiveTab('primary');
  };

  const activeLinks = (activeTab === 'primary' ? data?.links : compData?.links) || [];
  const activeMetrics = activeTab === 'primary' ? data?.metrics : compData?.metrics;
  const compMetrics = activeTab === 'primary' ? compData?.metrics : data?.metrics;

  return (
    <div style={{ padding: '30px 40px', color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>
      
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc', margin: 0, fontFamily: "'Syne', sans-serif", display: 'flex', alignItems: 'center', gap: 12 }}>
            <LinkIcon size={32} color={C.accent} />
            Backlink Tracker
          </h1>
          <p style={{ color: C.muted, fontSize: 15, marginTop: 8, maxWidth: 600, lineHeight: 1.5 }}>
            Discover who is linking to your site. Analyze referring domains, compare against competitors, and monitor your link profile.
          </p>
        </div>
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────────── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px 30px', marginBottom: 30, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: 250 }}>
            <Globe size={20} color={C.muted} style={{ position: 'absolute', left: 16, top: 18 }} />
            <input
              type="text"
              placeholder="Your Domain (e.g. apple.com)"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              disabled={loading}
              style={{
                width: '100%', padding: '16px 20px 16px 48px',
                background: 'rgba(15, 23, 42, 0.4)', border: `1px solid ${C.border}`,
                borderRadius: 12, color: '#f8fafc', fontSize: 16, outline: 'none'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', color: C.muted, fontWeight: 600 }}>VS</div>

          <div style={{ flex: 1, position: 'relative', minWidth: 250 }}>
            <Globe size={20} color={C.muted} style={{ position: 'absolute', left: 16, top: 18 }} />
            <input
              type="text"
              placeholder="Competitor Domain (Optional)"
              value={competitor}
              onChange={e => setCompetitor(e.target.value)}
              disabled={loading}
              style={{
                width: '100%', padding: '16px 20px 16px 48px',
                background: 'rgba(15, 23, 42, 0.4)', border: `1px solid ${C.border}`,
                borderRadius: 12, color: '#f8fafc', fontSize: 16, outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !domain}
            style={{
              padding: '0 32px', background: loading ? 'rgba(249, 115, 22, 0.5)' : C.accent,
              color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16,
              cursor: loading || !domain ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 10
            }}
          >
            {loading ? <Loader2 size={20} className="spin" /> : <Search size={20} />}
            {loading ? 'Scanning...' : 'Analyze'}
          </button>
        </form>
        {error && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 14 }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Results Area ────────────────────────────────────────────────── */}
      {data && !loading && (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
          
          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => { setActiveTab('primary'); setCurrentPage(1); }}
                style={{ 
                  padding: '10px 20px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: activeTab === 'primary' ? C.accent : C.surface,
                  color: activeTab === 'primary' ? '#fff' : C.muted
                }}>
                {data.domain}
              </button>
              {compData && (
                <button 
                  onClick={() => { setActiveTab('competitor'); setCurrentPage(1); }}
                  style={{ 
                    padding: '10px 20px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: activeTab === 'competitor' ? '#8b5cf6' : C.surface,
                    color: activeTab === 'competitor' ? '#fff' : C.muted
                  }}>
                  {compData.domain}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={toggleTracking} style={{ 
                padding: '10px 16px', borderRadius: 8, border: `1px solid ${isTracking ? '#10b981' : C.border}`,
                background: isTracking ? 'rgba(16, 185, 129, 0.1)' : C.surface,
                color: isTracking ? '#34d399' : '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600
              }}>
                <Eye size={16} /> {isTracking ? 'Monitoring Active' : 'Track Domain'}
              </button>
              <button onClick={exportCSV} style={{ 
                padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface,
                color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600
              }}>
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {/* Metrics */}
          {activeMetrics && (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 30 }}>
              <MetricCard title="Total Backlinks" value={activeMetrics.totalBacklinks?.toLocaleString()} compValue={compMetrics?.totalBacklinks?.toLocaleString()} icon={LinkIcon} color="#3b82f6" />
              <MetricCard title="Referring Domains" value={activeMetrics.referringDomains?.toLocaleString()} compValue={compMetrics?.referringDomains?.toLocaleString()} icon={Globe} color="#8b5cf6" />
              <MetricCard title="Dofollow Ratio" value={`${activeMetrics.dofollowRatio}%`} compValue={compMetrics ? `${compMetrics.dofollowRatio}%` : undefined} icon={PieChart} color="#10b981" />
              <MetricCard title="Domain Authority" value={activeMetrics.domainAuthority} compValue={compMetrics?.domainAuthority} icon={Shield} color="#f59e0b" />
            </div>
          )}

          {/* Links Table */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>Discovered Backlinks</h2>
              <span style={{ fontSize: 13, color: C.muted, background: `${C.border}`, padding: '4px 10px', borderRadius: 20 }}>
                Showing {activeLinks.length} sample results
              </span>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
                    <th style={{ padding: '16px 24px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Source Page</th>
                    <th style={{ padding: '16px 24px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Anchor Text</th>
                    <th style={{ padding: '16px 24px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Type</th>
                    <th style={{ padding: '16px 24px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>DR</th>
                    <th style={{ padding: '16px 24px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLinks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((link, idx) => {
                    const clampedDr = Math.max(0, Math.min(100, Number(link.dr) || 0));
                    return (
                      <tr key={link.id || idx} style={{ borderTop: `1px solid ${C.border}`, background: idx % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.2)' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: 14 }}>{link.sourceTitle}</span>
                            <a href={link.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {link.sourceUrl} <ExternalLink size={12} />
                            </a>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', color: '#cbd5e1', fontSize: 14, fontWeight: 500 }}>{link.anchorText}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: link.type === 'Dofollow' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: link.type === 'Dofollow' ? '#34d399' : '#94a3b8' }}>
                            {link.type}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#f8fafc', fontWeight: 700 }}>{clampedDr}</span>
                            <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${clampedDr}%`, height: '100%', background: clampedDr > 80 ? '#10b981' : clampedDr > 50 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: link.status === 'Active' ? '#34d399' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: link.status === 'Active' ? '#10b981' : '#ef4444' }} />
                            {link.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {activeLinks.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '40px 0', textAlign: 'center', color: C.muted }}>No backlinks found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {activeLinks.length > itemsPerPage && (
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: C.muted, fontSize: 13 }}>
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, activeLinks.length)} to {Math.min(currentPage * itemsPerPage, activeLinks.length)} of {activeLinks.length} results
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '6px 12px', background: currentPage === 1 ? 'rgba(15,23,42,0.4)' : C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: currentPage === 1 ? C.muted : '#f8fafc', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
                  <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(activeLinks.length / itemsPerPage), p + 1))} disabled={currentPage >= Math.ceil(activeLinks.length / itemsPerPage)} style={{ padding: '6px 12px', background: currentPage >= Math.ceil(activeLinks.length / itemsPerPage) ? 'rgba(15,23,42,0.4)' : C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: currentPage >= Math.ceil(activeLinks.length / itemsPerPage) ? C.muted : '#f8fafc', cursor: currentPage >= Math.ceil(activeLinks.length / itemsPerPage) ? 'not-allowed' : 'pointer' }}>Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Empty State / Sidebars ─────────────────────────────────────── */}
      {!data && !loading && (
        <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, padding: 60, background: 'rgba(15,23,42,0.3)', borderRadius: 16, border: `1px dashed ${C.border}`, textAlign: 'center' }}>
            <Activity size={48} color={C.accent} style={{ opacity: 0.5, marginBottom: 20 }} />
            <h3 style={{ margin: '0 0 10px', fontSize: 24, color: '#f8fafc' }}>Domain Intelligence</h3>
            <p style={{ color: C.muted, margin: 0, fontSize: 16, lineHeight: 1.6, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
              Enter a website URL above to discover its backlink profile. You can optionally add a competitor domain to compare metrics side-by-side.
            </p>
          </div>

          <div style={{ width: 350, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
              <button onClick={() => setSidebarTab('history')} style={{ flex: 1, padding: '16px 0', border: 'none', background: sidebarTab === 'history' ? 'rgba(15,23,42,0.4)' : 'transparent', color: sidebarTab === 'history' ? '#f8fafc' : C.muted, fontWeight: 600, cursor: 'pointer', borderBottom: sidebarTab === 'history' ? `2px solid ${C.accent}` : '2px solid transparent' }}>
                Recent Scans
              </button>
              <button onClick={() => setSidebarTab('tracked')} style={{ flex: 1, padding: '16px 0', border: 'none', background: sidebarTab === 'tracked' ? 'rgba(15,23,42,0.4)' : 'transparent', color: sidebarTab === 'tracked' ? '#f8fafc' : C.muted, fontWeight: 600, cursor: 'pointer', borderBottom: sidebarTab === 'tracked' ? `2px solid #10b981` : '2px solid transparent' }}>
                Monitored
              </button>
            </div>
            
            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {sidebarTab === 'history' && history.map((h, i) => (
                <div key={h.id} onClick={() => loadFromHistory(h)} style={{ padding: '16px 20px', borderBottom: i === history.length - 1 ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{h.domain}</span>
                    <span style={{ fontSize: 12, color: C.accent }}>{h.metrics?.totalBacklinks?.toLocaleString()} links</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted }}>
                    <Clock size={12} /> {new Date(h.scanned_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              
              {sidebarTab === 'tracked' && tracked.map((t, i) => (
                <div key={t.id} onClick={() => loadFromHistory(t)} style={{ padding: '16px 20px', borderBottom: i === tracked.length - 1 ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={14} color="#10b981" /> {t.domain}</span>
                    <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '2px 6px', borderRadius: 10 }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                    DA: {t.metrics?.domainAuthority} • Links: {t.metrics?.totalBacklinks?.toLocaleString()}
                  </div>
                </div>
              ))}

              {sidebarTab === 'history' && history.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: C.muted }}>No recent scans.</div>}
              {sidebarTab === 'tracked' && tracked.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: C.muted }}>No domains monitored yet.</div>}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
