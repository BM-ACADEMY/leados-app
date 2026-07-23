import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { C } from '../../constants/theme.js';
import { 
  Globe, Loader2, AlertTriangle, CheckCircle, 
  RefreshCw, X, ArrowUpRight, Check, Eye, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Citations() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [loadingClients, setLoadingClients] = useState(true);

  // Scan states
  const [scanData, setScanData] = useState(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [runningScan, setRunningScan] = useState(false);
  const [scanStep, setScanStep] = useState(''); // Searching Directories..., Comparing NAP..., Calculating Score...

  // Fix Panel state
  const [selectedResult, setSelectedResult] = useState(null);
  const [markingFixedId, setMarkingFixedId] = useState(null);

  // Fetch GMB clients
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('leados_token');
      const res = await axios.get(`${API_URL}/api/mafiya/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(res.data);
      if (res.data.length > 0) {
        setActiveClient(res.data[0]);
      }
    } catch (err) {
      console.error('[Citations] Fetch clients error:', err);
      toast.error('Failed to load businesses');
    } finally {
      setLoadingClients(false);
    }
  };

  // Fetch Citation Scan for Active Client
  const fetchCitationScan = async (clientId) => {
    if (!clientId) return;
    setLoadingScan(true);
    try {
      const token = localStorage.getItem('leados_token');
      const res = await axios.get(`${API_URL}/api/citations/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.scan) {
        setScanData(res.data);
      } else {
        setScanData(null);
      }
    } catch (err) {
      console.error('[Citations] Fetch scan error:', err);
      toast.error('Failed to load citation history');
    } finally {
      setLoadingScan(false);
    }
  };

  // Run Full Check
  const handleRunFullCheck = async () => {
    if (!activeClient) return;
    setRunningScan(true);
    setSelectedResult(null);
    
    // Simulate real-time progress steps for Phase 17
    const steps = [
      'Searching Directories...',
      'Comparing NAP...',
      'Calculating Score...'
    ];

    let stepIdx = 0;
    setScanStep(steps[stepIdx]);
    const stepInterval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setScanStep(steps[stepIdx]);
      }
    }, 2500);

    try {
      const token = localStorage.getItem('leados_token');
      const res = await axios.post(`${API_URL}/api/citations/run-check`, {
        businessId: activeClient.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      clearInterval(stepInterval);
      setScanStep('Completed');
      toast.success('Citation check completed successfully!');
      
      if (res.data.errors && res.data.errors.length > 0) {
        res.data.errors.forEach(errMsg => {
          toast(errMsg, { icon: '⚠️', duration: 7000 });
        });
      }
      
      // Fetch fresh data
      await fetchCitationScan(activeClient.id);
    } catch (err) {
      console.error('[Citations] Run check error:', err);
      toast.error(err.response?.data?.error || 'Failed to complete citation scan');
    } finally {
      clearInterval(stepInterval);
      setRunningScan(false);
      setScanStep('');
    }
  };

  // Mark Listing as Fixed
  const handleMarkFixed = async (resultId) => {
    setMarkingFixedId(resultId);
    try {
      const token = localStorage.getItem('leados_token');
      const res = await axios.post(`${API_URL}/api/citations/mark-fixed`, {
        resultId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success('Listing marked as matched & score updated!');
        setSelectedResult(null);
        // Refresh local scan state
        await fetchCitationScan(activeClient.id);
      }
    } catch (err) {
      console.error('[Citations] Mark fixed error:', err);
      toast.error('Failed to update listing status');
    } finally {
      setMarkingFixedId(null);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (activeClient) {
      fetchCitationScan(activeClient.id);
      setSelectedResult(null);
    }
  }, [activeClient]);

  if (loadingClients) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} className="animate-spin" style={{ color: C.accent, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>Loading businesses...</p>
        </div>
      </div>
    );
  }

  const clientName = activeClient?.display_name || activeClient?.business_name || 'GMB Profile';
  const masterPhone = activeClient?.phone_number || '';
  const masterWebsite = activeClient?.website_url || '';
  const masterAddress = activeClient ? `${activeClient.address || '123 Business Road'}, ${activeClient.city || 'Pondicherry'}, ${activeClient.state || 'Tamil Nadu'} ${activeClient.postal_code || '605001'}` : '';

  // Get difference fields for Selected Result
  const getDiscrepantFields = (resItem) => {
    const list = [];
    if (!resItem) return list;
    
    // Normalize comparison rules to display matching issues
    const normText = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normPhone = (p) => (p || '').replace(/\D/g, '').slice(-10);
    const normUrl = (u) => (u || '').toLowerCase().replace(/https?:\/\//g, '').replace(/www\./g, '').replace(/\/$/g, '').trim();

    if (normText(resItem.businessName) !== normText(activeClient.business_name)) {
      list.push({
        field: 'Business Name',
        directoryVal: resItem.businessName || '—',
        googleVal: activeClient.business_name,
        steps: 'Navigate to your listing partner dashboard or directory edit page, click "Edit Info", and align name exactly with GMB.'
      });
    }

    if (normPhone(resItem.phone) !== normPhone(activeClient.phone_number)) {
      list.push({
        field: 'Phone',
        directoryVal: resItem.phone || '—',
        googleVal: activeClient.phone_number,
        steps: 'Access listing details and update the primary phone number to match your GBP phone.'
      });
    }

    if (normUrl(resItem.website) !== normUrl(activeClient.website_url)) {
      list.push({
        field: 'Website',
        directoryVal: resItem.website || '—',
        googleVal: activeClient.website_url || '—',
        steps: 'Correct the website URL field on the profile settings of this directory.'
      });
    }

    if (normText(resItem.address) !== normText(masterAddress)) {
      list.push({
        field: 'Address',
        directoryVal: resItem.address || '—',
        googleVal: masterAddress,
        steps: 'Verify street name, building number, and pin code format matches your Google master address.'
      });
    }

    return list;
  };

  const currentDiscrepancies = selectedResult ? getDiscrepantFields(selectedResult) : [];

  return (
    <div className="p-mobile" style={{ padding: 26, overflowY: 'auto', height: '100%', background: C.bg, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400, background: 'radial-gradient(circle at 50% -20%, rgba(249,115,22,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header Section */}
        <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 26 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
              Citation <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(249,115,22,0.12)', color: C.accent, padding: '3px 8px', borderRadius: 20, marginLeft: 8 }}>NAP Audit</span>
            </h1>
            <p style={{ color: C.muted, fontSize: 12.5, marginTop: 5 }}>
              Monitor business listings across directories and maintain NAP consistency — <strong style={{ color: '#fff' }}>{clientName}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 500, justifyContent: 'flex-end', alignItems: 'center' }} className="flex-col-mobile">
            <select 
              value={activeClient ? activeClient.id : ''} 
              onChange={(e) => {
                const c = clients.find(cl => cl.id === parseInt(e.target.value));
                if (c) setActiveClient(c);
              }} 
              style={{ 
                background: C.card, 
                border: `1px solid ${C.border}`, 
                borderRadius: 10, 
                color: C.text, 
                padding: '10px 14px', 
                fontSize: 13, 
                outline: 'none', 
                cursor: 'pointer', 
                flex: 1,
                maxWidth: '280px',
                width: '100%',
                textOverflow: 'ellipsis'
              }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.display_name || c.business_name}</option>
              ))}
            </select>
            <button
              onClick={handleRunFullCheck}
              disabled={runningScan}
              style={{ 
                background: C.accent, 
                border: 'none', 
                borderRadius: 10, 
                padding: '10px 18px', 
                color: '#fff', 
                fontSize: 13, 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                transition: 'all 0.2s',
                opacity: runningScan ? 0.7 : 1,
                cursor: runningScan ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={e => !runningScan && (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => !runningScan && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {runningScan ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw size={15} />
                  Run Full Check
                </>
              )}
            </button>
          </div>
        </div>

        {/* Running Scan State */}
        {runningScan && (
          <div style={{ background: 'rgba(249,115,22,0.05)', border: `1px solid ${C.accent}33`, borderRadius: 14, padding: 24, marginBottom: 26, textAlign: 'center' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: C.accent, margin: '0 auto 12px auto' }} />
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Citation Audit in Progress</h3>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>
              Currently executing: <strong style={{ color: C.accent }}>{scanStep}</strong>
            </p>
            <div style={{ maxWidth: 300, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, margin: '0 auto', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: C.accent, 
                width: scanStep === 'Searching Directories...' ? '33%' : scanStep === 'Comparing NAP...' ? '66%' : scanStep === 'Calculating Score...' ? '90%' : '100%',
                transition: 'all 1s ease-in-out'
              }} />
            </div>
          </div>
        )}

        {/* Main Content Body */}
        {!runningScan && !loadingScan && !scanData && (
          /* Empty State - Phase 7 */
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '60px 24px', textAlign: 'center', marginTop: 30 }}>
            <div style={{ background: 'rgba(249,115,22,0.06)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: `1px solid ${C.border}` }}>
              <Globe size={28} color={C.accent} />
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 10 }}>No Citation Scan Found</h2>
            <p style={{ color: C.muted, fontSize: 13.5, maxWidth: 460, margin: '0 auto 24px auto', lineHeight: 1.6 }}>
              Run your first citation scan to discover business listings and verify NAP consistency.
            </p>
            <button
              onClick={handleRunFullCheck}
              style={{ background: C.accent, border: 'none', borderRadius: 10, padding: '12px 24px', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Run Full Check
            </button>
          </div>
        )}

        {loadingScan && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <Loader2 size={36} className="animate-spin" style={{ color: C.accent }} />
          </div>
        )}

        {!runningScan && !loadingScan && scanData && (
          <>
            {/* Summary Cards - Phase 4 */}
            <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 26 }}>
              
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 12.5, fontWeight: 600 }}>Citation Score</span>
                  <div style={{ background: 'rgba(16,185,129,0.1)', padding: 6, borderRadius: 8 }}>
                    <CheckCircle size={15} color={C.green} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                    {scanData.scan.score}%
                  </span>
                </div>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: scanData.scan.score > 80 ? C.green : scanData.scan.score > 50 ? C.accent : C.red, width: `${scanData.scan.score}%` }} />
                </div>
              </div>

              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 12.5, fontWeight: 600 }}>Mismatches</span>
                  <div style={{ background: 'rgba(239,68,68,0.1)', padding: 6, borderRadius: 8 }}>
                    <AlertTriangle size={15} color={C.red} />
                  </div>
                </div>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                  {scanData.scan.mismatched}
                </span>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Directories with incorrect details</p>
              </div>

              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 12.5, fontWeight: 600 }}>Missing Listings</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: 'rgba(249,115,22,0.1)', padding: '2px 6px', borderRadius: 4 }}>Alert</span>
                </div>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                  {scanData.scan.missing}
                </span>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Directories with no business listings</p>
              </div>

              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 12.5, fontWeight: 600 }}>Last Scan</span>
                  <Globe size={15} color={C.muted} />
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', display: 'block', margin: '4px 0' }}>
                  {new Date(scanData.scan.lastScan).toLocaleDateString()}
                </span>
                <span style={{ color: C.muted, fontSize: 12 }}>
                  {new Date(scanData.scan.lastScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

            </div>

            {/* Main Area: Status Table + Fix Panel */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }} className="flex-col-mobile">
              
              {/* Directory Status Table - Phase 5 */}
              <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }} className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '16px 20px', color: '#fff', fontSize: 12.5, fontWeight: 700 }}>Directory</th>
                      <th style={{ padding: '16px 20px', color: '#fff', fontSize: 12.5, fontWeight: 700 }}>Business Name</th>
                      <th style={{ padding: '16px 20px', color: '#fff', fontSize: 12.5, fontWeight: 700 }}>Phone</th>
                      <th style={{ padding: '16px 20px', color: '#fff', fontSize: 12.5, fontWeight: 700 }}>Address</th>
                      <th style={{ padding: '16px 20px', color: '#fff', fontSize: 12.5, fontWeight: 700 }}>Website</th>
                      <th style={{ padding: '16px 20px', color: '#fff', fontSize: 12.5, fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '16px 20px', color: '#fff', fontSize: 12.5, fontWeight: 700, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanData.results.map((resItem) => {
                      let statusBg = 'rgba(255,255,255,0.05)';
                      let statusColor = C.muted;
                      if (resItem.status === 'Match') {
                        statusBg = 'rgba(16,185,129,0.08)';
                        statusColor = C.green;
                      } else if (resItem.status === 'Mismatch') {
                        statusBg = 'rgba(239,68,68,0.08)';
                        statusColor = C.red;
                      } else if (resItem.status === 'Missing') {
                        statusBg = 'rgba(249,115,22,0.08)';
                        statusColor = C.accent;
                      }

                      return (
                        <tr key={resItem.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }} className="hover-row">
                          <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                            {resItem.directory}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 13, color: resItem.status === 'Missing' ? C.muted : C.text, maxWidth: 150, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {resItem.status === 'Missing' ? '—' : (resItem.businessName || '—')}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 13, color: resItem.status === 'Missing' ? C.muted : C.text }}>
                            {resItem.status === 'Missing' ? '—' : (resItem.phone || '—')}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 13, color: resItem.status === 'Missing' ? C.muted : C.text, maxWidth: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={resItem.address}>
                            {resItem.status === 'Missing' ? '—' : (resItem.address || '—')}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 13, color: resItem.status === 'Missing' ? C.muted : C.text, maxWidth: 120, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {resItem.status === 'Missing' ? '—' : (resItem.website || '—')}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              padding: '4px 10px', 
                              borderRadius: 20, 
                              fontSize: 11, 
                              fontWeight: 700, 
                              background: statusBg, 
                              color: statusColor 
                            }}>
                              {resItem.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              {resItem.status === 'Mismatch' && (
                                <button
                                  onClick={() => setSelectedResult(resItem)}
                                  style={{ background: 'rgba(249,115,22,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: C.accent, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Eye size={13} />
                                  View Fix
                                </button>
                              )}
                              
                              {resItem.listingUrl && (
                                <a
                                  href={resItem.listingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', color: C.text, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                                >
                                  Open
                                  <ArrowUpRight size={13} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Fix Panel - Phase 6 */}
              {selectedResult && (
                <div style={{ width: 340, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, position: 'relative' }} className="w-full-mobile">
                  
                  {/* Close button */}
                  <button 
                    onClick={() => setSelectedResult(null)}
                    style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}
                  >
                    <X size={18} />
                  </button>

                  <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12, fontFamily: "'Syne', sans-serif" }}>
                    Fix {selectedResult.directory} Listing
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {currentDiscrepancies.map((disc, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.red, background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                            {disc.field} Discrepancy
                          </span>
                        </div>

                        <div style={{ fontSize: 12, marginBottom: 6 }}>
                          <span style={{ color: C.muted }}>Directory:</span>
                          <div style={{ color: C.red, fontWeight: 600, marginTop: 2 }}>{disc.directoryVal}</div>
                        </div>

                        <div style={{ fontSize: 12, marginBottom: 10 }}>
                          <span style={{ color: C.muted }}>GBP Master:</span>
                          <div style={{ color: C.green, fontWeight: 600, marginTop: 2 }}>{disc.googleVal}</div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.01)', borderTop: `1px dashed ${C.border}`, padding: '8px 0 0 0', fontSize: 11.5, lineHeight: 1.5, color: C.text }}>
                          <strong style={{ color: C.accent, display: 'block', marginBottom: 2 }}>Action Step:</strong>
                          {disc.steps}
                        </div>

                      </div>
                    ))}

                    <button
                      onClick={() => handleMarkFixed(selectedResult.id)}
                      disabled={markingFixedId !== null}
                      style={{ 
                        background: C.green, 
                        border: 'none', 
                        borderRadius: 10, 
                        padding: '12px', 
                        color: '#fff', 
                        fontSize: 13, 
                        fontWeight: 700, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: 6,
                        cursor: markingFixedId !== null ? 'not-allowed' : 'pointer',
                        opacity: markingFixedId !== null ? 0.7 : 1
                      }}
                    >
                      {markingFixedId === selectedResult.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      Mark Fixed
                    </button>
                    
                  </div>

                </div>
              )}

            </div>
          </>
        )}

      </div>
    </div>
  );
}
