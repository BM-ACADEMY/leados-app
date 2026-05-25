import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { C } from '../constants/theme.js';
import { api } from '../services/api.js';

export const CampaignsView = () => {
  const [tab, setTab] = useState('list');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const res = await api.createCampaign({
        name,
        client_id: parseInt(clientId),
        template_id: parseInt(templateId),
        target_status: targetStatus,
        scheduled_at: scheduledAt || null
      });

      if (!scheduledAt) {
        await api.request(`/api/campaigns/execute`, {
          method: 'POST',
          body: JSON.stringify({ campaign_id: res.campaign.id })
        });
      }

      alert('Campaign created and launched successfully!');
      setName('');
      setTab('list');
      fetchCampaigns();
    } catch (err) {
      alert('Failed to launch campaign: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayCampaigns = campaigns || [];
  const statC = { completed: { tc: C.green, bg: '#0a2018' }, running: { tc: C.accent, bg: '#2d1a0a' }, scheduled: { tc: C.blue, bg: '#0f1e38' } };

  const totalDelivered = displayCampaigns.reduce((a, b) => a + parseInt(b.delivered_count || b.delivered || 0), 0);
  const totalRead = displayCampaigns.reduce((a, b) => a + parseInt(b.read_count || b.read || 0), 0);
  const avgRead = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) + '%' : '0%';

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
            {[['Total', displayCampaigns.length.toString(), C.accent], ['Running', displayCampaigns.filter(c => c.status === 'running').length.toString(), C.green], ['Total Sent', displayCampaigns.reduce((a, b) => a + parseInt(b.sent_count || b.sent || 0), 0).toString(), C.blue], ['Avg Read', avgRead, C.purple]].map(([l, v, col]) => (
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
