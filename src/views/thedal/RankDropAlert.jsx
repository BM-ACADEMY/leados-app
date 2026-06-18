import React, { useState, useEffect } from 'react';
import { C } from '../../constants/theme.js';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';

export default function RankDropAlert() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/thedal/rankdropalert');
        if (res.data) setData(res.data);
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.background }}>
        <Loader2 size={32} color={C.accent} className="spin" />
      </div>
    );
  }

  const items = data?.items || [];

  return (
    <div style={{ padding: 30, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif" }}>Rank Drop Alert</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Dynamic data loaded from database.</p>
        </div>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>ID</th>
              <th style={{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}>DATA</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${C.border}55` }}>
                <td style={{ padding: '16px 0', fontSize: 14, color: '#e2e8f0' }}>{item.id}</td>
                <td style={{ padding: '16px 0', fontSize: 13 }}>{JSON.stringify(item)}</td>
              </tr>
            )) : (
              <tr><td colSpan={2} style={{ padding: '30px 0', textAlign: 'center', color: C.muted }}>No records found. Setup data in DB.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
