import React, { useState, useEffect } from 'react';
import { C } from '../../constants/theme.js';
import { TrendingUp, TrendingDown, Minus, Search, Activity, Target, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';

export default function ThedalHQ() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/thedal/stats');
        if (res.data) {
          setData(res.data);
        }
      } catch (error) {
        console.error('Failed to load Thedal stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.background }}>
        <Loader2 size={32} color={C.accent} className="spin" />
      </div>
    );
  }

  const { clients = [], recentKeywords = [], stats = {} } = data || {};

  return (
    <div style={{ padding: 30, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif" }}>Thedal HQ</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Organic Search Domination Overview</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '8px 16px', borderRadius: 8, color: C.text, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color={C.accent} /> Run Global Scan
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 30 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={20} color={C.accent} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>TOTAL KEYWORDS</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0' }}>{stats.totalKeywords || 0}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>Tracked across {clients.length} clients</div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={20} color="#22c55e" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>TOP 3 RANKINGS</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0' }}>{stats.top3Rankings || 0}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={14} /> Growing steadily
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>AVG RANK CHANGE</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0' }}>+2.4</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Across all active campaigns</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Recent Rank Movements */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#e2e8f0' }}>Recent Rank Movements</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>CLIENT</th>
                <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>KEYWORD</th>
                <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>OLD</th>
                <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>NEW</th>
                <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600, textAlign: 'right' }}>TREND</th>
              </tr>
            </thead>
            <tbody>
              {recentKeywords.length > 0 ? recentKeywords.map((item) => {
                const delta = item.best_rank - item.current_rank;
                const status = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}55` }}>
                    <td style={{ padding: '14px 0', fontSize: 13, fontWeight: 600 }}>{item.client_domain}</td>
                    <td style={{ padding: '14px 0', fontSize: 13, color: '#94a3b8' }}>{item.keyword}</td>
                    <td style={{ padding: '14px 0', fontSize: 13 }}>#{item.best_rank || '-'}</td>
                    <td style={{ padding: '14px 0', fontSize: 13, fontWeight: 700 }}>#{item.current_rank || '-'}</td>
                    <td style={{ padding: '14px 0', textAlign: 'right' }}>
                      {status === 'up' && <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12} /> +{delta}</span>}
                      {status === 'down' && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><TrendingDown size={12} /> {Math.abs(delta)}</span>}
                      {status === 'same' && <span style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Minus size={12} /> 0</span>}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} style={{ padding: '20px 0', textAlign: 'center', color: C.muted }}>No keywords tracked yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Client Health Radar */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#e2e8f0' }}>Client SEO Health</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {clients.map((client) => (
              <div key={client.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{client.domain}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 100, height: 6, background: `${C.border}`, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${client.score}%`, background: client.score > 80 ? '#22c55e' : client.score > 60 ? '#eab308' : '#ef4444', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, width: 28, textAlign: 'right' }}>{client.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
