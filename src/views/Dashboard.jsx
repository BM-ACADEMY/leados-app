import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Users, Target, CheckCircle, BarChart2, AlertCircle } from 'lucide-react';
import { C } from '../constants/theme.js';
import { SectionHeader, Stat } from '../components/ui.jsx';
import { useLeads } from '../hooks/useLeads.js';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../services/api.js';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { leads: hotLeads } = useLeads({ status: 'hot' });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const leadsToday = stats ? stats.leads_today : 0;
  const hotLeadsCount = stats ? stats.hot_leads : 0;
  const convertedToday = stats ? stats.converted_today : 0;
  const revenueMonth = stats ? stats.revenue_month : 0;

  const formatRevenue = (val) => {
    if (val >= 1000) {
      return "Rs " + (val / 1000).toFixed(0) + "K";
    }
    return "Rs " + val;
  };

  const weeklyData = stats?.weekly && stats.weekly.length > 0
    ? stats.weekly.map((w) => ({ d: w.day, l: parseInt(w.leads || 0), c: parseInt(w.converted || 0) }))
    : [];

  const SOURCE_COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#64748b'];
  const sourceData = stats?.sources && stats.sources.length > 0
    ? stats.sources.map((s, i) => ({ name: s.source || 'Manual', v: parseInt(s.count || 0), c: SOURCE_COLORS[i % SOURCE_COLORS.length] }))
    : [];

  const funnelData = stats?.funnel
    ? [
      { s: "Total Leads", n: parseInt(stats.funnel.total || 0) },
      { s: "Contacted", n: parseInt(stats.funnel.contacted || 0) },
      { s: "Qualified", n: parseInt(stats.funnel.qualified || 0) },
      { s: "Hot Leads", n: parseInt(stats.funnel.hot || 0) },
      { s: "Converted", n: parseInt(stats.funnel.converted || 0) }
    ]
    : [];

  const displayHotLeads = hotLeads && hotLeads.length > 0 ? hotLeads : [];

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>Good morning, {user?.name?.split(' ')[0] || 'User'}</h1>
        <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {user?.brand_name || 'Brand'} Overview</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Stat label="Leads Today" value={leadsToday.toString()} change={12} Icon={Users} color={C.accent} />
        <Stat label="Hot Leads" value={hotLeadsCount.toString()} change={8} Icon={Target} color={C.red} />
        <Stat label="Converted" value={convertedToday.toString()} change={-2} Icon={CheckCircle} color={C.green} />
        <Stat label="Revenue This Month" value={formatRevenue(revenueMonth)} change={19} Icon={BarChart2} color={C.blue} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Leads This Week" />
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity={0.3} /><stop offset="100%" stopColor={C.accent} stopOpacity={0} /></linearGradient>
                <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.3} /><stop offset="100%" stopColor={C.green} stopOpacity={0} /></linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="l" name="Leads" stroke={C.accent} fill="url(#ga)" strokeWidth={2} />
              <Area type="monotone" dataKey="c" name="Converted" stroke={C.green} fill="url(#gg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Lead Sources" />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <PieChart width={120} height={120}>
              <Pie data={sourceData} dataKey="v" cx={55} cy={55} innerRadius={30} outerRadius={52} paddingAngle={3}>
                {sourceData.map((e, i) => <Cell key={i} fill={e.c} />)}
              </Pie>
            </PieChart>
            <div style={{ flex: 1 }}>
              {sourceData.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.c }} />
                    <span style={{ fontSize: 10, color: C.muted }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize: 10, color: C.text, fontWeight: 600 }}>{s.v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Revenue Trend" />
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={stats?.revenue_trend || []} barSize={22}>
              <XAxis dataKey="m" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => "Rs " + (v / 1000).toFixed(0) + "K"} contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="r" fill={C.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Conversion Funnel" />
          {funnelData.map((f, i) => (
            <div key={f.s} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: C.muted }}>{f.s}</span>
                <span style={{ fontSize: 10, color: C.text, fontWeight: 600 }}>{f.n}</span>
              </div>
              <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
                <div style={{ height: '100%', width: f.n ? ((f.n / Math.max(...funnelData.map(d => d.n), 1)) * 100) + '%' : '0%', background: 'rgba(249,115,22,' + (1 - i * 0.15) + ')', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#1a0800', border: '1px solid #7c2d12', borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AlertCircle size={15} color={C.accent} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, color: C.accent }}>HOT LEADS NEEDING ATTENTION</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {displayHotLeads.slice(0, 4).map((l) => (
            <div key={l.id} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 9, minWidth: 190 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.accent }}>{l.name[0]}</div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{l.name}</p>
                <p style={{ fontSize: 10, color: C.muted }}>{l.brand_name || l.brand || 'N/A'}</p>
              </div>
              <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: C.red }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
