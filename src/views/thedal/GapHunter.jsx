import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { C } from '../../constants/theme.js';
import { Target, Search, Plus, Loader2, Sparkles, Zap, Crosshair, ArrowRight, Download, CheckSquare, Clock, Info, ShieldAlert, ChevronLeft, ChevronRight, Filter, ArrowUpDown } from 'lucide-react';
import { api } from '../../services/api.js';
import html2pdf from 'html2pdf.js';


export default function GapHunter() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clientDomain, setClientDomain] = useState('');
  const [competitorDomain, setCompetitorDomain] = useState('');
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modal, setModal] = useState({ isOpen: false, title: '', content: null });

  
  // Filters and Pagination State
  const [filterIntent, setFilterIntent] = useState('');
  const [filterKdMax, setFilterKdMax] = useState(100);
  const [filterVolMin, setFilterVolMin] = useState(0);
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [sortConfig, setSortConfig] = useState({ key: 'opportunity_score', direction: 'desc' });

  const handleScan = async () => {
    if (!clientDomain.trim()) {
      setError('Please enter your client domain. Competitor will auto-discover if left blank.');
      return;
    }
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(clientDomain.trim())) {
      setError('Please enter a valid client domain format (e.g. example.com)');
      return;
    }
    
    if (competitorDomain.trim() && !domainRegex.test(competitorDomain.trim())) {
      setError('Please enter a valid competitor domain format (e.g. competitor.com)');
      return;
    }

    if (competitorDomain.trim().toLowerCase() === clientDomain.trim().toLowerCase()) {
      setError('Client domain and competitor domain cannot be the same.');
      return;
    }
    
    setLoading(true);
    setError('');
    setData(null);
    setSelectedIds(new Set());
    setCurrentPage(1);
    
    try {
      const res = await api.post('/thedal/gaphunter/scan', { 
        clientDomain: clientDomain.trim(),
        competitorDomain: competitorDomain.trim() || undefined
      });
      if (res) {
        setData(res);
        if (!competitorDomain.trim()) {
          setCompetitorDomain(res.competitorDomain); // Update input with auto-discovered domain
        }
      }
    } catch (err) {
      console.error('Failed to run V2 AI Gap Analysis', err);
      setError(err.response?.data?.error || err.message || 'Failed to run analysis. Check API keys and server.');
    } finally {
      setLoading(false);
    }
  };

  const processedOpportunities = useMemo(() => {
    if (!data?.opportunities) return [];
    
    let result = [...data.opportunities];
    
    // Filtering
    if (filterIntent) {
      result = result.filter(o => o.intent === filterIntent);
    }
    result = result.filter(o => o.difficulty <= filterKdMax);
    result = result.filter(o => o.volume >= filterVolMin);
    result = result.filter(o => o.opportunity_score >= filterScoreMin);
    
    // Sorting
    result.sort((a, b) => {
      const valA = a[sortConfig.key] ?? (sortConfig.key === 'opportunity_score' ? 0 : '');
      const valB = b[sortConfig.key] ?? (sortConfig.key === 'opportunity_score' ? 0 : '');
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [data, filterIntent, filterKdMax, filterVolMin, filterScoreMin, sortConfig]);

  const totalPages = Math.ceil(processedOpportunities.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedOpportunities.slice(startIndex, startIndex + itemsPerPage);
  }, [processedOpportunities, currentPage, itemsPerPage]);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (newSet.size >= 50) {
        toast.error('Selection limit reached. Capped at 50 selected keywords.');
        return;
      }
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    const visibleIds = paginatedData.map(o => o.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    
    const newSet = new Set(selectedIds);
    if (allSelected) {
      visibleIds.forEach(id => newSet.delete(id));
    } else {
      for (const id of visibleIds) {
        if (newSet.size >= 50) {
          toast.error('Selection limit reached. Capped at 50 selected keywords.');
          break;
        }
        newSet.add(id);
      }
    }
    setSelectedIds(newSet);
  };

  const handleBulkTrack = async () => {
    try {
      const selectedKeywords = data.opportunities
        .filter(o => selectedIds.has(o.id))
        .map(o => o.keyword);
        
      await api.post('/thedal/gaphunter/track', {
        clientDomain: data.clientDomain,
        keywords: selectedKeywords
      });
      setModal({
        isOpen: true,
        title: 'Keywords Tracked',
        content: `Bulk tracked ${selectedKeywords.length} keywords to Keyword Tracking DB! Refresh the scan to see them greyed out.`
      });
      setSelectedIds(new Set());
      handleScan();
    } catch (err) {
      setModal({ isOpen: true, title: 'Error', content: 'Failed to track keywords: ' + err.message });
    }
  };

  const handleSingleTrack = async (keyword) => {
    try {
      await api.post('/thedal/gaphunter/track', {
        clientDomain: data.clientDomain,
        keywords: [keyword]
      });
      setModal({
        isOpen: true,
        title: 'Keyword Tracked',
        content: `Successfully tracked "${keyword}"! Refresh the scan to see it greyed out.`
      });
      handleScan();
    } catch (err) {
      setModal({ isOpen: true, title: 'Error', content: 'Failed to track keyword: ' + err.message });
    }
  };

  const handleSendToContentOS = (op) => {
    toast.success(`Redirecting to Content Factory for "${op.keyword}"`);
    navigate(`/thedal/content-factory?keyword=${encodeURIComponent(op.keyword)}`);
  };

  const handleExportPdf = () => {
    const element = document.getElementById('gap-hunter-report');
    if (!element) return;
    
    const opt = {
      margin:       0.5,
      filename:     `Gap_Hunter_Report_${data.clientDomain}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleRenamePillar = (id, currentPillar) => {
    const newPillar = prompt('Rename or reassign Pillar:', currentPillar);
    if (newPillar && newPillar.trim() !== '' && newPillar !== currentPillar) {
      const newData = { ...data };
      newData.opportunities = newData.opportunities.map(o => 
        o.id === id ? { ...o, pillar: newPillar.trim() } : o
      );
      setData(newData);
    }
  };

  return (
    <div style={{ padding: 40, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif", display: 'flex', alignItems: 'center', gap: 12 }}>
            AI Gap Hunter V2
          </h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
            Pre-connected to your campaigns. Auto-deduplicated. Ready to publish.
          </p>
        </div>
      </div>
      
      {/* Subtle Demo Banner */}
      <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '8px 16px', borderRadius: 8, color: '#f59e0b', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 30, fontWeight: 600 }}>
        <Info size={14} /> Showing simulated data for Demo Mode
      </div>

      {/* Target Setup Box */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 30, marginBottom: 30 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Crosshair size={18} color={C.accent} /> Configure Gap Analysis
        </h3>
        
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Your Client Domain *</label>
            <input 
              type="text" 
              placeholder="e.g., myclient.com" 
              value={clientDomain}
              onChange={e => setClientDomain(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: '#fff', fontSize: 15, padding: '12px 16px', borderRadius: 8, outline: 'none' }}
            />
          </div>
          
          <div style={{ color: C.muted, marginBottom: 16 }}><ArrowRight size={20} /></div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Competitor Domain (Optional)</label>
            <input 
              type="text" 
              placeholder="Leave blank to auto-discover" 
              value={competitorDomain}
              onChange={e => setCompetitorDomain(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: '#fff', fontSize: 15, padding: '12px 16px', borderRadius: 8, outline: 'none' }}
            />
          </div>

          <button 
            onClick={handleScan}
            disabled={loading || !clientDomain.trim()}
            style={{ background: `linear-gradient(135deg, ${C.accent}, #ea580c)`, color: '#fff', border: 'none', padding: '12px 30px', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: (loading || !clientDomain) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: (loading || !clientDomain) ? 0.7 : 1, height: 46 }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
            {loading ? 'AI Analyzing...' : 'Run Analysis'}
          </button>
        </div>
        
        {error && (
          <div style={{ marginTop: 20, padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', fontSize: 14 }}>
            {error}
          </div>
        )}
      </div>

      {loading && !data && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 300, alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={40} color="#ea580c" className="spin" style={{ marginBottom: 20 }} />
          <h2 style={{ color: '#fff', fontSize: 20 }}>Gemini is Applying Hard Filters & Intent Mapping...</h2>
          <p style={{ color: C.muted, fontSize: 14, maxWidth: 500, textAlign: 'center' }}>Scoring opportunities based on KD, Volume, and Intent match. Automatically deduplicating against your active Keyword Tracking campaigns.</p>
        </div>
      )}

      {data && !loading && (
        <div id="gap-hunter-report" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 30 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                Discovered Opportunities
                <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> Scanned: {new Date(data.scanned_at).toLocaleString()}
                </span>
              </h3>
              <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Showing {processedOpportunities.length} high-value gaps between {data.clientDomain} and {data.competitorDomain}</p>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              {selectedIds.size > 0 && (
                <button onClick={handleBulkTrack} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckSquare size={16} /> Bulk Track ({selectedIds.size})
                </button>
              )}
              <button onClick={handleExportPdf} style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0', border: `1px solid ${C.border}`, padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={16} /> Export PDF Report
              </button>
            </div>
          </div>
          
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 14, fontWeight: 600 }}>
              <Filter size={16} /> Filters:
            </div>
            
            <select 
              value={filterIntent} 
              onChange={e => { setFilterIntent(e.target.value); setCurrentPage(1); }}
              style={{ background: 'transparent', color: '#fff', border: `1px solid ${C.border}`, padding: '6px 12px', borderRadius: 6, fontSize: 13, outline: 'none' }}
            >
              <option value="" style={{color: '#000'}}>All Intents</option>
              <option value="Informational" style={{color: '#000'}}>Informational</option>
              <option value="Commercial" style={{color: '#000'}}>Commercial</option>
              <option value="Transactional" style={{color: '#000'}}>Transactional</option>
            </select>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Max KD:</span>
              <input type="number" value={filterKdMax} onChange={e => { setFilterKdMax(Number(e.target.value)); setCurrentPage(1); }} style={{ width: 60, background: 'transparent', border: `1px solid ${C.border}`, color: '#fff', padding: '6px', borderRadius: 6, fontSize: 13 }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Min Vol:</span>
              <input type="number" value={filterVolMin} onChange={e => { setFilterVolMin(Number(e.target.value)); setCurrentPage(1); }} style={{ width: 80, background: 'transparent', border: `1px solid ${C.border}`, color: '#fff', padding: '6px', borderRadius: 6, fontSize: 13 }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Min Score:</span>
              <input type="number" value={filterScoreMin} onChange={e => { setFilterScoreMin(Number(e.target.value)); setCurrentPage(1); }} style={{ width: 60, background: 'transparent', border: `1px solid ${C.border}`, color: '#fff', padding: '6px', borderRadius: 6, fontSize: 13 }} />
            </div>
          </div>
          
          {processedOpportunities.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted }}>
              <Search size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>No gaps found</div>
              <div style={{ fontSize: 14 }}>Try adjusting your filters or running a new scan.</div>
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: '16px 10px', width: 40 }}>
                      <input 
                        type="checkbox" 
                        onChange={toggleSelectAll} 
                        checked={paginatedData.length > 0 && paginatedData.every(o => selectedIds.has(o.id))} 
                      />
                    </th>
                    <th onClick={() => handleSort('opportunity_score')} style={{ cursor: 'pointer', padding: '16px 0', color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Opp Score <ArrowUpDown size={12} /></div>
                    </th>
                    <th onClick={() => handleSort('keyword')} style={{ cursor: 'pointer', padding: '16px 0', color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Keyword & Pillar <ArrowUpDown size={12} /></div>
                    </th>
                    <th onClick={() => handleSort('volume')} style={{ cursor: 'pointer', padding: '16px 0', color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Metrics <ArrowUpDown size={12} /></div>
                    </th>
                    <th style={{ padding: '16px 0', color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>AI Intent & Reason</th>
                    <th style={{ padding: '16px 0', color: C.muted, fontSize: 11, fontWeight: 600, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 1 }}>Action Bridge</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((op) => {
                    const isTracked = op.is_already_tracked;
                    
                    return (
                      <tr key={op.id} style={{ borderBottom: `1px solid ${C.border}55`, opacity: isTracked ? 0.4 : 1, transition: 'all 0.2s' }}>
                        <td style={{ padding: '20px 10px' }}>
                          <input type="checkbox" onChange={() => toggleSelect(op.id)} checked={selectedIds.has(op.id)} disabled={isTracked} />
                        </td>
                        
                        {/* Opportunity Score */}
                        <td style={{ padding: '20px 0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: op.opportunity_score > 75 ? '#22c55e' : op.opportunity_score > 50 ? '#eab308' : '#ef4444' }}>
                              {op.opportunity_score}
                            </div>
                            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', fontWeight: 600 }}>/ 100</div>
                          </div>
                        </td>

                        {/* Keyword & Pillar */}
                        <td style={{ padding: '20px 0' }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {op.keyword}
                            {isTracked && <span style={{ fontSize: 10, background: '#334155', color: '#94a3b8', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><ShieldAlert size={10} /> Already Targeting</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div 
                              onClick={() => handleRenamePillar(op.id, op.pillar)}
                              title="Click to reassign pillar"
                              style={{ cursor: 'pointer', fontSize: 12, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}
                            >
                              Pillar: {op.pillar}
                            </div>
                            {op.gap_type && (
                              <div style={{ fontSize: 10, color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)', padding: '2px 6px', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase' }}>
                                {op.gap_type}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Metrics */}
                        <td style={{ padding: '20px 0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ fontSize: 13, color: '#94a3b8' }}>Vol: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{op.volume.toLocaleString()}</span></div>
                            <div style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                              KD: <span style={{ padding: '2px 6px', borderRadius: 4, background: op.difficulty < 30 ? 'rgba(34,197,94,0.1)' : op.difficulty < 50 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)', color: op.difficulty < 30 ? '#22c55e' : op.difficulty < 50 ? '#eab308' : '#ef4444', fontWeight: 700 }}>{op.difficulty}</span>
                            </div>
                          </div>
                        </td>

                        {/* AI Intent & Reason */}
                        <td style={{ padding: '20px 0', maxWidth: 350 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, border: `1px solid ${C.border}`, padding: '2px 6px', borderRadius: 4, color: C.muted, textTransform: 'uppercase', fontWeight: 600 }}>{op.intent}</span>
                            <span title="AI confidence score that this keyword maps to the assigned intent." style={{ cursor: 'help', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderBottom: '1px dotted #94a3b8' }}>
                              Match: {op.intent_match_score}%
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, display: 'flex', gap: 6 }}>
                            <Sparkles size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                            <span>{op.reason}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '20px 0', textAlign: 'right' }}>
                          {!isTracked ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                              <button onClick={() => handleSingleTrack(op.keyword)} style={{ background: `rgba(59, 130, 246, 0.1)`, color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Plus size={14} /> Track
                              </button>
                              <button onClick={() => handleSendToContentOS(op)} style={{ background: C.accent, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Zap size={14} /> Send to Content OS
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                              <CheckSquare size={14} /> Active
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, color: C.muted }}>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedOpportunities.length)} of {processedOpportunities.length} entries
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: `1px solid ${C.border}`, padding: '6px 12px', borderRadius: 6, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: `1px solid ${C.border}`, padding: '6px 12px', borderRadius: 6, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Custom Modal */}
      {modal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 30, maxWidth: 500, width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: '0 0 16px 0' }}>{modal.title}</h3>
            <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              {modal.content}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setModal({ isOpen: false, title: '', content: null })}
                style={{ background: C.accent, color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
