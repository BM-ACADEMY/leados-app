import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, RefreshCw, Trophy, ArrowUpRight, TrendingUp, TrendingDown, Minus, ChevronDown, Sparkles, X, Building } from 'lucide-react';
import { api } from '../services/api.js';
import { C } from '../constants/theme.js';
import toast from 'react-hot-toast';

export const GmbRankings = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [profile, setProfile] = useState(null);
  const [pageSpeed, setPageSpeed] = useState(null);
  const [pageSpeedLoading, setPageSpeedLoading] = useState(false);
  const [stats, setStats] = useState({
    num1Captured: 0,
    top3Pack: 0,
    improved: 0,
    codeRed: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [initialRank, setInitialRank] = useState('1');
  const [packStatus, setPackStatus] = useState('In Pack');
  const [submitting, setSubmitting] = useState(false);

  // Suggested Keywords
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const fetchSuggestions = async (clientId) => {
    if (!clientId) return;
    try {
      setSuggestionsLoading(true);
      const res = await api.getGmbKeywordSuggestions(clientId);
      setSuggestions(res.suggestions || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      // Fallback
      setSuggestions([
        { text: 'SEO course Pondicherry', searchVolume: '200/mo' },
        { text: 'Google Ads course Pondicherry', searchVolume: '90/mo' },
        { text: 'digital marketing training Tamil Nadu', searchVolume: '320/mo' },
        { text: 'social media course near me', searchVolume: '180/mo' }
      ]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    if (modalOpen && selectedClient) {
      fetchSuggestions(selectedClient.id);
    }
  }, [modalOpen, selectedClient]);

  const fetchKeywords = async (clientId) => {
    try {
      setLoading(true);
      const res = await api.getGmbKeywords(clientId);
      setKeywords(res.keywords || []);
      setStats(res.stats || { num1Captured: 0, top3Pack: 0, improved: 0, codeRed: 0 });
    } catch (err) {
      console.error('Error fetching keywords:', err);
      toast.error('Failed to load keywords');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileForClient = async (client) => {
    if (!client) return;
    try {
      const res = await api.getGmbProfile(client.id);
      setProfile(res);
    } catch (err) {
      console.error('Error fetching GMB profile:', err);
      setProfile(null);
    }
  };

  const fetchPageSpeed = async (clientId) => {
    if (!clientId) return;
    try {
      setPageSpeedLoading(true);
      const res = await api.getGmbPageSpeed(clientId);
      setPageSpeed(res);
    } catch (err) {
      console.error('Error fetching PageSpeed:', err);
      setPageSpeed(null);
    } finally {
      setPageSpeedLoading(false);
    }
  };

  useEffect(() => {
    const fetchGmbClients = async () => {
      try {
        const res = await api.getClients();
        const clientList = (res.clients || []).filter(c => c.gmb_url);
        setClients(clientList);
        
        if (clientList.length > 0) {
          setSelectedClient(clientList[0]);
          await Promise.all([
            fetchKeywords(clientList[0].id),
            fetchProfileForClient(clientList[0]),
            fetchPageSpeed(clientList[0].id)
          ]);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching clients for rankings:', err);
        toast.error('Failed to load clients');
        setLoading(false);
      }
    };
    fetchGmbClients();
  }, []);

  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    setDropdownOpen(false);
    await Promise.all([
      fetchKeywords(client.id),
      fetchProfileForClient(client),
      fetchPageSpeed(client.id)
    ]);
  };

  const handleAddKeyword = async (e) => {
    e.preventDefault();
    if (!newKeyword.trim() || !selectedClient) return;

    try {
      setSubmitting(true);
      await api.addGmbKeyword(selectedClient.id, newKeyword.trim(), initialRank, packStatus);
      toast.success('Keyword added successfully');
      setNewKeyword('');
      setModalOpen(false);
      await fetchKeywords(selectedClient.id);
    } catch (err) {
      console.error('Error adding keyword:', err);
      toast.error('Failed to add keyword');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckKeyword = async (id) => {
    try {
      setRefreshing(id);
      toast('Checking ranking via ValueSERP...', { icon: '🔍' });
      await api.checkGmbKeyword(id);
      toast.success('Ranking updated');
      await fetchKeywords(selectedClient.id);
    } catch (err) {
      console.error('Error checking keyword:', err);
      toast.error('Failed to check ranking');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteKeyword = async (id) => {
    if (!window.confirm('Are you sure you want to stop tracking this keyword?')) return;

    try {
      await api.deleteGmbKeyword(id);
      toast.success('Keyword deleted');
      await fetchKeywords(selectedClient.id);
    } catch (err) {
      console.error('Error deleting keyword:', err);
      toast.error('Failed to delete keyword');
    }
  };

  // Helper to format checked date
  const formatCheckedAt = (dateStr) => {
    if (!dateStr) return 'never';
    const checkedDate = new Date(dateStr);
    const today = new Date();
    
    if (checkedDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return checkedDate.toLocaleDateString();
  };

  // Helper to render rank change
  const renderChange = (current, previous) => {
    if (previous === null || previous === undefined) return <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Minus size={12} /> —</span>;
    const diff = previous - current;
    
    if (diff > 0) {
      return (
        <span style={{ color: C.green, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TrendingUp size={12} /> ▲ {diff}
        </span>
      );
    } else if (diff < 0) {
      return (
        <span style={{ color: C.red, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TrendingDown size={12} /> ▼ {Math.abs(diff)}
        </span>
      );
    } else {
      return (
        <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Minus size={12} /> 0
        </span>
      );
    }
  };

  // Helper to style pack badges
  const getPackBadgeStyle = (status) => {
    switch (status) {
      case 'In Pack':
        return {
          background: 'rgba(16,185,129,0.1)',
          color: C.green,
          border: `1px solid rgba(16,185,129,0.2)`
        };
      case 'Near Pack':
        return {
          background: 'rgba(249,115,22,0.1)',
          color: C.accent,
          border: `1px solid rgba(249,115,22,0.2)`
        };
      default:
        return {
          background: 'rgba(239,68,68,0.1)',
          color: C.red,
          border: `1px solid rgba(239,68,68,0.2)`
        };
    }
  };

  if (loading && clients.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.bg, color: 'white' }}>
        <p style={{ fontSize: 14 }}>Loading Turf Control Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%', background: C.bg, color: C.text }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }} className="flex-responsive gap-mobile">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
              📌 Turf Control
            </span>
            <span style={{ background: C.accentDim, color: C.accent, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12 }}>
              Rankings
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            Google Maps keyword positions and Local Pack tracking for {selectedClient?.name || 'No Client Selected'}
          </div>
        </div>

        {/* Action Controls (Dropdown + Add Button) */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Client Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '10px 16px',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer'
              }}
            >
              {selectedClient ? selectedClient.name : 'Select Client'}
              <ChevronDown size={14} />
            </button>
            
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: 6,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                zIndex: 100,
                minWidth: 200,
                maxHeight: 250,
                overflowY: 'auto'
              }}>
                {clients.length === 0 ? (
                  <div style={{ padding: '10px 14px', fontSize: 12, color: C.muted }}>No clients found.</div>
                ) : (
                  clients.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      style={{
                        padding: '10px 14px',
                        fontSize: 12,
                        cursor: 'pointer',
                        background: selectedClient?.id === c.id ? C.border : 'transparent',
                        color: 'white',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = C.border}
                      onMouseLeave={(e) => e.target.style.background = selectedClient?.id === c.id ? C.border : 'transparent'}
                    >
                      {c.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Add Keyword Button */}
          <button
            onClick={() => setModalOpen(true)}
            style={{
              background: `linear-gradient(135deg, ${C.accent}, #ea580c)`,
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: `0 4px 12px rgba(249,115,22,0.2)`
            }}
          >
            <Plus size={16} /> Add Keyword
          </button>
        </div>
      </div>

      {!selectedClient ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: C.muted, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 14 }}>Please onboard and select a client to view and track keyword rankings.</p>
        </div>
      ) : (
        <>
          {/* GMB Connected Client Profile Card */}
          {profile && (
            <div style={{ 
              background: C.surface, 
              border: `1px solid ${C.border}`, 
              borderRadius: 12, 
              padding: '16px 20px', 
              marginBottom: 20, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }} className="flex-responsive gap-mobile">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifycontent: 'center', color: C.accent, display: 'flex', justifyContent: 'center' }}>
                  <Building size={20} style={{ alignSelf: 'center' }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {profile.name}
                    {profile.isMock && (
                      <span style={{ fontSize: 9, background: C.border, color: '#94a3b8', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
                        DEMO PROFILE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                    📍 {profile.address} • 📞 {profile.phone} • 🏷️ {profile.category}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }} className="flex-col-mobile">
                <div style={{ textAlign: 'right' }} className="hide-mobile">
                  <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', fontWeight: 700 }}>Google Email</div>
                  <div style={{ fontSize: 13, color: '#e2e8f0', marginTop: 2 }}>{profile.googleEmail}</div>
                </div>
                <span style={{ 
                  background: profile.oauthStatus === 'Connected' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
                  color: profile.oauthStatus === 'Connected' ? '#4CAF50' : 'rgba(255,255,255,0.5)', 
                  padding: '4px 10px', 
                  borderRadius: 12, 
                  fontSize: 11, 
                  fontWeight: 700 
                }}>
                  {profile.oauthStatus}
                </span>
              </div>
            </div>
          )}

          {/* PageSpeed Performance Card */}
          {selectedClient && (
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚡ Website Performance & Speed Index (PageSpeed Insights)
                </span>
                {pageSpeed?.website && (
                  <a href={pageSpeed.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.accent, textDecoration: 'none' }}>
                    🌐 Visit Website: {pageSpeed.website}
                  </a>
                )}
              </div>

              {pageSpeedLoading || !pageSpeed ? (
                <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8, padding: '15px 0' }}>
                  <RefreshCw size={14} className="spin-animation" /> Running Google PageSpeed audit... Please wait...
                </div>
              ) : pageSpeed.error ? (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  ℹ️ {pageSpeed.error}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }} className="flex-responsive">
                  {/* Score circle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      border: `4px solid ${
                        pageSpeed.performanceScore >= 90 ? C.green : pageSpeed.performanceScore >= 50 ? C.accent : C.red
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 800,
                      color: pageSpeed.performanceScore >= 90 ? C.green : pageSpeed.performanceScore >= 50 ? C.accent : C.red,
                      background: 'rgba(255, 255, 255, 0.02)'
                    }}>
                      {pageSpeed.performanceScore || '0'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Performance Score</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Mobile Lighthouse Audit</div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, height: 40, background: C.border }} className="hide-mobile" />

                  {/* Metrics */}
                  {pageSpeed.metrics && (
                    <div style={{ display: 'flex', gap: 30, flex: 1, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>FCP</div>
                        <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700, marginTop: 4 }}>{pageSpeed.metrics.firstContentfulPaint}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Speed Index</div>
                        <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700, marginTop: 4 }}>{pageSpeed.metrics.speedIndex}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>LCP</div>
                        <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700, marginTop: 4 }}>{pageSpeed.metrics.largestContentfulPaint}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Interactive</div>
                        <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700, marginTop: 4 }}>{pageSpeed.metrics.interactive}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* #1 Captured */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>#1 Captured</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, height: 28 }}>
                {loading ? (
                  <RefreshCw size={16} className="spin-animation" style={{ color: C.muted }} />
                ) : (
                  stats.num1Captured
                )}
                {!loading && <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>Trophy Leader</span>}
              </div>
            </div>

            {/* Top 3 Pack */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top 3 Pack</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, height: 28 }}>
                {loading ? (
                  <RefreshCw size={16} className="spin-animation" style={{ color: C.muted }} />
                ) : (
                  stats.top3Pack
                )}
                {!loading && <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>In Local Pack</span>}
              </div>
            </div>

            {/* Improved */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Improved</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, height: 28 }}>
                {loading ? (
                  <RefreshCw size={16} className="spin-animation" style={{ color: C.muted }} />
                ) : (
                  stats.improved
                )}
                {!loading && <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>Rank gains</span>}
              </div>
            </div>

            {/* Code Red */}
            <div style={{ background: C.surface, border: stats.codeRed > 0 ? `1px solid ${C.red}40` : `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: stats.codeRed > 0 ? C.red : C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Code Red</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: stats.codeRed > 0 ? C.red : 'white', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, height: 28 }}>
                {loading ? (
                  <RefreshCw size={16} className="spin-animation" style={{ color: C.muted }} />
                ) : (
                  stats.codeRed
                )}
                {!loading && <span style={{ fontSize: 11, color: stats.codeRed > 0 ? C.red : C.muted, fontWeight: 600 }}>Lost positions</span>}
              </div>
            </div>
          </div>

          {/* Keyword Rankings Table */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
                📍 Keyword Rankings — {keywords.length} tracked
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: C.muted }}>
                Loading keywords...
              </div>
            ) : keywords.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: C.muted }}>
                No keywords tracked yet. Click "+ Add Keyword" to begin tracking.
              </div>
            ) : (
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ padding: '14px 24px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Keyword</th>
                      <th style={{ padding: '14px 24px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Rank</th>
                      <th style={{ padding: '14px 24px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Change</th>
                      <th style={{ padding: '14px 24px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Pack</th>
                      <th style={{ padding: '14px 24px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Checked</th>
                      <th style={{ padding: '14px 24px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', width: 100, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map(kw => (
                      <tr key={kw.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '16px 24px', fontSize: 13, color: 'white', fontWeight: 500 }}>
                          {kw.keyword}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          {kw.rank === 1 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(250,204,21,0.1)', color: '#facc15', border: '1px solid rgba(250,204,21,0.2)', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                              🏆 #1
                            </span>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 700, color: kw.rank <= 3 ? C.green : kw.rank <= 10 ? C.accent : C.red }}>
                              #{kw.rank}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: 13 }}>
                          {renderChange(kw.rank, kw.previous_rank)}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 10,
                            fontWeight: 700,
                            ...getPackBadgeStyle(kw.pack_status)
                          }}>
                            {kw.pack_status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: 12, color: C.muted }}>
                          {formatCheckedAt(kw.checked_at)}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              disabled={refreshing === kw.id}
                              onClick={() => handleCheckKeyword(kw.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: C.muted,
                                padding: 6,
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = C.blue}
                              onMouseLeave={(e) => e.currentTarget.style.color = C.muted}
                              title="Check now"
                            >
                              <RefreshCw size={14} className={refreshing === kw.id ? 'spin-animation' : ''} />
                            </button>
                            <button
                              onClick={() => handleDeleteKeyword(kw.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: C.muted,
                                padding: 6,
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = C.red}
                              onMouseLeave={(e) => e.currentTarget.style.color = C.muted}
                              title="Delete keyword"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Keyword Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(6,12,23,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            width: 480,
            padding: 30,
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setModalOpen(false)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              📌 Add Keyword
            </h3>

            <form onSubmit={handleAddKeyword}>
              {/* Keyword text */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Keyword *</label>
                <input
                  required
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="e.g. digital skills course Pondicherry"
                  style={{
                    width: '100%',
                    background: '#060c17',
                    border: `1px solid ${C.border}`,
                    borderRadius: 9,
                    padding: '11px 14px',
                    color: 'white',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Initial rank & Pack status */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Initial Rank</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={initialRank}
                    onChange={(e) => setInitialRank(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#060c17',
                      border: `1px solid ${C.border}`,
                      borderRadius: 9,
                      padding: '11px 14px',
                      color: 'white',
                      fontSize: 13,
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Pack Status</label>
                  <select
                    value={packStatus}
                    onChange={(e) => setPackStatus(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#060c17',
                      border: `1px solid ${C.border}`,
                      borderRadius: 9,
                      padding: '11px 14px',
                      color: 'white',
                      fontSize: 13,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="In Pack">In Pack</option>
                    <option value="Near Pack">Near Pack</option>
                    <option value="Not in Pack">Not in Pack</option>
                  </select>
                </div>
              </div>

              {/* AI Suggestions */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={10} color={C.accent} className={suggestionsLoading ? 'spin-animation' : ''} /> AI Keyword Suggestions
                </label>
                {suggestionsLoading ? (
                  <div style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <RefreshCw size={12} className="spin-animation" /> Generating suggestions...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewKeyword(s.text)}
                        style={{
                          background: '#101c30',
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 11,
                          color: C.text,
                          cursor: 'pointer',
                          transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = C.accent}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = C.border}
                      >
                        {s.text} <span style={{ color: C.muted, marginLeft: 2 }}>~{s.searchVolume}</span>
                      </button>
                    ))}
                    {suggestions.length === 0 && (
                      <span style={{ fontSize: 11, color: C.muted }}>No suggestions available.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '10px 20px',
                    color: C.text,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: `linear-gradient(135deg, ${C.accent}, #ea580c)`,
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: `0 4px 12px rgba(249,115,22,0.2)`
                  }}
                >
                  {submitting ? 'Adding...' : '+ Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded Spin Animation CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>

    </div>
  );
};
