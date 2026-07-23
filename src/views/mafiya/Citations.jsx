import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io as socketIO } from 'socket.io-client';
import { C } from '../../constants/theme.js';
import {
  Globe, Loader2, AlertTriangle, CheckCircle,
  RefreshCw, X, ArrowUpRight, Check, Eye, HelpCircle,
  CheckCircle2, Clock, Shield, Database, Zap, Bug, Code, ExternalLink, Terminal, Wrench
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

  // Real-Time Progress & Debug States
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState('');
  const [processedCount, setProcessedCount] = useState(0);
  const [totalDirsCount, setTotalDirsCount] = useState(8);
  const [directoryStatuses, setDirectoryStatuses] = useState([]);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [debugData, setDebugData] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Fix Panel state
  const [selectedResult, setSelectedResult] = useState(null);
  const [markingFixedId, setMarkingFixedId] = useState(null);

  // Socket.io Real-Time Progress & Debug Listener
  useEffect(() => {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const SOCKET_URL = isLocalDev ? window.location.origin : (import.meta.env.VITE_API_URL || 'https://leados-api.abmgroups.org');

    const socket = socketIO(SOCKET_URL, {
      transports: ['polling', 'websocket'],
    });

    socket.on('connect', () => {
      console.log('[Socket.io] Citation progress listener connected:', socket.id);
    });

    socket.on('citation_progress', (data) => {
      if (activeClient && data.clientId === activeClient.id) {
        if (data.progress !== undefined) setScanProgress(data.progress);
        if (data.step) setScanStep(data.step);
        if (data.directoriesProcessed !== undefined) setProcessedCount(data.directoriesProcessed);
        if (data.totalDirectories !== undefined) setTotalDirsCount(data.totalDirectories);
        if (data.directoryStatuses) setDirectoryStatuses(data.directoryStatuses);
        if (data.summary) setCompletedSummary(data.summary);
        if (data.debugData) setDebugData(data.debugData);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeClient]);

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
        if (res.data.summary) setCompletedSummary(res.data.summary);
        if (res.data.debugData) setDebugData(res.data.debugData);
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
  const handleRunFullCheck = async (forceRefresh = false) => {
    if (!activeClient) return;
    setRunningScan(true);
    setSelectedResult(null);
    setScanProgress(5);
    setScanStep('Loading Client Details...');
    setProcessedCount(0);
    setCompletedSummary(null);

    try {
      const token = localStorage.getItem('leados_token');
      const res = await axios.post(`${API_URL}/api/citations/run-check`, {
        businessId: activeClient.id,
        forceRefresh
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setScanProgress(100);
      setScanStep('Completed');
      toast.success(forceRefresh ? 'Refreshed Citation Audit successfully!' : 'Citation Audit completed!');

      if (res.data && res.data.summary) setCompletedSummary(res.data.summary);
      if (res.data && res.data.debugData) setDebugData(res.data.debugData);

      // Fetch fresh data
      await fetchCitationScan(activeClient.id);
    } catch (err) {
      console.error('[Citations] Run check error:', err);
      toast.error(err.response?.data?.error || 'Failed to complete citation scan');
    } finally {
      setRunningScan(false);
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
        toast.success('Listing marked as Verified & Score Updated!');
        setSelectedResult(null);
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
  const masterAddress = activeClient?.business_address || (activeClient ? `${activeClient.address || 'Pondicherry'}, ${activeClient.city || 'Pondicherry'}` : '');

  // Discrepant fields
  const getDiscrepantFields = (resItem) => {
    const list = [];
    if (!resItem) return list;

    const normText = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normPhone = (p) => (p || '').replace(/\D/g, '').slice(-10);

    if (normText(resItem.businessName) !== normText(activeClient.business_name)) {
      list.push({
        field: 'Business Name',
        directoryVal: resItem.businessName || '—',
        googleVal: activeClient.business_name,
        steps: 'Access directory portal and update the listing title to match your GMB name.'
      });
    }

    if (normPhone(resItem.phone) !== normPhone(activeClient.phone_number)) {
      list.push({
        field: 'Phone',
        directoryVal: resItem.phone || '—',
        googleVal: activeClient.phone_number,
        steps: 'Update phone number on listing to align with your master GBP contact.'
      });
    }

    if (normText(resItem.address) !== normText(masterAddress)) {
      list.push({
        field: 'Address',
        directoryVal: resItem.address || '—',
        googleVal: masterAddress,
        steps: 'Align street name, postal code, and area formatting with master business address.'
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
              Citation <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(249,115,22,0.12)', color: C.accent, padding: '3px 8px', borderRadius: 20, marginLeft: 8 }}>Single-Search Scanner</span>
            </h1>
            <p style={{ color: C.muted, fontSize: 12.5, marginTop: 5 }}>
              Optimized 1-SERP query citation audit for <strong style={{ color: '#fff' }}>{clientName}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 640, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
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
                maxWidth: '220px',
                width: '100%',
                textOverflow: 'ellipsis'
              }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.display_name || c.business_name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              style={{
                background: showDebugPanel ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${showDebugPanel ? '#ef4444' : C.border}`,
                borderRadius: 10,
                padding: '10px 14px',
                color: showDebugPanel ? '#ef4444' : '#fff',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <Bug size={14} />
              {showDebugPanel ? 'Hide Debug' : 'Debug Mode'}
            </button>

            <button
              onClick={() => handleRunFullCheck(false)}
              disabled={runningScan}
              style={{
                background: C.accent,
                border: 'none',
                borderRadius: 10,
                padding: '10px 16px',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: runningScan ? 0.7 : 1,
                cursor: runningScan ? 'not-allowed' : 'pointer'
              }}
            >
              {runningScan ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
              {runningScan ? 'Scanning...' : 'Audit (Cached)'}
            </button>

            <button
              onClick={() => handleRunFullCheck(true)}
              disabled={runningScan}
              title="Execute fresh ValueSERP search & refresh 7-day cache"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: '10px 16px',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: runningScan ? 0.7 : 1,
                cursor: runningScan ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={14} className={runningScan ? "animate-spin" : ""} />
              Refresh Scan
            </button>
          </div>
        </div>

        {/* ═══ TEMPORARY DEBUG PANEL ═══ */}
        {(showDebugPanel || debugData) && (
          <div style={{ background: '#090d16', border: '1px solid #ef444460', borderRadius: 16, padding: 22, marginBottom: 26, boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(239,68,68,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bug size={18} color="#ef4444" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                    Citation Scanner Debug Mode Panel
                  </h3>
                  <span style={{ fontSize: 11, color: '#fca5a5' }}>Inspecting query, raw ValueSERP organic results, and parser detection failures</span>
                </div>
              </div>
              <button onClick={() => setShowDebugPanel(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {debugData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* 1. Query & ValueSERP Response Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>

                  {/* Query Info */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Terminal size={14} /> 1. Search Query Parameters
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Business Name: <strong style={{ color: '#fff' }}>{debugData.queryDetails?.businessName}</strong></div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>City: <strong style={{ color: '#fff' }}>{debugData.queryDetails?.city}</strong></div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Phone Number: <strong style={{ color: '#fff' }}>{debugData.queryDetails?.phone}</strong></div>
                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', color: '#f97316', border: `1px solid ${C.border}` }}>
                      {debugData.queryDetails?.searchQuery}
                    </div>
                  </div>

                  {/* ValueSERP Response Summary */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Zap size={14} /> 2. ValueSERP Response Stats
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Total Organic Results: <strong style={{ color: '#38bdf8' }}>{debugData.responseSummary?.totalOrganic || 0}</strong></div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Total Results Returned: <strong style={{ color: '#fff' }}>{debugData.responseSummary?.totalResultsReturned || 0}</strong></div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Search Time: <strong style={{ color: '#fef08a' }}>{debugData.responseSummary?.searchTimeMs} ms</strong></div>
                    <div style={{ fontSize: 12, color: C.muted }}>Credits Used: <strong style={{ color: '#f97316' }}>{debugData.responseSummary?.creditsUsed}</strong></div>
                  </div>

                </div>

                {/* 2. Directory Detection & Parser Failure Analysis */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    3. Supported Directory Detection & Parser Analysis
                  </h4>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${C.border}` }}>
                          <th style={{ padding: '10px 14px', color: C.muted }}>Directory</th>
                          <th style={{ padding: '10px 14px', color: C.muted }}>Detection Status</th>
                          <th style={{ padding: '10px 14px', color: C.muted }}>Matched / Raw Domain URL</th>
                          <th style={{ padding: '10px 14px', color: C.muted }}>Failure Reason / Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debugData.detectionList?.map((item, idx) => {
                          let badgeBg = 'rgba(239,68,68,0.1)';
                          let badgeColor = '#ef4444';
                          if (item.status.includes('Detected')) {
                            badgeBg = 'rgba(16,185,129,0.1)';
                            badgeColor = '#10b981';
                          } else if (item.status.includes('Parser Detection Failure')) {
                            badgeBg = 'rgba(234,179,8,0.15)';
                            badgeColor = '#eab308';
                          }

                          return (
                            <tr key={idx} style={{ borderBottom: `1px solid ${C.border}50` }}>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#fff' }}>{item.directory}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: badgeBg, color: badgeColor }}>
                                  {item.status}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', maxWidth: 280, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={item.matchedUrl}>
                                {item.matchedUrl ? (
                                  <a href={item.matchedUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>{item.matchedUrl}</a>
                                ) : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', color: C.muted, fontSize: 11 }}>
                                {item.reason || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Raw Organic Results List */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    4. Raw Google Organic Search Results ({debugData.organicResults?.length || 0})
                  </h4>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, maxHeight: 220, overflowY: 'auto' }}>
                    {debugData.organicResults?.length === 0 ? (
                      <div style={{ fontSize: 12, color: C.muted }}>No organic search results were returned by ValueSERP.</div>
                    ) : (
                      debugData.organicResults?.map((item) => (
                        <div key={item.index} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}40` }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                            {item.index}. {item.title}
                          </div>
                          <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            {item.link} <ExternalLink size={10} />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: 20 }}>
                Click <strong>"Refresh Scan"</strong> or <strong>"Audit (Cached)"</strong> to populate live debug mode information.
              </div>
            )}

          </div>
        )}

        {/* ═══ Real-Time Scan Progress Overlay ═══ */}
        {runningScan && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 26, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: C.accent }} />
                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Citation Audit in Progress</h3>
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.accent, fontFamily: "'Syne', sans-serif" }}>
                {scanProgress}%
              </span>
            </div>

            {/* Continuous Progress Bar */}
            <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #f97316, #ea580c)', width: `${scanProgress}%`, borderRadius: 10, transition: 'width 0.4s ease-out' }} />
            </div>

            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 16 }}>
              Current Step: <span style={{ color: C.accent }}>{scanStep || 'Initializing...'}</span>
            </div>

            {/* Live Directory Counter & Status Grid */}
            <div style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Directories Processed</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                  {processedCount} / {totalDirsCount}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                {directoryStatuses.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted }}>Waiting to parse directory URLs...</div>
                ) : (
                  directoryStatuses.map((item, idx) => {
                    let badgeColor = C.muted;
                    let icon = '⏳';
                    if (item.type === 'Verified' || item.type === 'Match') { badgeColor = '#10b981'; icon = '✔'; }
                    else if (item.type === 'Mismatch') { badgeColor = '#ef4444'; icon = '⚠'; }
                    else if (item.type === 'Missing Listing') { badgeColor = '#f97316'; icon = '✕'; }
                    else if (item.type === 'Unable to Extract') { badgeColor = '#94a3b8'; icon = '❓'; }

                    return (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{item.name}</span>
                        <span style={{ color: badgeColor, fontWeight: 700 }}>{icon}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* ═══ Completion Summary Card ═══ */}
        {!runningScan && completedSummary && (
          <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(15,23,42,0.4) 100%)', border: `1px solid ${C.accent}40`, borderRadius: 16, padding: 22, marginBottom: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={22} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                  Citation Audit Completed
                </h3>
              </div>
              {completedSummary.cacheUsed && (
                <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '3px 10px', borderRadius: 20 }}>
                  ⚡ Loaded from 7-Day Cache ({completedSummary.cacheAge})
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Scanned / Found</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 2 }}>{completedSummary.directoriesScanned} / {completedSummary.directoriesFound}</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Verified</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981', marginTop: 2 }}>{completedSummary.verifiedCount}</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Mismatch</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', marginTop: 2 }}>{completedSummary.mismatchCount}</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Missing Listings</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f97316', marginTop: 2 }}>{completedSummary.missingCount}</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Unable to Extract</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#94a3b8', marginTop: 2 }}>{completedSummary.unableToExtractCount || 0}</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Citation Score</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.accent, marginTop: 2 }}>{completedSummary.citationScore}%</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>ValueSERP Used</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>{completedSummary.requestsUsed} Req ({completedSummary.creditsConsumed} Cr)</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Total Scan Time</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fef08a', marginTop: 2 }}>{completedSummary.totalScanTimeSeconds}s</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Body */}
        {!runningScan && !loadingScan && !scanData && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '60px 24px', textAlign: 'center', marginTop: 30 }}>
            <div style={{ background: 'rgba(249,115,22,0.06)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: `1px solid ${C.border}` }}>
              <Globe size={28} color={C.accent} />
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 10 }}>No Citation Scan Found</h2>
            <p style={{ color: C.muted, fontSize: 13.5, maxWidth: 460, margin: '0 auto 24px auto', lineHeight: 1.6 }}>
              Run your first citation scan to discover business listings across web directories using single-search optimization.
            </p>
            <button
              onClick={() => handleRunFullCheck(true)}
              style={{ background: C.accent, border: 'none', borderRadius: 10, padding: '12px 24px', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Run Audit Now
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
            {/* Summary Cards */}
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
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Directories with incorrect NAP</p>
              </div>

              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 12.5, fontWeight: 600 }}>Missing Listings</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: 'rgba(249,115,22,0.1)', padding: '2px 6px', borderRadius: 4 }}>Alert</span>
                </div>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                  {scanData.scan.missing}
                </span>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Directories without listings</p>
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

              {/* Directory Status Table */}
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
                      let displayStatus = resItem.status;

                      if (resItem.status === 'Verified' || resItem.status === 'Match') {
                        statusBg = 'rgba(16,185,129,0.08)';
                        statusColor = C.green;
                        displayStatus = 'Verified';
                      } else if (resItem.status === 'Mismatch') {
                        statusBg = 'rgba(239,68,68,0.08)';
                        statusColor = C.red;
                      } else if (resItem.status === 'Missing Listing' || resItem.status === 'Missing') {
                        statusBg = 'rgba(249,115,22,0.08)';
                        statusColor = C.accent;
                        displayStatus = 'Missing Listing';
                      } else if (resItem.status === 'Unable to Extract') {
                        statusBg = 'rgba(148,163,184,0.08)';
                        statusColor = '#94a3b8';
                        displayStatus = 'Unable to Extract';
                      }

                      const isSelected = selectedResult && selectedResult.id === resItem.id;

                      return (
                        <tr key={resItem.id} style={{ borderBottom: `1px solid ${C.border}`, background: isSelected ? 'rgba(249,115,22,0.05)' : 'transparent', transition: 'background 0.2s' }} className="hover-row">
                          <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                            {resItem.directory}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 13, color: displayStatus === 'Missing Listing' ? C.muted : C.text, maxWidth: 150, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {displayStatus === 'Missing Listing' ? '—' : (resItem.businessName || '—')}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 13, color: displayStatus === 'Missing Listing' ? C.muted : C.text }}>
                            {displayStatus === 'Missing Listing' ? '—' : (resItem.phone || '—')}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 13, color: displayStatus === 'Missing Listing' ? C.muted : C.text, maxWidth: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={resItem.address}>
                            {displayStatus === 'Missing Listing' ? '—' : (resItem.address || '—')}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 13, color: displayStatus === 'Missing Listing' ? C.muted : C.text, maxWidth: 120, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {displayStatus === 'Missing Listing' ? '—' : (resItem.website || '—')}
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
                              {displayStatus}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setSelectedResult(resItem)}
                                style={{
                                  background: isSelected ? C.accent : 'rgba(249,115,22,0.12)',
                                  border: `1px solid ${C.accent}40`,
                                  borderRadius: 8,
                                  padding: '6px 12px',
                                  color: isSelected ? '#fff' : C.accent,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  cursor: 'pointer'
                                }}
                              >
                                <Wrench size={13} />
                                {resItem.status === 'Verified' || resItem.status === 'Match' ? 'Inspect' : 'View Fix'}
                              </button>

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

              {/* Fix & Inspection Panel */}
              {selectedResult && (
                <div style={{ width: 360, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }} className="w-full-mobile">
                  <button
                    onClick={() => setSelectedResult(null)}
                    style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 8, padding: 4, cursor: 'pointer', color: C.muted }}
                  >
                    <X size={16} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Wrench size={18} color={C.accent} />
                    <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0, fontFamily: "'Syne', sans-serif" }}>
                      {selectedResult.directory} Listing Guide
                    </h3>
                  </div>

                  <p style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>
                    Actionable instructions & NAP verification for {selectedResult.directory}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Verified Case */}
                    {(selectedResult.status === 'Verified' || selectedResult.status === 'Match') && (
                      <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                          <CheckCircle size={16} /> Verified & Matching Listing
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: '#a7f3d0', lineHeight: 1.5 }}>
                          All business details on {selectedResult.directory} match your GBP Master record perfectly!
                        </p>
                      </div>
                    )}

                    {/* Mismatch Case */}
                    {selectedResult.status === 'Mismatch' && currentDiscrepancies.map((disc, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.red, background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                            {disc.field} Discrepancy
                          </span>
                        </div>

                        <div style={{ fontSize: 12, marginBottom: 6 }}>
                          <span style={{ color: C.muted }}>Directory Found:</span>
                          <div style={{ color: C.red, fontWeight: 600, marginTop: 2 }}>{disc.directoryVal}</div>
                        </div>

                        <div style={{ fontSize: 12, marginBottom: 10 }}>
                          <span style={{ color: C.muted }}>GBP Master Expected:</span>
                          <div style={{ color: C.green, fontWeight: 600, marginTop: 2 }}>{disc.googleVal}</div>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.3)', borderTop: `1px dashed ${C.border}`, padding: '10px', borderRadius: 6, fontSize: 11.5, lineHeight: 1.5, color: C.text, marginTop: 6 }}>
                          <strong style={{ color: C.accent, display: 'block', marginBottom: 2 }}>Action Step:</strong>
                          {disc.steps}
                        </div>
                      </div>
                    ))}

                    {/* Unable to Extract Case */}
                    {selectedResult.status === 'Unable to Extract' && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                          <HelpCircle size={15} /> Playwright Extraction Warning
                        </div>
                        <p style={{ fontSize: 12, color: C.text, lineHeight: 1.5, margin: '0 0 12px 0' }}>
                          The listing URL was discovered on Google, but the directory page (e.g. Justdial anti-bot wall) prevented automated Playwright extraction.
                        </p>

                        {selectedResult.listingUrl && (
                          <a
                            href={selectedResult.listingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', width: '100%', justifyContent: 'center', marginBottom: 10 }}
                          >
                            Open Directory Page <ExternalLink size={13} />
                          </a>
                        )}

                        <div style={{ fontSize: 11.5, color: C.muted, background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8, lineHeight: 1.5 }}>
                          <strong style={{ color: C.accent }}>Manual Verification Step:</strong><br />
                          Click the link above to visually confirm your listing details, then click <strong>"Mark Verified"</strong> below to update your Citation Score!
                        </div>
                      </div>
                    )}

                    {/* Missing Listing Case */}
                    {(selectedResult.status === 'Missing Listing' || selectedResult.status === 'Missing') && (
                      <div style={{ background: 'rgba(249,115,22,0.05)', border: `1px solid ${C.accent}30`, borderRadius: 12, padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                          <AlertTriangle size={15} /> Missing Listing Alert
                        </div>
                        <p style={{ fontSize: 12, color: C.text, lineHeight: 1.5, margin: '0 0 12px 0' }}>
                          No listing profile was found on <strong>{selectedResult.directory}</strong> in top Google search results.
                        </p>

                        <div style={{ fontSize: 11.5, color: C.muted, background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8, lineHeight: 1.5 }}>
                          <strong style={{ color: C.accent }}>How to Fix:</strong><br />
                          Create a free business account on {selectedResult.directory} using your Master GBP Business Address, Phone & Website. Once created, click <strong>"Mark Verified"</strong> below!
                        </div>
                      </div>
                    )}

                    {/* Mark Verified / Fixed Button */}
                    {selectedResult.status !== 'Verified' && selectedResult.status !== 'Match' && (
                      <button
                        onClick={() => handleMarkFixed(selectedResult.id)}
                        disabled={markingFixedId !== null}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
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
                          opacity: markingFixedId !== null ? 0.7 : 1,
                          marginTop: 4
                        }}
                      >
                        {markingFixedId === selectedResult.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        Mark Verified & Update Score
                      </button>
                    )}

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
