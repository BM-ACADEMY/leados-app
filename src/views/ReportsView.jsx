import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Download } from 'lucide-react';
import { C } from '../constants/theme.js';
import { SectionHeader } from '../components/ui.jsx';
import { api } from '../services/api.js';

export const ReportsView = () => {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, clientsRes] = await Promise.all([
          api.getDashboardStats(),
          api.getClients()
        ]);
        setStats(statsRes);
        setClients(clientsRes.clients || []);
      } catch (err) {
        console.error('Error fetching reports data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const weeklyData = stats?.weekly?.map(d => ({ d: d.day, l: parseInt(d.leads), c: parseInt(d.converted) })) || [];

  const maxLeads = Math.max(...clients.map(c => parseInt(c.lead_count || 0)), 1);
  const colors = [C.accent, C.blue, C.purple, C.green, C.red];

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>Reports and Analytics</h1>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Full performance overview - all brands {loading && '(loading...)'}</p>
        </div>
        <button style={{ background: C.card, border: '1px solid ' + C.border, color: C.muted, padding: '7px 13px', borderRadius: 7, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}><Download size={12} />Export PDF</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Weekly Lead Volume" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} barSize={18} barGap={3}>
              <XAxis dataKey="d" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 7, fontSize: 11 }} />
              <Bar dataKey="l" name="Leads" fill={C.accent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="c" name="Converted" fill={C.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Revenue Growth" />
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats?.revenue_trend || []}>
              <XAxis dataKey="m" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => "Rs " + (v / 1000) + "K"} tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => "Rs " + (v / 1000).toFixed(0) + "K"} contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 7, fontSize: 11 }} />
              <Line type="monotone" dataKey="r" stroke={C.blue} strokeWidth={2.5} dot={{ fill: C.blue, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 20 }}>
        <SectionHeader title="Brand-Wise Summary" />
        {clients.length > 0 ? clients.map((c, i) => {
          const leads = parseInt(c.lead_count || 0);
          const conv = parseInt(c.converted_count || 0);
          const convRate = leads > 0 ? Math.round((conv / leads) * 100) + '%' : '0%';
          const col = colors[i % colors.length];
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: '1px solid ' + C.border }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: col, flexShrink: 0 }} />
              <div style={{ width: 150 }}><p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{c.name}</p></div>
              <div style={{ flex: 1, height: 5, background: C.border, borderRadius: 2 }}><div style={{ height: '100%', width: ((leads / maxLeads) * 100) + '%', background: col, borderRadius: 2 }} /></div>
              <div style={{ width: 55, textAlign: 'right' }}><p style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{leads}</p><p style={{ fontSize: 9, color: C.muted }}>leads</p></div>
              <div style={{ width: 50, textAlign: 'right' }}><p style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>{convRate}</p><p style={{ fontSize: 9, color: C.muted }}>conv</p></div>
              <div style={{ width: 70, textAlign: 'right' }}><p style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>{conv}</p></div>
            </div>
          );
        }) : (
          <div style={{ textAlign: 'center', padding: 20, color: C.muted }}>No brand data available</div>
        )}
      </div>
    </div>
  );
};
