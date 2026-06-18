import React, { useState, useEffect } from 'react';
import { C } from '../../constants/theme.js';
import { Target, Search, Plus, Loader2, Sparkles } from 'lucide-react';
import { api } from '../../services/api.js';

export default function GapHunter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState('all');

  useEffect(() => {
    const fetchGaps = async () => {
      try {
        const res = await api.get('/thedal/gap-hunter');
        if (res.data) setData(res.data);
      } catch (err) {
        console.error('Failed to load gap hunter data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGaps();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.background }}>
        <Loader2 size={32} color={C.accent} className="spin" />
      </div>
    );
  }

  const { clients = [], opportunities = [] } = data || {};
  const filteredOps = selectedClient === 'all' 
    ? opportunities 
    : opportunities.filter(o => o.client_id === Number(selectedClient));

  return (
    <div style={{ padding: 30, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif" }}>Gap Hunter</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>AI-powered keyword opportunities and content gaps.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select 
            value={selectedClient} 
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '8px 16px', borderRadius: 8, color: C.text, fontSize: 13, outline: 'none' }}
          >
            <option value="all">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.domain}</option>
            ))}
          </select>
          <button style={{ background: `linear-gradient(135deg, ${C.accent}, #ea580c)`, border: 'none', padding: '8px 16px', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} /> Generate More Ideas
          </button>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Search size={18} color={C.muted} />
          <input 
            type="text" 
            placeholder="Search keyword opportunities..." 
            style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 14, outline: 'none', width: '100%' }}
          />
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>KEYWORD</th>
              <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>VOLUME</th>
              <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>KD</th>
              <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>INTENT</th>
              <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>AI SUGGESTION REASON</th>
              <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600, textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredOps.length > 0 ? filteredOps.map((op) => (
              <tr key={op.id} style={{ borderBottom: `1px solid ${C.border}55` }}>
                <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{op.keyword}</td>
                <td style={{ padding: '16px 0', fontSize: 13 }}>{op.volume.toLocaleString()}</td>
                <td style={{ padding: '16px 0', fontSize: 13 }}>
                  <span style={{ padding: '3px 8px', borderRadius: 4, background: op.difficulty < 30 ? 'rgba(34,197,94,0.15)' : op.difficulty < 50 ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)', color: op.difficulty < 30 ? '#22c55e' : op.difficulty < 50 ? '#eab308' : '#ef4444', fontWeight: 700 }}>
                    {op.difficulty}
                  </span>
                </td>
                <td style={{ padding: '16px 0', fontSize: 12 }}>
                  <span style={{ padding: '3px 8px', borderRadius: 4, border: `1px solid ${C.border}`, color: C.muted, background: C.background }}>{op.intent}</span>
                </td>
                <td style={{ padding: '16px 0', fontSize: 13, color: '#94a3b8', maxWidth: 300, lineHeight: 1.4 }}>{op.reason}</td>
                <td style={{ padding: '16px 0', textAlign: 'right' }}>
                  <button style={{ background: `${C.accent}22`, color: C.accent, border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={14} /> Track
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} style={{ padding: '30px 0', textAlign: 'center', color: C.muted }}>No opportunities found. Run a new scan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
