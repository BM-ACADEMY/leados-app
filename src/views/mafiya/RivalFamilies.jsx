import React, { useState, useEffect, useRef } from 'react';
import { C } from '../../constants/theme.js';
import { Shield, Plus, X, Search, Loader2, Target, TrendingUp, AlertTriangle, TrendingDown, Users, RefreshCw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

const INITIAL_FORM = {
  competitor_name: '',
  gbp_url: '',
  place_id: '',
  city: '',
  keyword: ''
};

export default function RivalFamilies() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [rivals, setRivals] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingRivals, setIsLoadingRivals] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const findModalRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const modalRef = useRef(null);

  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const autocompleteInputRef = useRef(null);
  const autocompleteInstanceRef = useRef(null);

  // Load Google Maps Script
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setGoogleScriptLoaded(true);
      return;
    }
    const scriptId = 'google-maps-places-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleScriptLoaded(true);
      document.head.appendChild(script);
    }
  }, []);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('leados_token');
        const res = await fetch(`${API_URL}/api/mafiya/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch clients');
        const data = await res.json();
        setClients(data);
        if (data.length > 0) {
          setSelectedClient(data[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load clients');
      } finally {
        setIsLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  // Fetch rivals when client changes
  useEffect(() => {
    if (!selectedClient) return;
    fetchRivals();
  }, [selectedClient]);

  const fetchRivals = async () => {
    setIsLoadingRivals(true);
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch(`${API_URL}/api/mafiya/rivals/${selectedClient}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch rivals');
      const data = await res.json();
      setRivals(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load rivals');
    } finally {
      setIsLoadingRivals(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedClient) return;
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch(`${API_URL}/api/mafiya/rivals/refresh/${selectedClient}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to refresh');
      toast.success('Rivals data refreshed');
      fetchRivals();
    } catch (err) {
      console.error(err);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.competitor_name) {
      setErrors({ competitor_name: 'Competitor name is required' });
      return toast.error('Please enter a competitor name');
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch(`${API_URL}/api/mafiya/rivals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, business_id: selectedClient }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Competitor added successfully');
      setFormData({ ...INITIAL_FORM });
      setShowModal(false);
      fetchRivals();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add competitor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this competitor?')) return;
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch(`${API_URL}/api/mafiya/rivals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setRivals(rivals.filter(r => r.id !== id));
      toast.success('Competitor removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove competitor');
    }
  };

  // Close modal logic
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicking inside a pac-container (Google Maps Autocomplete dropdown)
      if (e.target.closest('.pac-container')) return;
      if (modalRef.current && !modalRef.current.contains(e.target)) setShowModal(false);
      if (findModalRef.current && !findModalRef.current.contains(e.target)) setShowFindModal(false);
    };
    if (showModal || showFindModal) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModal, showFindModal]);

  const handleFindRivals = () => {
    const client = clients.find(c => c.id === parseInt(selectedClient));
    if (client) {
      setFindQuery(`${client.business_category || client.custom_category || 'Business'} in [City]`);
    }
    setShowFindModal(true);
    setSuggestions([]);
  };

  const executeFindSearch = (e) => {
    e.preventDefault();
    if (!findQuery || !googleScriptLoaded) return;
    
    setIsSearching(true);
    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    service.textSearch({ query: findQuery }, (results, status) => {
      setIsSearching(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setSuggestions(results);
      } else {
        toast.error('No competitors found for this query');
        setSuggestions([]);
      }
    });
  };

  const handleAddSuggestion = async (place) => {
    // Attempt to extract city from formatted_address if possible, or leave blank for now
    let city = '';
    const parts = place.formatted_address ? place.formatted_address.split(',') : [];
    if (parts.length > 2) {
      city = parts[parts.length - 2].trim().split(' ')[0]; // rough guess for city
    }

    const newRival = {
      business_id: selectedClient,
      competitor_name: place.name,
      place_id: place.place_id,
      gbp_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      city: city,
      keyword: findQuery
    };

    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch(`${API_URL}/api/mafiya/rivals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newRival),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(`${place.name} added as rival`);
      fetchRivals();
      
      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.place_id !== place.place_id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to add competitor');
    }
  };

  // Init Google Maps Autocomplete
  useEffect(() => {
    if (showModal && googleScriptLoaded && autocompleteInputRef.current) {
      autocompleteInstanceRef.current = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['establishment']
      });

      // Prevent form submission on pressing Enter in the autocomplete dropdown
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      };
      autocompleteInputRef.current.addEventListener('keydown', handleKeyDown);

      const listener = autocompleteInstanceRef.current.addListener('place_changed', () => {
        const place = autocompleteInstanceRef.current.getPlace();
        if (!place.geometry) return;

        let city = '';
        for (const component of place.address_components || []) {
          if (component.types.includes('locality')) {
            city = component.long_name;
            break;
          }
        }

        setFormData(prev => ({
          ...prev,
          competitor_name: place.name || '',
          place_id: place.place_id || '',
          gbp_url: place.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          city: city || prev.city
        }));

        setErrors(prev => ({ ...prev, competitor_name: null }));
      });

      return () => {
        if (autocompleteInstanceRef.current) {
          window.google.maps.event.removeListener(listener);
        }
        if (autocompleteInputRef.current) {
          autocompleteInputRef.current.removeEventListener('keydown', handleKeyDown);
        }
      }
    }
  }, [showModal, googleScriptLoaded]);

  // Calculate metrics
  const winning = rivals.filter(r => r.metrics?.status === 'winning').length;
  const losing = rivals.filter(r => r.metrics?.status === 'losing').length;
  const watchClosely = rivals.filter(r => r.metrics?.status === 'watch_closely').length;
  const total = rivals.length;
  const healthScore = total > 0 ? Math.round((winning / total) * 100) : 0;

  const inputStyle = { background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, borderRadius: 8, color: '#fff', padding: '12px 14px', outline: 'none', fontSize: 13, width: '100%' };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: 'uppercase' };

  if (isLoadingClients) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
        <Loader2 size={42} className="spin" style={{ color: C.accent }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 30, color: C.text, height: '100%', overflowY: 'auto', background: 'rgba(0,0,0,0.1)' }}>
      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>Rival Families</h1>
            <p style={{ margin: 0, color: C.muted, fontSize: 12, marginTop: 2 }}>Track & compare your local SEO performance</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            style={{ ...inputStyle, width: 220, padding: '10px 14px', background: C.surface }}
          >
            {clients.length === 0 && <option value="">No clients available</option>}
            {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </select>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || !selectedClient}
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, padding: '10px 14px', borderRadius: 10, color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={handleFindRivals}
            disabled={!selectedClient}
            style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '10px 16px', borderRadius: 10, color: '#3b82f6', fontSize: 13, fontWeight: 700, cursor: selectedClient ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8, opacity: selectedClient ? 1 : 0.5, transition: 'background 0.15s' }}
            onMouseEnter={e => { if(selectedClient) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)' }}
            onMouseLeave={e => { if(selectedClient) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)' }}
          >
            <Search size={16} /> Auto-Find
          </button>

          <button
            onClick={() => setShowModal(true)}
            disabled={!selectedClient}
            style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: 'none', padding: '10px 20px', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: selectedClient ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8, opacity: selectedClient ? 1 : 0.5 }}
          >
            <Plus size={16} /> Add Rival
          </button>
        </div>
      </div>

      {!selectedClient ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: C.surface, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <Users size={48} color={C.muted} style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, margin: '0 0 8px 0' }}>No Client Selected</h3>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Please select or onboard a client to view competitors.</p>
        </div>
      ) : (
        <>
          {/* ═══ Dashboard Summary ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', fontWeight: 700 }}>Competitors Tracked</span>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#fff' }}>{total}</div>
            </div>
            <div style={{ background: 'linear-gradient(to right bottom, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#10b981" />
                <span style={{ fontSize: 12, color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>Winning</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#10b981' }}>{winning}</div>
            </div>
            <div style={{ background: 'linear-gradient(to right bottom, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02))', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color="#f59e0b" />
                <span style={{ fontSize: 12, color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700 }}>Watch Closely</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#f59e0b' }}>{watchClosely}</div>
            </div>
            <div style={{ background: 'linear-gradient(to right bottom, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02))', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingDown size={16} color="#ef4444" />
                <span style={{ fontSize: 12, color: '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>Losing</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#ef4444' }}>{losing}</div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', fontWeight: 700 }}>Market Position</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: healthScore >= 50 ? '#10b981' : '#f59e0b' }}>{healthScore}%</div>
                <span style={{ fontSize: 12, color: C.muted }}>Beaten</span>
              </div>
              <div style={{ fontSize: 12, color: healthScore >= 50 ? '#10b981' : '#f59e0b', marginTop: 4, fontWeight: 600 }}>
                {healthScore >= 80 ? '★★★★★ Strong' : healthScore >= 50 ? '★★★☆☆ Average' : '★☆☆☆☆ Weak'}
              </div>
            </div>
          </div>

          {/* ═══ Table ═══ */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {isLoadingRivals ? (
              <div style={{ padding: 60, textAlign: 'center' }}><Loader2 className="spin" size={32} color={C.muted} style={{ margin: '0 auto' }}/></div>
            ) : rivals.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <Target size={42} color={C.border} style={{ margin: '0 auto 16px' }} />
                <p style={{ color: C.muted }}>No competitors added yet.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: '16px 20px', color: C.muted, fontWeight: 600 }}>Competitor</th>
                    <th style={{ padding: '16px 20px', color: C.muted, fontWeight: 600 }}>City / Keyword</th>
                    <th style={{ padding: '16px 20px', color: C.muted, fontWeight: 600 }}>Their Rank vs Our Rank</th>
                    <th style={{ padding: '16px 20px', color: C.muted, fontWeight: 600 }}>Their Reviews vs Our Reviews</th>
                    <th style={{ padding: '16px 20px', color: C.muted, fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '16px 20px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rivals.map(rival => {
                    const m = rival.metrics;
                    let statusLabel = '—';
                    let statusColor = C.muted;
                    let statusBg = 'transparent';

                    if (m) {
                      if (m.status === 'winning') {
                        statusLabel = '✅ We\'re Winning';
                        statusColor = '#10b981';
                        statusBg = 'rgba(16, 185, 129, 0.1)';
                      } else if (m.status === 'losing') {
                        statusLabel = '❌ We\'re Losing';
                        statusColor = '#ef4444';
                        statusBg = 'rgba(239, 68, 68, 0.1)';
                      } else if (m.status === 'watch_closely') {
                        statusLabel = '⚠️ Watch Closely';
                        statusColor = '#f59e0b';
                        statusBg = 'rgba(245, 158, 11, 0.1)';
                      }
                    }

                    return (
                      <tr key={rival.id} style={{ borderBottom: `1px solid ${C.border}`, background: 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 600, color: '#fff' }}>
                          <a href={rival.gbp_url} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'none' }}>{rival.competitor_name}</a>
                        </td>
                        <td style={{ padding: '16px 20px', color: C.muted }}>
                          {rival.city} <br />
                          <span style={{ fontSize: 11, opacity: 0.7 }}>{rival.keyword}</span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {m ? (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#fff' }}>#{m.their_rank}</span>
                              <span style={{ color: C.muted, fontSize: 11 }}>vs</span>
                              <span style={{ fontWeight: 700, color: '#93c5fd' }}>#{m.our_rank}</span>
                            </div>
                          ) : <span style={{ color: C.muted }}>Pending</span>}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {m ? (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#fff' }}>{m.their_reviews}</span>
                              <span style={{ color: C.muted, fontSize: 11 }}>vs</span>
                              <span style={{ fontWeight: 700, color: '#93c5fd' }}>{m.our_reviews}</span>
                            </div>
                          ) : <span style={{ color: C.muted }}>Pending</span>}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {m ? (
                            <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: statusColor, background: statusBg }}>
                              {statusLabel}
                            </span>
                          ) : <span style={{ color: C.muted }}>Pending</span>}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <button onClick={() => handleDelete(rival.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ═══ Add Modal ═══ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 80, zIndex: 9999 }}>
          <div ref={modalRef} style={{ background: C.surface, width: '100%', maxWidth: 500, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)', animation: 'slideUp 0.2s ease-out' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Add Competitor</h2>
                <p style={{ margin: 0, color: C.muted, fontSize: 12, marginTop: 4 }}>Track their rankings & reviews</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, cursor: 'pointer' }}>
                <X size={16} color={C.muted} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Competitor Name / Location Search *</label>
                <input ref={autocompleteInputRef} name="competitor_name" value={formData.competitor_name} onChange={handleInputChange} placeholder="E.g. Digital Wave Academy" style={{ ...inputStyle, border: `1px solid ${errors.competitor_name ? '#ef4444' : C.border}` }} />
                {errors.competitor_name && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.competitor_name}</span>}
              </div>

              <div>
                <label style={labelStyle}>GBP URL</label>
                <input name="gbp_url" value={formData.gbp_url} onChange={handleInputChange} placeholder="https://maps.google.com/..." style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>City</label>
                  <input name="city" value={formData.city} onChange={handleInputChange} placeholder="E.g. Pondicherry" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Target Keyword</label>
                  <input name="keyword" value={formData.keyword} onChange={handleInputChange} placeholder="E.g. Best Digital Marketing..." style={inputStyle} />
                </div>
              </div>

              <button type="submit" disabled={isSaving} style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: 'none', padding: '12px', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8 }}>
                {isSaving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} Save Competitor
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Find Competitors Modal ═══ */}
      {showFindModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 80, zIndex: 9999 }}>
          <div ref={findModalRef} style={{ background: C.surface, width: '100%', maxWidth: 550, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)', animation: 'slideUp 0.2s ease-out', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Auto-Find Competitors</h2>
                <p style={{ margin: 0, color: C.muted, fontSize: 12, marginTop: 4 }}>Search maps for similar businesses in your area</p>
              </div>
              <button onClick={() => setShowFindModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, cursor: 'pointer' }}>
                <X size={16} color={C.muted} />
              </button>
            </div>
            
            <form onSubmit={executeFindSearch} style={{ padding: '20px 24px', display: 'flex', gap: 12, borderBottom: `1px solid ${C.border}` }}>
              <input 
                value={findQuery} 
                onChange={e => setFindQuery(e.target.value)} 
                placeholder="E.g. Dentists in Pondicherry" 
                style={{ ...inputStyle, flex: 1 }} 
              />
              <button type="submit" disabled={isSearching || !findQuery} style={{ background: '#3b82f6', border: 'none', padding: '0 20px', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: isSearching ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {isSearching ? <Loader2 size={16} className="spin" /> : <Search size={16} />} Search
              </button>
            </form>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
              {isSearching ? (
                <div style={{ padding: 40, textAlign: 'center', color: C.muted }}><Loader2 className="spin" size={24} style={{ margin: '0 auto 12px' }} /> Searching Google Maps...</div>
              ) : suggestions.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>No suggestions yet. Enter a query and search.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {suggestions.map(place => {
                    const isAdded = rivals.some(r => r.place_id === place.place_id);
                    return (
                      <div key={place.place_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 10 }}>
                        <div style={{ flex: 1, paddingRight: 16 }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#fff', fontWeight: 600 }}>{place.name}</h4>
                          <p style={{ margin: 0, fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {place.rating && <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {place.rating} ({place.user_ratings_total})</span>}
                            {place.formatted_address}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleAddSuggestion(place)}
                          disabled={isAdded}
                          style={{ background: isAdded ? 'transparent' : 'rgba(16, 185, 129, 0.1)', border: isAdded ? `1px solid ${C.border}` : '1px solid rgba(16, 185, 129, 0.3)', color: isAdded ? C.muted : '#10b981', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: isAdded ? 'default' : 'pointer' }}
                        >
                          {isAdded ? 'Added' : '+ Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .pac-container {
          background-color: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          color: #e2e8f0;
          z-index: 10000 !important;
        }
        .pac-item {
          padding: 8px 12px;
          border-top: 1px solid #1e293b;
          color: #94a3b8;
          cursor: pointer;
        }
        .pac-item:hover, .pac-item-selected {
          background-color: #1e293b;
        }
        .pac-item-query {
          font-size: 14px;
          color: #e2e8f0;
        }
        .pac-logo:after {
          display: none;
        }
      `}</style>
    </div>
  );
}
