import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { C } from '../constants/theme.js';
import { api } from '../services/api.js';

export const ClientsView = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getClients();
      setClients(data.clients || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const displayClients = clients || [];
  const activeClients = displayClients.filter(c => c.status === 'active' || c.status === 'Live');
  
  const totalLeads = displayClients.reduce((a, b) => a + parseInt(b.lead_count || b.leads || 0), 0);
  const totalConverted = displayClients.reduce((a, b) => a + parseInt(b.converted_count || b.conv || 0), 0);
  const avgConv = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) + '%' : '0%';
  
  const totalMrr = displayClients.reduce((a, b) => a + parseInt(b.mrr || 0), 0);
  const mrrDisplay = totalMrr >= 1000 ? 'Rs ' + (totalMrr / 1000).toFixed(0) + 'K' : 'Rs ' + totalMrr;

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>Client Management</h1>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>External businesses using LeadOS via BM TechX {loading && '(loading...)'}</p>
        </div>
        <button style={{ background: C.accent, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={12} />Onboard Client</button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        {[
          ['Active', activeClients.length.toString(), C.green],
          ['Monthly Recurring', mrrDisplay, C.accent],
          ['Total Leads Managed', totalLeads.toString(), C.blue],
          ['Avg Conversion', avgConv, C.purple]
        ].map(([l, v, col]) => (
          <div key={l} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 11, padding: '14px 18px', flex: 1 }}>
            <p style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{l}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: col, fontFamily: "'Syne',sans-serif" }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {displayClients.map((cl) => {
          const leads = cl.lead_count ?? cl.leads ?? 0;
          const converted = cl.converted_count ?? cl.conv ?? 0;
          return (
            <div key={cl.id} style={{ background: C.card, border: '1px solid ' + (cl.status === 'active' ? C.border : C.dim), borderRadius: 14, padding: 20, opacity: cl.status === 'inactive' ? 0.65 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: C.accent + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: C.accent }}>{cl.name[0]}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{cl.name}</p>
                    <p style={{ fontSize: 10, color: C.muted }}>{cl.type || 'Business'} - {cl.joined || cl.created_at || 'N/A'}</p>
                  </div>
                </div>
                <span style={{ background: cl.status === 'active' ? '#0a2018' : '#1a1a1a', color: cl.status === 'active' ? C.green : C.muted, padding: '3px 9px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>{cl.status === 'active' ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ display: 'flex', gap: 11, marginBottom: 14 }}>
                {[['Leads', leads, C.blue], ['Converted', converted, C.green], ['Plan', cl.plan || 'N/A', C.accent]].map(([l, v, col]) => (
                  <div key={l} style={{ flex: 1, background: C.surface, borderRadius: 7, padding: '9px 11px', textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: col, fontFamily: "'Syne',sans-serif" }}>{v}</p>
                    <p style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{l}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button style={{ flex: 1, background: 'transparent', border: '1px solid ' + C.border, borderRadius: 7, color: C.muted, padding: '6px', fontSize: 11 }}>Dashboard</button>
                <button style={{ flex: 1, background: C.accent + '20', border: '1px solid ' + C.accentDim, borderRadius: 7, color: C.accent, padding: '6px', fontSize: 11, fontWeight: 600 }}>Manage</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
