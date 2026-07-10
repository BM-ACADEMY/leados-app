import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
import { C } from '../../constants/theme.js';
import { 
  Loader2, TrendingUp, TrendingDown, Minus, RefreshCw, 
  Trash2, Plus, Globe, Type, Send, Trophy, MapPin, 
  ArrowUpRight, ArrowDownRight, AlertTriangle, Zap, Shield, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function KeywordTracking() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState(null);
  
  // PageSpeed Audit State
  const [pagespeed, setPagespeed] = useState(null);
  const [pagespeedLoading, setPagespeedLoading] = useState(false);

  // Add Keyword Form / Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [initialRank, setInitialRank] = useState('1');
  const [packStatus, setPackStatus] = useState('In Pack');
  const [targetLocation, setTargetLocation] = useState('Pondicherry');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');

  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const modalRef = useRef(null);

  // 1. Fetch GMB Clients list
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('leados_token');
      const { data } = await axios.get(`${API_URL}/api/mafiya/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(data);
      if (data.length > 0) {
        setActiveClient(data[0]); // Default to first client
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Fetch clients error:', err);
      toast.error('Failed to load GMB clients');
      setLoading(false);
    }
  };

  // 2. Fetch keywords for active client
  const fetchKeywords = async (clientId) => {
    if (!clientId) return;
    try {
      const token = localStorage.getItem('leados_token');
      const { data } = await axios.get(`${API_URL}/api/mafiya/turf/keywords?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeywords(data);
    } catch (err) {
      console.error('Fetch keywords error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Run PageSpeed Insights Audit
  const runPageSpeedAudit = async (url) => {
    if (!url) return;
    setPagespeedLoading(true);
    setPagespeed(null);
    try {
      const token = localStorage.getItem('leados_token');
      const { data } = await axios.get(`${API_URL}/api/mafiya/turf/pagespeed?url=${encodeURIComponent(url)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPagespeed(data);
    } catch (err) {
      console.error('PageSpeed audit error:', err);
    } finally {
      setPagespeedLoading(false);
    }
  };

  // 4. Fetch AI Suggestions
  const fetchAiSuggestions = async (clientId, location) => {
    if (!clientId) return;
    setAiLoading(true);
    try {
      const token = localStorage.getItem('leados_token');
      const { data } = await axios.get(`${API_URL}/api/mafiya/turf/ai-suggestions?clientId=${clientId}&location=${encodeURIComponent(location || '')}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiSuggestions(data);
    } catch (err) {
      console.error('AI suggestions error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (activeClient) {
      setLoading(true);
      fetchKeywords(activeClient.id);
      runPageSpeedAudit(activeClient.website_url || activeClient.business_name);
      fetchAiSuggestions(activeClient.id, targetLocation);
    }
  }, [activeClient]);

  // Handle Add Keyword
  const handleAddKeyword = async (e) => {
    if (e) e.preventDefault();
    if (!newKeyword.trim()) {
      setFormError('Keyword is required');
      return;
    }

    setAdding(true);
    setFormError('');
    try {
      const token = localStorage.getItem('leados_token');
      const { data: saved } = await axios.post(`${API_URL}/api/mafiya/turf/keywords`, {
        client_id: activeClient.id,
        keyword: newKeyword,
        initial_rank: parseInt(initialRank, 10),
        pack_status: packStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeywords([saved, ...keywords]);
      toast.success('Keyword added! Fetching ranking...');
      setNewKeyword('');
      setShowAddModal(false);
      
      // Auto-trigger live rank check
      handleRefresh(saved.id);
    } catch (err) {
      setFormError('Failed to save keyword');
    } finally {
      setAdding(false);
    }
  };

  // Handle Refresh Rank
  const handleRefresh = async (id) => {
    setRefreshingId(id);
    try {
      const token = localStorage.getItem('leados_token');
      const { data: updated } = await axios.post(`${API_URL}/api/mafiya/turf/keywords/refresh/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeywords(prevKeywords => prevKeywords.map(k => k.id === id ? updated : k));
      toast.success('Ranking updated live!');
    } catch (err) {
      toast.error('Failed to update ranking');
    } finally {
      setRefreshingId(null);
    }
  };

  // Handle Delete Keyword
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to stop tracking this keyword?')) return;
    try {
      const token = localStorage.getItem('leados_token');
      await axios.delete(`${API_URL}/api/mafiya/turf/keywords/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeywords(keywords.filter(k => k.id !== id));
      toast.success('Keyword stopped tracking');
    } catch (err) {
      toast.error('Failed to delete keyword');
    }
  };

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowAddModal(false);
      }
    };
    if (showAddModal) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddModal]);

  // Calculations for cards
  const trophyLeaderCount = keywords.filter(k => k.current_rank === 1).length;
  const localPackCount = keywords.filter(k => k.current_rank && k.current_rank <= 3).length;
  
  const rankGains = keywords.filter(k => {
    if (k.current_rank === null || k.previous_rank === null) return false;
    return k.current_rank < k.previous_rank;
  }).length;

  const lostPositions = keywords.filter(k => {
    if (k.current_rank === null || k.previous_rank === null) return false;
    return k.current_rank > k.previous_rank;
  }).length;

  if (loading && clients.length > 0) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: C.background }}>
        <Loader2 size={32} color={C.accent} className="spin" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div style={{ padding: 40, color: C.text, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.background }}>
        <Shield size={48} style={{ opacity: 0.15, marginBottom: 16 }} color="#fff" />
        <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 8 }}>No Clients Configured</h2>
        <p style={{ color: C.muted, textAlign: 'center', maxWidth: 400 }}>Please onboard GMB clients in the Mafiya OS section first to start tracking keywords.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes loadProgress {
          0% { width: 0%; }
          15% { width: 30%; }
          45% { width: 65%; }
          75% { width: 85%; }
          95% { width: 95%; }
          100% { width: 98%; }
        }
      `}</style>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif", display: 'flex', alignItems: 'center', gap: 10 }}>
              📌 Turf Control
            </h1>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5, border: '1px solid rgba(249,115,22,0.2)' }}>
              Rankings
            </span>
          </div>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            Google Maps keyword positions and Local Pack tracking for <strong style={{ color: '#fff' }}>{activeClient?.business_name}</strong>
          </p>
        </div>

        {/* Dropdown & Add Keyword Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            value={activeClient?.id || ''}
            onChange={(e) => {
              const selected = clients.find(c => c.id === parseInt(e.target.value, 10));
              if (selected) setActiveClient(selected);
            }}
            style={{ 
              background: '#0f172a', 
              border: `1px solid ${C.border}`, 
              borderRadius: 8, 
              padding: '8px 16px', 
              color: '#e2e8f0', 
              fontSize: 13, 
              outline: 'none', 
              cursor: 'pointer',
              height: 38
            }}
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              boxShadow: '0 4px 12px rgba(249,115,22,0.2)'
            }}
          >
            <Plus size={16} /> Add Keyword
          </button>
        </div>
      </div>

      {/* Website Performance & Speed Index (PageSpeed Insights) Card */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚡ Website Performance & Speed Index (PageSpeed Insights)
        </h3>
        
        {pagespeedLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 500, padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: C.muted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={15} className="spin" color={C.accent} />
                Running Google PageSpeed audit...
              </span>
              <span style={{ fontWeight: 600 }}>Please wait...</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <div 
                style={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #f97316, #ea580c)', 
                  borderRadius: 10,
                  animation: 'loadProgress 10s cubic-bezier(0.1, 0.8, 0.1, 1) forwards'
                }} 
              />
            </div>
          </div>
        )}

        {!pagespeedLoading && pagespeed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }} className="flex-col-mobile">
            {/* Circular score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ 
                width: 58, 
                height: 58, 
                borderRadius: '50%', 
                border: `4px solid ${pagespeed.performance >= 90 ? '#10b981' : pagespeed.performance >= 50 ? '#f59e0b' : '#ef4444'}33`, 
                borderTopColor: pagespeed.performance >= 90 ? '#10b981' : pagespeed.performance >= 50 ? '#f59e0b' : '#ef4444',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 800, 
                fontSize: 16,
                color: pagespeed.performance >= 90 ? '#10b981' : pagespeed.performance >= 50 ? '#f59e0b' : '#ef4444'
              }}>
                {pagespeed.performance}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Lighthouse Performance</div>
                <div style={{ fontSize: 11, color: C.muted }}>Mobile audit check</div>
              </div>
            </div>

            {/* Metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30, flex: 1 }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted }}>Speed Index</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 4 }}>{pagespeed.speedIndex}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted }}>First Contentful Paint</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 4 }}>{pagespeed.firstContentfulPaint}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted }}>Largest Contentful Paint</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 4 }}>{pagespeed.largestContentfulPaint}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STATS CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }} className="flex-col-mobile">
        {/* Trophy Leader */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>#1 Captured</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{trophyLeaderCount}</span>
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>Trophy Leader</span>
          </div>
        </div>

        {/* Local Pack */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Top 3 Pack</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{localPackCount}</span>
            <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>In Local Pack</span>
          </div>
        </div>

        {/* Improved */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Improved</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{rankGains}</span>
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>Rank gains</span>
          </div>
        </div>

        {/* Lost */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Code Red</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{lostPositions}</span>
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Lost positions</span>
          </div>
        </div>
      </div>

      {/* KEYWORD TRACKING TABLE */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            📍 Keyword Rankings — {keywords.length} tracked
          </h2>
        </div>

        {keywords.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '14px 24px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Keyword</th>
                <th style={{ padding: '14px 24px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>Initial Rank</th>
                <th style={{ padding: '14px 24px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>Current Rank</th>
                <th style={{ padding: '14px 24px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>Maps Pack Status</th>
                <th style={{ padding: '14px 24px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>Trend</th>
                <th style={{ padding: '14px 24px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map(kw => {
                const diff = (kw.previous_rank !== null && kw.current_rank !== null) ? kw.previous_rank - kw.current_rank : 0;
                
                return (
                  <tr key={kw.id} style={{ borderBottom: `1px solid ${C.border}50` }}>
                    <td style={{ padding: '18px 24px', fontSize: 14, fontWeight: 600, color: '#fff' }}>{kw.keyword}</td>
                    <td style={{ padding: '18px 24px', fontSize: 13, color: C.muted, textAlign: 'center' }}>{kw.initial_rank}</td>
                    <td style={{ padding: '18px 24px', fontSize: 15, fontWeight: 800, color: kw.current_rank <= 3 ? '#10b981' : '#f59e0b', textAlign: 'center' }}>
                      {kw.current_rank || '100+'}
                    </td>
                    <td style={{ padding: '18px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: kw.pack_status === 'In Pack' ? '#10b981' : '#ef4444', background: kw.pack_status === 'In Pack' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '3px 10px', borderRadius: 20 }}>
                        {kw.pack_status}
                      </span>
                    </td>
                    <td style={{ padding: '18px 24px', textAlign: 'center' }}>
                      {diff > 0 && <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600 }}><TrendingUp size={14} /> +{diff}</span>}
                      {diff < 0 && <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600 }}><TrendingDown size={14} /> {diff}</span>}
                      {diff === 0 && <span style={{ color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600 }}><Minus size={14} /> 0</span>}
                    </td>
                    <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button
                          onClick={() => handleRefresh(kw.id)}
                          disabled={refreshingId === kw.id}
                          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, cursor: refreshingId === kw.id ? 'not-allowed' : 'pointer', color: '#fff' }}
                        >
                          <RefreshCw size={14} className={refreshingId === kw.id ? 'spin' : ''} />
                        </button>
                        <button
                          onClick={() => handleDelete(kw.id)}
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
            No keywords tracked yet. Click "+ Add Keyword" to begin tracking.
          </div>
        )}
      </div>

      {/* ═══ Add Keyword Modal ═══ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div ref={modalRef} style={{ background: C.surface, width: '100%', maxWidth: 520, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Trophy size={18} color="#f97316" />
              <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700 }}>📌 Add Keyword</h3>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddKeyword} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Keyword Field */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Keyword *</label>
                <input
                  type="text"
                  placeholder="e.g. digital skills course Pondicherry"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  style={{ width: '100%', background: '#090f1a', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
                />
              </div>

              {/* Initial Rank & Pack Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Initial Rank</label>
                  <input
                    type="number"
                    value={initialRank}
                    onChange={(e) => setInitialRank(e.target.value)}
                    style={{ width: '100%', background: '#090f1a', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Pack Status</label>
                  <select
                    value={packStatus}
                    onChange={(e) => setPackStatus(e.target.value)}
                    style={{ width: '100%', background: '#090f1a', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="In Pack">In Pack</option>
                    <option value="Not in Pack">Not in Pack</option>
                  </select>
                </div>
              </div>

              {/* Target Location / City Field */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Target Location / City</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="e.g. Guntur"
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    onBlur={() => fetchAiSuggestions(activeClient.id, targetLocation)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), fetchAiSuggestions(activeClient.id, targetLocation))}
                    style={{ flex: 1, background: '#090f1a', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fetchAiSuggestions(activeClient.id, targetLocation)}
                    disabled={aiLoading}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: '0 16px',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {aiLoading ? <Loader2 size={14} className="spin" /> : 'Suggest'}
                  </button>
                </div>
              </div>

              {/* AI Suggestions Section */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  <Sparkles size={12} color="#f97316" /> AI Keyword Suggestions
                </label>
                
                {aiLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}>
                    <Loader2 size={12} className="spin" />
                    <span>Analyzing client profile for suggestions...</span>
                  </div>
                )}

                {!aiLoading && aiSuggestions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {aiSuggestions.map((suggest, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setNewKeyword(suggest.keyword)}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          padding: '6px 12px',
                          color: '#fff',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.1)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = C.border; }}
                      >
                        <span>{suggest.keyword}</span>
                        <span style={{ fontSize: 10, color: C.muted }}>{suggest.volume}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {formError && (
                <div style={{ color: '#ef4444', fontSize: 12 }}>{formError}</div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '10px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 24px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: adding ? 'not-allowed' : 'pointer',
                    opacity: adding ? 0.7 : 1
                  }}
                >
                  {adding ? 'Adding...' : '+ Add'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
