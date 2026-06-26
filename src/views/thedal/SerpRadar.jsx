import React, { useState } from 'react';
import { C } from '../../constants/theme.js';
import { Loader2, Search, Activity, ArrowUpRight, ArrowDownRight, AlertTriangle, CloudRain, Sun, Cloud, Zap, MapPin, Video, ShoppingCart, Image as ImageIcon, MessageSquare, Flame } from 'lucide-react';
import { api } from '../../services/api.js';
import toast from 'react-hot-toast';

export default function SerpRadar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');

  const handleLiveScan = async () => {
    const q = keyword.trim().toLowerCase();
    if (!q) return;
    setLoading(true);
    setError('');

    // Check 24-hour cache
    const cacheKey = `serp_radar_cache_${q}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { timestamp, payload } = JSON.parse(cached);
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setData(payload);
          setLoading(false);
          toast.success('Loaded from 24h search cache');
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached SERP data', e);
      }
    }
    
    try {
      const res = await api.post('/thedal/serpradar/scan', { keyword: keyword.trim() });
      if (res) {
        setData(res);
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), payload: res }));
      }
    } catch (err) {
      console.error('Failed to load live SERP Radar data', err);
      const msg = err.response?.data?.error || err.message || 'Failed to pull live SERP data.';
      setError(`Error: ${msg}. If you just added the API key to .env, please restart your backend server.`);
    } finally {
      setLoading(false);
    }
  };

  // Weather Styling based on Volatility Status
  const getWeatherStyle = (status) => {
    switch(status) {
      case 'Calm': return { color: '#22c55e', icon: <Sun size={48} color="#22c55e" /> };
      case 'Moderate': return { color: '#eab308', icon: <Cloud size={48} color="#eab308" /> };
      case 'High': return { color: '#f97316', icon: <CloudRain size={48} color="#f97316" /> };
      case 'Extreme': return { color: '#ef4444', icon: <Zap size={48} color="#ef4444" /> };
      default: return { color: '#3b82f6', icon: <Activity size={48} color="#3b82f6" /> };
    }
  };

  const weather = data ? getWeatherStyle(data.volatility?.status) : null;

  // SERP Feature Colors and Icons
  const featureConfig = [
    { key: 'localPack', label: 'Local Map Pack', icon: <MapPin size={16} />, color: '#3b82f6' },
    { key: 'peopleAlsoAsk', label: 'People Also Ask', icon: <MessageSquare size={16} />, color: '#8b5cf6' },
    { key: 'featuredSnippet', label: 'Featured Snippet', icon: <Flame size={16} />, color: '#f59e0b' },
    { key: 'imagePack', label: 'Image Carousel', icon: <ImageIcon size={16} />, color: '#ec4899' },
    { key: 'videoCarousel', label: 'Video Carousel', icon: <Video size={16} />, color: '#ef4444' },
    { key: 'shoppingAds', label: 'Shopping Ads', icon: <ShoppingCart size={16} />, color: '#10b981' }
  ];

  return (
    <div style={{ padding: 40, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif" }}>SERP Radar (LIVE)</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Continuous Google search surveillance powered by SerpApi.</p>
        </div>

        {/* Live Search Input Box */}
        <div style={{ display: 'flex', gap: 12, background: C.surface, padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, alignItems: 'center' }}>
          <Search size={18} color={C.muted} />
          <input 
            type="text" 
            placeholder="Enter target keyword..." 
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 14, outline: 'none', width: 200 }}
            onKeyDown={e => e.key === 'Enter' && handleLiveScan()}
          />
          <button 
            onClick={handleLiveScan}
            disabled={loading || !keyword.trim()}
            style={{ background: C.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (loading || !keyword.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: (loading || !keyword.trim()) ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <Activity size={16} />}
            {loading ? 'Scanning Google...' : 'Live Scan'}
          </button>
        </div>
      </div>

      {data && data.demo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px 20px', borderRadius: 8, marginBottom: 24, color: '#f59e0b', fontSize: 13, fontWeight: 500 }}>
          <AlertTriangle size={16} />
          <span><strong>Demo Mode Active:</strong> Showing simulated keyword volatility and competitor threat index because no live SERP API key was found in the backend configuration.</span>
        </div>
      )}

      {error && (
        <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 400, alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={40} color="#3b82f6" className="spin" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#fff', fontSize: 20 }}>Pulling Live Data from Google...</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>Extracting top 100 competitors and SERP features.</p>
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 400, alignItems: 'center', justifyContent: 'center', background: C.surface, borderRadius: 12, border: `1px dashed ${C.border}` }}>
          <Activity size={48} color={C.muted} style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#fff', fontSize: 20 }}>Ready to Scan</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>Enter a keyword above to pull live SERP data directly from Google.</p>
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Results for:</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.accent, background: 'rgba(59, 130, 246, 0.1)', padding: '4px 12px', borderRadius: 20 }}>"{data.keyword}"</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            
            {/* ① SERP Weather Gauge */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              
              <div style={{ position: 'absolute', top: -50, right: -50, opacity: 0.05, transform: 'scale(3)' }}>
                {weather.icon}
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 24px 0', alignSelf: 'flex-start' }}>SERP Volatility Weather</h3>
              
              <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: `12px solid ${weather.color}33`, borderTopColor: weather.color }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 56, fontWeight: 800, color: weather.color, lineHeight: 1 }}>{data.volatility.score}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 4 }}>{data.volatility.status}</div>
                </div>
              </div>

              <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={18} color={weather.color} />
                <span style={{ fontSize: 14, color: '#e2e8f0' }}>{data.volatility.message}</span>
              </div>
            </div>

            {/* ③ Competitor Movement Board */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 30, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 24px 0' }}>Competitor Intrusion Radar (Top 5)</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {data.competitors?.map((comp, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                        {idx + 1}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{comp.domain}</span>
                      {comp.isNew && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: 12, textTransform: 'uppercase' }}>New Threat</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: comp.trend === 'up' ? '#22c55e' : (comp.trend === 'down' ? '#ef4444' : '#94a3b8') }}>
                      {comp.trend === 'up' && <ArrowUpRight size={18} />}
                      {comp.trend === 'down' && <ArrowDownRight size={18} />}
                      {comp.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ② SERP Feature Breakdown */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 30 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 24px 0' }}>Live SERP Features Detected</h3>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 30 }}>Specialized Google results blocks triggered by this specific keyword today.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px 40px' }}>
              {featureConfig.map(feat => {
                const percentage = data.features[feat.key] || 0;
                return (
                  <div key={feat.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
                        <div style={{ color: feat.color }}>{feat.icon}</div>
                        {feat.label}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: feat.color }}>{percentage}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percentage}%`, background: feat.color, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
