import { useState, useEffect } from 'react';
import { Search, Upload, Download, Plus, Eye, Phone } from 'lucide-react';
import { C } from '../constants/theme.js';
import { Badge, ScoreBar } from '../components/ui.jsx';
import { useLeads } from '../hooks/useLeads.js';

export const LeadsView = ({ onLeadClick, refreshTrigger }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { leads: apiLeads, loading, error, refetch } = useLeads({ status: filter !== 'all' ? filter : undefined, search });

  useEffect(() => {
    if (refetch) refetch();
  }, [refreshTrigger]);

  const tabs = ['all', 'hot', 'warm', 'cold', 'converted'];
  const leads = apiLeads || [];
  const filtered = leads.filter((l) => (filter === 'all' || l.status === filter) && (l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)));

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>Lead Management</h1>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{leads.length} total leads {loading && '(loading...)'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: C.card, border: '1px solid ' + C.border, color: C.muted, padding: '7px 12px', borderRadius: 7, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}><Upload size={12} />Import CSV</button>
          <button style={{ background: C.card, border: '1px solid ' + C.border, color: C.muted, padding: '7px 12px', borderRadius: 7, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}><Download size={12} />Export</button>
          <button style={{ background: C.accent, border: 'none', color: '#fff', padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={12} />Add Lead</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#2d1010', border: '1px solid #7c2d12', borderRadius: 7, padding: 12, marginBottom: 18, color: '#ef4444', fontSize: 12 }}>
          Error loading leads: {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
        <div style={{ display: 'flex', background: C.card, border: '1px solid ' + C.border, borderRadius: 9, overflow: 'hidden' }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: '7px 13px', fontSize: 11, fontWeight: 600, border: 'none', background: filter === t ? C.accent : 'transparent', color: filter === t ? '#fff' : C.muted, textTransform: 'capitalize' }}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.card, border: '1px solid ' + C.border, borderRadius: 9, padding: '0 12px', height: 36 }}>
          <Search size={12} color={C.muted} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone..." style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 12, outline: 'none', width: 170 }} />
        </div>
      </div>

      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid ' + C.border }}>
              {['Lead', 'Phone', 'Source', 'Brand', 'Status', 'Score', 'Assigned', 'Last Contact', ''].map((h) => (
                <th key={h} style={{ padding: '11px 14px', fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => (
              <tr key={l.id} onClick={() => onLeadClick(l)} style={{ borderBottom: '1px solid ' + C.border, cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td style={{ padding: '13px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{l.name[0]}</div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{l.name}</p>
                      <p style={{ fontSize: 10, color: C.muted }}>{l.interest || 'N/A'}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '13px 14px', fontSize: 11, color: C.muted }}>{l.phone}</td>
                <td style={{ padding: '13px 14px' }}><span style={{ fontSize: 10, color: C.blue, background: '#0f1e38', padding: '2px 7px', borderRadius: 10 }}>{l.source || 'Manual'}</span></td>
                <td style={{ padding: '13px 14px', fontSize: 11, color: C.muted }}>{l.brand_name || 'N/A'}</td>
                <td style={{ padding: '13px 14px' }}><Badge status={l.status} /></td>
                <td style={{ padding: '13px 14px' }}><ScoreBar score={l.score || 0} /></td>
                <td style={{ padding: '13px 14px', fontSize: 11, color: C.muted }}>{l.assigned_name || 'Unassigned'}</td>
                <td style={{ padding: '13px 14px', fontSize: 10, color: C.dim }}>{l.last_contact || 'N/A'}</td>
                <td style={{ padding: '13px 14px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); onLeadClick(l); }}><Eye size={11} color={C.muted} /></button>
                    <button style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={11} color={C.muted} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>No leads match this filter</div>}
        {loading && <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>Loading leads...</div>}
      </div>
    </div>
  );
};
