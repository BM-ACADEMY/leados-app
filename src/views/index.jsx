import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  Users, Target, CheckCircle, BarChart2, AlertCircle, Search,
  Upload, Download, Eye, Phone, Zap, FileText, Brain, Edit2,
  Plus, Copy, Send
} from 'lucide-react';
import { C } from '../constants/theme.js';
import { SectionHeader, Stat, Badge, ScoreBar, TBadge } from '../components/ui.jsx';
import { useLeads, useLead } from '../hooks/useLeads.js';
import { useTemplates } from '../hooks/useTemplates.js';
import { api } from '../services/api.js';
import { LEADS, INBOX, TEMPLATES, CAMPAIGNS, CLIENTS, W7, REV, SRC, FNL, CONVO, BRANDS } from '../data/mockData.js';

export const Dashboard = () => {
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

  // Format revenue helper
  const formatRevenue = (val) => {
    if (val >= 1000) {
      return "Rs " + (val / 1000).toFixed(0) + "K";
    }
    return "Rs " + val;
  };

  // Weekly Leads AreaChart Data mapping
  const weeklyData = stats?.weekly && stats.weekly.length > 0
    ? stats.weekly.map((w) => ({ d: w.day, l: parseInt(w.leads || 0), c: parseInt(w.converted || 0) }))
    : W7;

  // Sources PieChart Data mapping
  const SOURCE_COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#64748b'];
  const sourceData = stats?.sources && stats.sources.length > 0
    ? stats.sources.map((s, i) => ({ name: s.source || 'Manual', v: parseInt(s.count || 0), c: SOURCE_COLORS[i % SOURCE_COLORS.length] }))
    : SRC;

  // Funnel Mapping
  const funnelData = stats?.funnel
    ? [
      { s: "Total Leads", n: parseInt(stats.funnel.total || 0) },
      { s: "Contacted", n: parseInt(stats.funnel.contacted || 0) },
      { s: "Qualified", n: parseInt(stats.funnel.qualified || 0) },
      { s: "Hot Leads", n: parseInt(stats.funnel.hot || 0) },
      { s: "Converted", n: parseInt(stats.funnel.converted || 0) }
    ]
    : FNL;

  const displayHotLeads = hotLeads && hotLeads.length > 0 ? hotLeads : LEADS.filter(l => l.status === 'hot');

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>Good morning, Kamar</h1>
        <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ABM Groups Overview</p>
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
            <BarChart data={REV} barSize={22}>
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

export const LeadsView = ({ onLeadClick, refreshTrigger }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { leads: apiLeads, loading, error, refetch } = useLeads({ status: filter !== 'all' ? filter : undefined, search });

  useEffect(() => {
    if (refetch) refetch();
  }, [refreshTrigger]);

  const tabs = ['all', 'hot', 'warm', 'cold', 'converted'];
  const leads = apiLeads.length > 0 ? apiLeads : LEADS;
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

export const InboxView = () => {
  const [search, setSearch] = useState('');
  const { leads, loading: loadingLeads } = useLeads({ search });
  const [activeLeadId, setActiveLeadId] = useState(null);
  const { lead: activeLead, conversations, refetch: refetchLead, loading: loadingLead } = useLead(activeLeadId);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  // Set first lead as active when leads load
  useEffect(() => {
    if (leads && leads.length > 0 && !activeLeadId) {
      setActiveLeadId(leads[0].id);
    }
  }, [leads, activeLeadId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!msg.trim() || !activeLeadId || sending) return;
    setSending(true);
    try {
      await api.sendWhatsAppMessage(activeLeadId, msg);
      setMsg('');
      refetchLead();
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const displayLeads = leads && leads.length > 0 ? leads : LEADS;
  const activeObj = displayLeads.find(l => l.id === activeLeadId) || displayLeads[0];
  const displayConvo = activeLeadId && activeLead ? conversations : CONVO;

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      <div style={{ width: 290, borderRight: '1px solid ' + C.border, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 14px', borderBottom: '1px solid ' + C.border }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 11 }}>WhatsApp Inbox</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.card, border: '1px solid ' + C.border, borderRadius: 7, padding: '7px 11px' }}>
            <Search size={11} color={C.muted} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 11, outline: 'none', width: '100%' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {displayLeads.map((l) => (
            <div key={l.id} onClick={() => setActiveLeadId(l.id)} style={{ padding: '13px 14px', borderBottom: '1px solid ' + C.border, cursor: 'pointer', background: activeLeadId === l.id ? C.accent + '10' : 'transparent', borderLeft: activeLeadId === l.id ? '3px solid ' + C.accent : '3px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{l.name[0]}</div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{l.name}</p>
                    <p style={{ fontSize: 9, color: C.muted }}>{l.brand_name || l.brand || 'Manual'}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 9, color: C.dim }}>{l.last_contact ? new Date(l.last_contact).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                </div>
              </div>
              <p style={{ fontSize: 10, color: C.muted, paddingLeft: 40, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.interest || 'No custom details'}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.accent }}>{activeObj?.name[0]}</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{activeObj?.name}</p>
              <p style={{ fontSize: 9, color: C.green }}>AI Agent Active - {activeObj?.brand_name || activeObj?.brand || 'Manual'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 7, padding: '5px 11px', color: C.muted, fontSize: 11 }}>Take Over</button>
            <button style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 7, padding: '5px 11px', color: C.muted, fontSize: 11 }}>View Lead</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 11, background: C.bg + '88' }}>
          {displayConvo.map((m, i) => {
            const isLead = m.direction === 'inbound' || m.from === 'lead';
            const isAI = m.sender === 'ai' || m.from === 'ai';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: isLead ? 'flex-start' : 'flex-end' }}>
                <div style={{ maxWidth: '60%', background: isLead ? C.card : C.accent + '20', border: '1px solid ' + (isLead ? C.border : C.accentDim), borderRadius: isLead ? '4px 13px 13px 13px' : '13px 4px 13px 13px', padding: '9px 13px' }}>
                  {isAI && <p style={{ fontSize: 8, color: C.accent, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>AI AGENT</p>}
                  {!isLead && !isAI && <p style={{ fontSize: 8, color: C.blue, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>HUMAN AGENT</p>}
                  <p style={{ fontSize: 12, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{m.message || m.text}</p>
                  <p style={{ fontSize: 9, color: C.muted, marginTop: 4, textAlign: 'right' }}>
                    {m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : m.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={handleSend} style={{ padding: 14, borderTop: '1px solid ' + C.border, display: 'flex', gap: 9 }}>
          <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type manual message (overrides AI for this reply)..." style={{ flex: 1, background: C.card, border: '1px solid ' + C.border, borderRadius: 11, padding: '10px 13px', color: C.text, fontSize: 12, outline: 'none' }} />
          <button type="submit" disabled={sending} style={{ background: C.accent, border: 'none', width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Send size={15} color='#fff' />
          </button>
        </form>
      </div>
    </div>
  );
};

export const CampaignsView = () => {
  const [tab, setTab] = useState('list');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states for creating a campaign
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [targetStatus, setTargetStatus] = useState('new');
  const [scheduledAt, setScheduledAt] = useState('');
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCampaigns();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormMetadata = async () => {
    try {
      const clientsData = await api.getClients();
      const templatesData = await api.getTemplates();
      setClients(clientsData.clients || []);
      setTemplates(templatesData.templates || []);
    } catch (err) {
      console.error('Error fetching metadata:', err.message);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchFormMetadata();
  }, []);

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (!name || !clientId || !templateId) {
      alert('Please fill out Campaign Name, Brand, and Template');
      return;
    }
    setSubmitting(true);
    try {
      await api.createCampaign({
        name,
        client_id: parseInt(clientId),
        template_id: parseInt(templateId),
        target_status: targetStatus,
        scheduled_at: scheduledAt || null
      });
      alert('Campaign created and scheduled successfully!');
      setName('');
      setTab('list');
      fetchCampaigns();
    } catch (err) {
      alert('Failed to launch campaign: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayCampaigns = campaigns && campaigns.length > 0 ? campaigns : CAMPAIGNS;
  const statC = { completed: { tc: C.green, bg: '#0a2018' }, running: { tc: C.accent, bg: '#2d1a0a' }, scheduled: { tc: C.blue, bg: '#0f1e38' } };

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>Bulk Campaigns</h1>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Send bulk WhatsApp messages using approved templates {loading && '(loading...)'}</p>
        </div>
        <button onClick={() => setTab('create')} style={{ background: C.accent, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={12} />New Campaign</button>
      </div>
      <div style={{ display: 'flex', background: C.card, border: '1px solid ' + C.border, borderRadius: 9, overflow: 'hidden', marginBottom: 18, width: 'fit-content' }}>
        {['list', 'create'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', fontSize: 12, fontWeight: 600, border: 'none', background: tab === t ? C.accent : 'transparent', color: tab === t ? '#fff' : C.muted, textTransform: 'capitalize' }}>{t === 'list' ? 'Campaign List' : 'Create Campaign'}</button>
        ))}
      </div>
      {tab === 'list' ? (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            {[['Total', displayCampaigns.length.toString(), C.accent], ['Running', displayCampaigns.filter(c => c.status === 'running').length.toString(), C.green], ['Total Sent', displayCampaigns.reduce((a, b) => a + parseInt(b.sent_count || b.sent || 0), 0).toString(), C.blue], ['Avg Read', '74%', C.purple]].map(([l, v, col]) => (
              <div key={l} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 11, padding: '14px 18px', flex: 1 }}>
                <p style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{l}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: col, fontFamily: "'Syne',sans-serif" }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid ' + C.border }}>
                  {['Campaign', 'Brand', 'Sent', 'Delivered', 'Read', 'Replied', 'Status', 'Date'].map((h) => (
                    <th key={h} style={{ padding: '11px 14px', fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayCampaigns.map((c) => {
                  const s = statC[c.status] || statC.completed;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid ' + C.border }}>
                      <td style={{ padding: '13px 14px', fontSize: 12, fontWeight: 600, color: C.text }}>{c.name}</td>
                      <td style={{ padding: '13px 14px', fontSize: 11, color: C.muted }}>{c.brand_name || c.brand || 'All Brands'}</td>
                      <td style={{ padding: '13px 14px', fontSize: 12, color: C.text }}>{c.sent_count ?? c.sent ?? 0}</td>
                      <td style={{ padding: '13px 14px', fontSize: 12, color: C.green }}>{c.delivered_count ?? c.delivered ?? 0}</td>
                      <td style={{ padding: '13px 14px', fontSize: 12, color: C.blue }}>{c.read_count ?? c.read ?? 0}</td>
                      <td style={{ padding: '13px 14px', fontSize: 12, color: C.accent }}>{c.replied_count ?? c.replied ?? 0}</td>
                      <td style={{ padding: '13px 14px' }}><span style={{ background: s.bg, color: s.tc, padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{c.status}</span></td>
                      <td style={{ padding: '13px 14px', fontSize: 11, color: C.dim }}>{c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : c.date || 'Immediate'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <form onSubmit={handleLaunch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 22 }}>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Campaign Setup</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Campaign Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Academy June Batch" style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Select Brand</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }}>
                <option value="">Select Brand</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Target Audience Status</label>
              <select value={targetStatus} onChange={(e) => setTargetStatus(e.target.value)} style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }}>
                <option value="new">New leads</option>
                <option value="warm">Warm leads</option>
                <option value="cold">Cold leads</option>
                <option value="hot">Hot leads</option>
                <option value="all">All leads</option>
              </select>
            </div>
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 22 }}>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Message & Schedule</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Select Approved Template</label>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }}>
                <option value="">Select Template</option>
                {templates.filter((t) => t.status === 'approved' || t.status === 'active' || t.status === 'draft').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, padding: 13, marginBottom: 14 }}>
              <p style={{ fontSize: 9, color: C.muted, marginBottom: 7, letterSpacing: 0.8 }}>PREVIEW</p>
              <div style={{ background: C.accent + '15', border: '1px solid ' + C.accentDim, borderRadius: 9, padding: 11 }}>
                <p style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>
                  {templateId ? (templates.find(t => t.id === parseInt(templateId))?.body || 'No template preview available') : 'Please select a template to see details.'}
                </p>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Schedule Time (Leave empty for immediate)</label>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }} />
            </div>
            <button type="submit" disabled={submitting} style={{ width: '100%', background: C.accent, border: 'none', borderRadius: 9, padding: 13, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {submitting ? 'Launching...' : 'Launch Campaign'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export const TemplatesView = () => {
  const { templates: apiTemplates, loading, error } = useTemplates();
  const templates = apiTemplates.length > 0 ? apiTemplates : TEMPLATES;

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>Template Management</h1>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Create, submit and track Meta WhatsApp template approvals</p>
        </div>
        <button style={{ background: C.accent, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={12} />Create Template</button>
      </div>

      {error && (
        <div style={{ background: '#2d1010', border: '1px solid #7c2d12', borderRadius: 7, padding: 12, marginBottom: 18, color: '#ef4444', fontSize: 12 }}>
          Error loading templates: {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        {[['Approved', templates.filter((t) => t.status === 'approved').length, C.green], ['Pending', templates.filter((t) => t.status === 'pending').length, C.accent], ['Rejected', templates.filter((t) => t.status === 'rejected').length, C.red], ['Draft', templates.filter((t) => t.status === 'draft').length, C.muted]].map(([l, v, col]) => (
          <div key={l} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 11, padding: '13px 18px', flex: 1 }}>
            <p style={{ fontSize: 10, color: C.muted, marginBottom: 5 }}>{l}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: col, fontFamily: "'Syne',sans-serif" }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid ' + C.border }}>
              {['Template Name', 'Category', 'Brand', 'Status', 'Submitted', 'Approved', 'Uses', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '11px 14px', fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid ' + C.border }}>
                <td style={{ padding: '13px 14px' }}><span style={{ fontFamily: 'monospace', fontSize: 11, color: C.accent, background: C.accent + '10', padding: '2px 7px', borderRadius: 5 }}>{t.name}</span></td>
                <td style={{ padding: '13px 14px' }}><span style={{ fontSize: 10, color: C.blue, background: '#0f1e38', padding: '2px 7px', borderRadius: 10 }}>{t.category || t.cat}</span></td>
                <td style={{ padding: '13px 14px', fontSize: 11, color: C.muted }}>{t.brand_name || t.brand}</td>
                <td style={{ padding: '13px 14px' }}><TBadge status={t.status} /></td>
                <td style={{ padding: '13px 14px', fontSize: 10, color: C.dim }}>{t.submitted_at || t.sub || '—'}</td>
                <td style={{ padding: '13px 14px', fontSize: 10, color: t.approved_at ? C.green : C.dim }}>{t.approved_at || t.apv || '—'}</td>
                <td style={{ padding: '13px 14px', fontSize: 12, color: C.text, fontWeight: 600 }}>{t.uses || 0}</td>
                <td style={{ padding: '13px 14px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button style={{ background: 'transparent', border: '1px solid ' + C.border, borderRadius: 5, color: C.muted, padding: '3px 9px', fontSize: 9 }}>Preview</button>
                    {t.status === 'rejected' && <button style={{ background: 'transparent', border: '1px solid ' + C.red + '40', borderRadius: 5, color: C.red, padding: '3px 9px', fontSize: 9 }}>Resubmit</button>}
                    {t.status === 'draft' && <button style={{ background: C.accent + '20', border: '1px solid ' + C.accentDim, borderRadius: 5, color: C.accent, padding: '3px 9px', fontSize: 9 }}>Submit</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>No templates found</div>}
        {loading && <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>Loading templates...</div>}
      </div>
    </div>
  );
};

export const AIBrainView = () => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [tab, setTab] = useState('product');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState({});

  const [productText, setProductText] = useState('');
  const [pricingList, setPricingList] = useState([]);
  const [objectionsList, setObjectionsList] = useState([]);
  const [proofList, setProofList] = useState([]);
  const [flowList, setFlowList] = useState([]);
  const [promptText, setPromptText] = useState('');

  const defaultPricing = [
    ['Video Editing', 'Rs 4,999', 'Rs 2,999', 'Rs 999 + Rs 2,000'],
    ['Digital Marketing', 'Rs 8,999', 'Rs 5,999', 'Rs 1,999 + Rs 4,000'],
    ['Full Stack Dev', 'Rs 18,000', 'Rs 15,000', 'Rs 5,000 x 3']
  ];

  const defaultObjections = [
    ['Too expensive', 'We have EMI - Rs 999 to start, rest after placement. Zero risk.'],
    ['Will think about it', 'Batch starts Monday, 3 seats left. Shall I hold one for 24 hours?'],
    ['Free content online', 'Free content gives info. We give placement + live projects. Different outcome.'],
    ['Not sure I will get a job', 'Last batch: 8 out of 10 placed in 60 days. Want to see their LinkedIn?']
  ];

  const defaultProof = [
    ['Placement Stat', '8 out of 10 students placed within 60 days in last batch'],
    ['Salary Proof', 'Student Ragul placed at Rs 18,000/month after 45-day course'],
    ['Google Reviews', '4.8 stars with 47 reviews - screenshot shareable'],
    ['Batch Photo', 'Completion photo from April 2026 cohort - 24 students']
  ];

  const defaultFlow = [
    ['Q1', 'Which course are you interested in?', ['Digital Marketing', 'Full Stack Dev', 'Video Editing']],
    ['Q2', 'Are you a student or working professional?', ['Student', 'Working Professional', 'Job Seeker']],
    ['Q3', 'Looking to join this month or next month?', ['This Month', 'Next Month', 'Just Exploring']]
  ];

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await api.getClients();
        setClients(res.clients || []);
        if (res.clients && res.clients.length > 0) {
          setSelectedClientId(res.clients[0].id);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    };
    loadClients();
  }, []);

  const selectedBrand = clients.find(c => c.id === selectedClientId);
  const selectedBrandName = selectedBrand?.name || 'BM Academy';

  useEffect(() => {
    if (!selectedClientId) return;
    const loadBrainDocs = async () => {
      setLoading(true);
      try {
        const res = await api.getBrainDocs(selectedClientId);
        const docMap = {};
        res.docs?.forEach(d => {
          docMap[d.doc_type] = d.content;
        });
        setDocs(docMap);
      } catch (err) {
        console.error('Error loading brain docs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadBrainDocs();
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) return;
    const productVal = docs.product || `${selectedBrandName} - skill-based training in Pondicherry.\n\nCourses:\n- Digital Marketing Pro (3 months)\n- Full Stack Development (4 months)\n- Video Editing Professional (45 days)\n\nMode: Offline + Online\nPlacement: Yes - dedicated placement cell\nCertification: Google, Meta certified`;

    let pricingVal = defaultPricing;
    try { if (docs.pricing) pricingVal = JSON.parse(docs.pricing); } catch (e) { }

    let objectionsVal = defaultObjections;
    try { if (docs.objections) objectionsVal = JSON.parse(docs.objections); } catch (e) { }

    let proofVal = defaultProof;
    try { if (docs.proof) proofVal = JSON.parse(docs.proof); } catch (e) { }

    let flowVal = defaultFlow;
    try { if (docs.flow) flowVal = JSON.parse(docs.flow); } catch (e) { }

    const promptVal = docs.prompt || `You are a friendly WhatsApp sales assistant for ${selectedBrandName}.\n\nRULES:\n- Keep replies SHORT (max 4-5 lines)\n- Be warm and natural, not robotic\n- Always end with ONE question\n- Respond in same language as lead\n\nPRODUCT: Digital Marketing, Full Stack Dev, Video Editing courses.\nPLACEMENT: 80% placed in 60 days.\n\nQUALIFYING ORDER:\n1. Which course interests you?\n2. Student or working professional?\n3. Joining this month or next?\n\nFLAGS:\n- PAYMENT_READY when lead agrees to pay\n- CALL_REQUESTED when lead wants call\n- LEAD_COLD after 3 failed attempts`;

    setProductText(productVal);
    setPricingList(pricingVal);
    setObjectionsList(objectionsVal);
    setProofList(proofVal);
    setFlowList(flowVal);
    setPromptText(promptVal);
  }, [docs, selectedClientId, selectedBrandName]);

  const handleRegeneratePrompt = () => {
    const pricingStr = pricingList.map(p => `${p[0]}: ${p[2]} (orig ${p[1]}) - EMI: ${p[3]}`).join('\n');
    const objectionsStr = objectionsList.map(o => `Objection: ${o[0]} -> AI Reply: ${o[1]}`).join('\n');
    const proofStr = proofList.map(p => `${p[0]}: ${p[1]}`).join('\n');
    const flowStr = flowList.map((q, i) => `Step ${i + 1}: ${q[1]} [Options: ${q[2].join(', ')}]`).join('\n');

    const generated = `You are a friendly WhatsApp sales assistant for ${selectedBrandName}.\n\nRULES:\n- Keep replies SHORT (max 4-5 lines)\n- Be warm and natural, not robotic\n- Always end with ONE question\n- Respond in same language as lead\n\nPRODUCT:\n${productText}\n\nPRICING:\n${pricingStr}\n\nOBJECTIONS:\n${objectionsStr}\n\nPROOF:\n${proofStr}\n\nQUALIFYING CONVERSATION FLOW:\n${flowStr}\n\nFLAGS:\n- PAYMENT_READY when lead agrees to pay\n- CALL_REQUESTED when lead wants call\n- LEAD_COLD after 3 failed attempts`;

    setPromptText(generated);
  };

  const handleSave = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await Promise.all([
        api.saveBrainDoc(selectedClientId, 'product', productText),
        api.saveBrainDoc(selectedClientId, 'pricing', JSON.stringify(pricingList)),
        api.saveBrainDoc(selectedClientId, 'objections', JSON.stringify(objectionsList)),
        api.saveBrainDoc(selectedClientId, 'proof', JSON.stringify(proofList)),
        api.saveBrainDoc(selectedClientId, 'flow', JSON.stringify(flowList)),
        api.saveBrainDoc(selectedClientId, 'prompt', promptText)
      ]);
      alert('AI Brain saved and activated successfully for ' + selectedBrandName + '!');
    } catch (err) {
      alert('Failed to save AI Brain config: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>AI Brain Configuration</h1>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Configure what each brand AI agent knows and how it closes</p>
        </div>
        <select value={selectedClientId || ''} onChange={(e) => setSelectedClientId(parseInt(e.target.value))} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '8px 12px', fontSize: 12, outline: 'none' }}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Loading AI Brain Configuration...</div>
      ) : (
        <>
          <div style={{ background: C.accent + '10', border: '1px solid ' + C.accentDim, borderRadius: 11, padding: '11px 15px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Brain size={15} color={C.accent} />
            <p style={{ fontSize: 12, color: C.accent }}>AI Agent for <strong>{selectedBrandName}</strong> is <strong>Active</strong> · Status: Connected to Postgres DB</p>
          </div>

          <div style={{ display: 'flex', gap: 2, background: C.card, border: '1px solid ' + C.border, borderRadius: 9, overflow: 'hidden', marginBottom: 18, width: 'fit-content' }}>
            {['product', 'pricing', 'objections', 'proof', 'flow', 'prompt'].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 15px', fontSize: 11, fontWeight: 600, border: 'none', background: tab === t ? C.accent : 'transparent', color: tab === t ? '#fff' : C.muted, textTransform: 'capitalize' }}>{t === 'flow' ? 'Conv Flow' : t === 'prompt' ? 'System Prompt' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 22 }}>
            {tab === 'product' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Product Info</h3>
                <textarea value={productText} onChange={(e) => setProductText(e.target.value)} style={{ width: '100%', height: 180, background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: 13, fontSize: 12, outline: 'none', resize: 'vertical', lineHeight: 1.7 }} />
              </div>
            )}

            {tab === 'pricing' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Pricing Table</h3>
                {pricingList.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 11, marginBottom: 11, padding: 13, background: C.surface, borderRadius: 9, border: '1px solid ' + C.border, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input value={p[0]} onChange={(e) => {
                        const newList = [...pricingList];
                        newList[i][0] = e.target.value;
                        setPricingList(newList);
                      }} style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 12, fontWeight: 600, outline: 'none', width: '100%' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: C.muted }}>Original</p>
                      <input value={p[1]} onChange={(e) => {
                        const newList = [...pricingList];
                        newList[i][1] = e.target.value;
                        setPricingList(newList);
                      }} style={{ background: 'transparent', border: 'none', color: C.dim, fontSize: 12, outline: 'none', textAlign: 'center', width: 80 }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: C.muted }}>Offer</p>
                      <input value={p[2]} onChange={(e) => {
                        const newList = [...pricingList];
                        newList[i][2] = e.target.value;
                        setPricingList(newList);
                      }} style={{ background: 'transparent', border: 'none', color: C.green, fontWeight: 700, fontSize: 12, outline: 'none', textAlign: 'center', width: 80 }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: C.muted }}>EMI</p>
                      <input value={p[3]} onChange={(e) => {
                        const newList = [...pricingList];
                        newList[i][3] = e.target.value;
                        setPricingList(newList);
                      }} style={{ background: 'transparent', border: 'none', color: C.blue, fontSize: 11, outline: 'none', textAlign: 'center', width: 120 }} />
                    </div>
                    <button type="button" onClick={() => {
                      setPricingList(pricingList.filter((_, idx) => idx !== i));
                    }} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>×</button>
                  </div>
                ))}
                <button type="button" onClick={() => setPricingList([...pricingList, ['New Course', 'Rs 9,999', 'Rs 4,999', 'Rs 999']])} style={{ background: 'transparent', border: '1px dashed ' + C.border, borderRadius: 9, color: C.muted, padding: '9px', width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}><Plus size={12} />Add Pricing Tier</button>
              </div>
            )}

            {tab === 'objections' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Objection Bank</h3>
                {objectionsList.map((o, i) => (
                  <div key={i} style={{ marginBottom: 13, background: C.surface, border: '1px solid ' + C.border, borderRadius: 9, overflow: 'hidden' }}>
                    <div style={{ padding: '9px 13px', background: '#2d1010', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <span style={{ fontSize: 11, color: C.red, fontWeight: 700, marginRight: 5 }}>Objection:</span>
                        <input value={o[0]} onChange={(e) => {
                          const newList = [...objectionsList];
                          newList[i][0] = e.target.value;
                          setObjectionsList(newList);
                        }} style={{ background: 'transparent', border: 'none', color: C.red, fontSize: 11, fontWeight: 700, outline: 'none', flex: 1 }} />
                      </div>
                      <button type="button" onClick={() => setObjectionsList(objectionsList.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}>×</button>
                    </div>
                    <div style={{ padding: '9px 13px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.green, fontWeight: 600, marginRight: 5 }}>AI Reply:</span>
                      <input value={o[1]} onChange={(e) => {
                        const newList = [...objectionsList];
                        newList[i][1] = e.target.value;
                        setObjectionsList(newList);
                      }} style={{ background: 'transparent', border: 'none', color: C.green, fontSize: 12, outline: 'none', flex: 1 }} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setObjectionsList([...objectionsList, ['New Objection', 'AI Reply...']])} style={{ background: 'transparent', border: '1px dashed ' + C.border, borderRadius: 9, color: C.muted, padding: '9px', width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}><Plus size={12} />Add Objection</button>
              </div>
            )}

            {tab === 'proof' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Proof Bank</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 13 }}>
                  {proofList.map((p, i) => (
                    <div key={i} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 9, padding: 13, position: 'relative' }}>
                      <button type="button" onClick={() => setProofList(proofList.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}>×</button>
                      <input value={p[0]} onChange={(e) => {
                        const newList = [...proofList];
                        newList[i][0] = e.target.value;
                        setProofList(newList);
                      }} style={{ background: 'transparent', border: 'none', color: C.accent, fontWeight: 700, fontSize: 10, letterSpacing: 0.8, outline: 'none', width: '85%', marginBottom: 5 }} />
                      <textarea value={p[1]} onChange={(e) => {
                        const newList = [...proofList];
                        newList[i][1] = e.target.value;
                        setProofList(newList);
                      }} style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 12, lineHeight: 1.6, outline: 'none', width: '100%', height: 60, resize: 'none' }} />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setProofList([...proofList, ['New Proof Point', 'Proof value description...']])} style={{ background: 'transparent', border: '1px dashed ' + C.border, borderRadius: 9, color: C.muted, padding: '9px', width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}><Plus size={12} />Add Proof Point</button>
              </div>
            )}

            {tab === 'flow' && (
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Conversation Flow</h3>
                {flowList.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 11, marginBottom: 13, alignItems: 'flex-start' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.accent + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{q[0]}</div>
                    <div style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 9, padding: 13, position: 'relative' }}>
                      <button type="button" onClick={() => setFlowList(flowList.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}>×</button>
                      <input value={q[1]} onChange={(e) => {
                        const newList = [...flowList];
                        newList[i][1] = e.target.value;
                        setFlowList(newList);
                      }} style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 12, outline: 'none', width: '90%', marginBottom: 7, fontWeight: 600 }} />
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {q[2].map((o, j) => (
                          <span key={j} style={{ background: C.blue + '20', color: C.blue, padding: '2px 9px', borderRadius: 11, fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <input value={o} onChange={(e) => {
                              const newList = [...flowList];
                              newList[i][2][j] = e.target.value;
                              setFlowList(newList);
                            }} style={{ background: 'transparent', border: 'none', color: C.blue, fontSize: 10, outline: 'none', width: 100 }} />
                            <button type="button" onClick={() => {
                              const newList = [...flowList];
                              newList[i][2] = newList[i][2].filter((_, optionIdx) => optionIdx !== j);
                              setFlowList(newList);
                            }} style={{ background: 'transparent', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 9, fontWeight: 700 }}>×</button>
                          </span>
                        ))}
                        <button type="button" onClick={() => {
                          const newList = [...flowList];
                          newList[i][2].push('New Option');
                          setFlowList(newList);
                        }} style={{ background: 'transparent', border: '1px dashed ' + C.border, borderRadius: 11, color: C.muted, padding: '1px 7px', fontSize: 9, cursor: 'pointer' }}>+ Option</button>
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setFlowList([...flowList, [`Q${flowList.length + 1}`, 'New Question flow?', ['Option 1', 'Option 2']]])} style={{ background: 'transparent', border: '1px dashed ' + C.border, borderRadius: 9, color: C.muted, padding: '9px', width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}><Plus size={12} />Add Question Flow</button>
              </div>
            )}

          {tab === 'prompt' && (
            <div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Generated System Prompt</h3>
              <div style={{ background: C.accent + '08', border: '1px solid ' + C.accentDim, borderRadius: 7, padding: 11, marginBottom: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 11, color: C.accent }}>Auto-compiled from your inputs. Used by GPT-4o for every conversation.</p>
                <button type="button" onClick={handleRegeneratePrompt} style={{ background: C.accent, border: 'none', borderRadius: 5, color: '#fff', padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Regenerate from other tabs</button>
              </div>
              <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} style={{ width: '100%', height: 260, background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: '#10b981', padding: 13, fontSize: 11, outline: 'none', fontFamily: 'monospace', lineHeight: 1.8, resize: 'none' }} />
            </div>
          )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 18, paddingTop: 18, borderTop: '1px solid ' + C.border }}>
            <button type="button" onClick={() => setDocs({ ...docs })} style={{ background: 'transparent', border: '1px solid ' + C.border, borderRadius: 7, color: C.muted, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>Reset</button>
            <button type="button" onClick={handleSave} disabled={saving} style={{ background: C.accent, border: 'none', borderRadius: 7, color: '#fff', padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Activating...' : 'Save and Activate'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

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

  const weeklyData = stats?.weekly?.map(d => ({ d: d.day, l: parseInt(d.leads), c: parseInt(d.converted) })) || W7;
  
  // Create brand summary dynamically
  const maxLeads = Math.max(...clients.map(c => parseInt(c.lead_count || 0)), 1);
  const colors = [C.accent, C.blue, C.purple, C.green, C.red];

  return (
    <div style={{padding:26,overflowY:'auto',height:'100%'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
        <div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:C.text}}>Reports and Analytics</h1>
          <p style={{color:C.muted,fontSize:12,marginTop:2}}>Full performance overview - all brands {loading && '(loading...)'}</p>
        </div>
        <button style={{background:C.card,border:'1px solid '+C.border,color:C.muted,padding:'7px 13px',borderRadius:7,fontSize:12,display:'flex',alignItems:'center',gap:5}}><Download size={12}/>Export PDF</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <div style={{background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:20}}>
          <SectionHeader title="Weekly Lead Volume" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} barSize={18} barGap={3}>
              <XAxis dataKey="d" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{background:C.card,border:'1px solid '+C.border,borderRadius:7,fontSize:11}} />
              <Bar dataKey="l" name="Leads" fill={C.accent} radius={[4,4,0,0]} />
              <Bar dataKey="c" name="Converted" fill={C.green} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:20}}>
          <SectionHeader title="Revenue Growth" />
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={REV}>
              <XAxis dataKey="m" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => "Rs "+(v/1000)+"K"} tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => "Rs "+(v/1000).toFixed(0)+"K"} contentStyle={{background:C.card,border:'1px solid '+C.border,borderRadius:7,fontSize:11}} />
              <Line type="monotone" dataKey="r" stroke={C.blue} strokeWidth={2.5} dot={{fill:C.blue,r:3}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:20}}>
        <SectionHeader title="Brand-Wise Summary" />
        {clients.length > 0 ? clients.map((c, i) => {
          const leads = parseInt(c.lead_count || 0);
          const conv = parseInt(c.converted_count || 0);
          const convRate = leads > 0 ? Math.round((conv / leads) * 100) + '%' : '0%';
          const col = colors[i % colors.length];
          return (
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 0',borderBottom:'1px solid '+C.border}}>
              <div style={{width:9,height:9,borderRadius:'50%',background:col,flexShrink:0}} />
              <div style={{width:150}}><p style={{fontSize:12,fontWeight:600,color:C.text}}>{c.name}</p></div>
              <div style={{flex:1,height:5,background:C.border,borderRadius:2}}><div style={{height:'100%',width:((leads/maxLeads)*100)+'%',background:col,borderRadius:2}} /></div>
              <div style={{width:55,textAlign:'right'}}><p style={{fontSize:11,color:C.text,fontWeight:600}}>{leads}</p><p style={{fontSize:9,color:C.muted}}>leads</p></div>
              <div style={{width:50,textAlign:'right'}}><p style={{fontSize:11,color:C.green,fontWeight:600}}>{convRate}</p><p style={{fontSize:9,color:C.muted}}>conv</p></div>
              <div style={{width:70,textAlign:'right'}}><p style={{fontSize:11,color:C.accent,fontWeight:600}}>{conv}</p></div>
            </div>
          );
        }) : (
          <div style={{textAlign:'center',padding:20,color:C.muted}}>No brand data available</div>
        )}
      </div>
    </div>
  );
};

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

  const displayClients = clients && clients.length > 0 ? clients : CLIENTS;
  const activeClients = displayClients.filter(c => c.status === 'active' || c.status === 'Live');

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
        {[['Active', activeClients.length.toString(), C.green], ['Monthly Recurring', 'Rs 48K', C.accent], ['Total Leads Managed', displayClients.reduce((a, b) => a + parseInt(b.lead_count || b.leads || 0), 0).toString(), C.blue], ['Avg Conversion', '18%', C.purple]].map(([l, v, col]) => (
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
                    <p style={{ fontSize: 10, color: C.muted }}>{cl.type || 'Business'} - {cl.joined || 'May 2026'}</p>
                  </div>
                </div>
                <span style={{ background: cl.status === 'active' ? '#0a2018' : '#1a1a1a', color: cl.status === 'active' ? C.green : C.muted, padding: '3px 9px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>{cl.status === 'active' ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ display: 'flex', gap: 11, marginBottom: 14 }}>
                {[['Leads', leads, C.blue], ['Converted', converted, C.green], ['Plan', cl.plan || 'Starter', C.accent]].map(([l, v, col]) => (
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

export const SettingsView = () => {
  const [tab, setTab] = useState('account');
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);

  // WhatsApp connection states
  const [phoneId, setPhoneId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [waBizId, setWaBizId] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [status, setStatus] = useState('active');

  // Password reset states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await api.getClients();
        setClients(res.clients || []);
        if (res.clients && res.clients.length > 0) {
          setSelectedClientId(res.clients[0].id);
        }
      } catch (err) {
        console.error('Error loading clients in settings:', err);
      }
    };
    loadClients();
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find(c => c.id === selectedClientId);
    if (client) {
      setPhoneId(client.phone_number_id || '');
      setAccessToken(client.wa_access_token || '');
      setWaBizId(client.wa_business_id || '');
      setWaNumber(client.whatsapp_number || '');
      setStatus(client.status || 'active');
    }
  }, [selectedClientId, clients]);

  const handleSaveWhatsApp = async (e) => {
    e.preventDefault();
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await api.updateClient(selectedClientId, {
        phone_number_id: phoneId,
        wa_access_token: accessToken,
        wa_business_id: waBizId,
        whatsapp_number: waNumber,
        status: status
      });
      alert('WhatsApp Business API configuration saved successfully!');
      const res = await api.getClients();
      setClients(res.clients || []);
    } catch (err) {
      alert('Failed to save connection details: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      alert('Please fill out both current and new password fields');
      return;
    }
    setSavingPass(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      alert('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      alert('Failed to update password: ' + err.message);
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text, marginBottom: 22 }}>Settings</h1>
      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ width: 180 }}>
          {[['account', 'Account'], ['whatsapp', 'WhatsApp API'], ['team', 'Team'], ['notifications', 'Alerts'], ['billing', 'Billing']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ width: '100%', textAlign: 'left', padding: '9px 13px', borderRadius: 7, border: 'none', background: tab === k ? C.accent + '20' : 'transparent', color: tab === k ? C.accent : C.muted, fontSize: 12, fontWeight: tab === k ? 600 : 400, marginBottom: 1, cursor: 'pointer' }}>
              {tab === k && <span style={{ marginRight: 5 }}>›</span>}{l}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, background: C.card, border: '1px solid ' + C.border, borderRadius: 13, padding: 22 }}>
          {tab === 'account' && (
            <form onSubmit={handleSavePassword}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Account & Password Settings</h3>
              {[['Business Name', 'ABM Groups'], ['Portal Name', 'LeadOS by BM TechX'], ['Admin Email', 'kamar@abmgroups.org'], ['Contact', '94038 92971'], ['Website', 'bmtechx.in']].map(([l, v]) => (
                <div key={l} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{l}</label>
                  <input readOnly defaultValue={v} style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.dim, padding: '9px 11px', fontSize: 12, outline: 'none' }} />
                </div>
              ))}

              <div style={{ height: 1, background: C.border, margin: '20px 0' }} />
              <h4 style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14 }}>Change Password</h4>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Current Password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, paddingTop: 18, borderTop: '1px solid ' + C.border }}>
                <button type="submit" disabled={savingPass} style={{ background: C.accent, border: 'none', borderRadius: 7, color: '#fff', padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: savingPass ? 0.6 : 1 }}>
                  {savingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {tab === 'whatsapp' && (
            <form onSubmit={handleSaveWhatsApp}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>WhatsApp API Connection</h3>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Select Brand</label>
                <select value={selectedClientId || ''} onChange={(e) => setSelectedClientId(parseInt(e.target.value))} style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }}>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ background: '#0a2018', border: '1px solid #16523a', borderRadius: 9, padding: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 9 }}>
                <CheckCircle size={13} color={C.green} />
                <p style={{ fontSize: 12, color: C.green }}>Active postgres-synced connection settings for {clients.find(c => c.id === selectedClientId)?.name || 'Brand'}</p>
              </div>

              <div style={{ marginBottom: 13 }}>
                <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Phone Number ID</label>
                <input value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="Meta Developer Phone ID" style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '8px 11px', fontSize: 11, outline: 'none', fontFamily: 'monospace' }} />
              </div>
              <div style={{ marginBottom: 13 }}>
                <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Access Token</label>
                <input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="EAAB..." style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '8px 11px', fontSize: 11, outline: 'none', fontFamily: 'monospace' }} />
              </div>
              <div style={{ marginBottom: 13 }}>
                <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>WhatsApp Business Account ID</label>
                <input value={waBizId} onChange={(e) => setWaBizId(e.target.value)} placeholder="Meta WA Business Account ID" style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '8px 11px', fontSize: 11, outline: 'none', fontFamily: 'monospace' }} />
              </div>
              <div style={{ marginBottom: 13 }}>
                <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>WhatsApp Number</label>
                <input value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="+91..." style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '8px 11px', fontSize: 11, outline: 'none', fontFamily: 'monospace' }} />
              </div>

              <div style={{ marginBottom: 13 }}>
                <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Connection Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }}>
                  <option value="active">Active (Forward incoming WhatsApp messages to AI Brain)</option>
                  <option value="inactive">Inactive (Pause AI auto-responders)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, paddingTop: 18, borderTop: '1px solid ' + C.border }}>
                <button type="submit" disabled={saving} style={{ background: C.accent, border: 'none', borderRadius: 7, color: '#fff', padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : 'Save Connection'}
                </button>
              </div>
            </form>
          )}

          {tab === 'notifications' && (
            <div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Alert Settings</h3>
              {[['Hot lead detected', 'Send WhatsApp alert to assigned team', true], ['Payment received', 'Notify admin and team member', true], ['Daily summary report', 'Sent at 9 PM every day', true], ['AI agent failure', 'Immediate alert', false]].map(([l, d, on]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid ' + C.border }}>
                  <div><p style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{l}</p><p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{d}</p></div>
                  <div style={{ width: 38, height: 20, borderRadius: 10, background: on ? C.accent : C.border, position: 'relative', cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.15s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {(tab === 'team' || tab === 'billing') && <div style={{ textAlign: 'center', padding: 36, color: C.muted }}><Brain size={28} color={C.muted} style={{ margin: '0 auto 11px' }} /><p>Available in full deployment</p></div>}
        </div>
      </div>
    </div>
  );
};
