import React, { useState, useEffect, useCallback } from 'react';
import { C } from '../../constants/theme.js';
import { ShieldAlert, Loader2, AlertTriangle, TrendingDown, ArrowDownRight, Activity, Clock, CheckCircle, History, ChevronDown, ChevronUp, X } from 'lucide-react';
import { api } from '../../services/api.js';
import { useClient } from '../../contexts/ClientContext.jsx';
import toast from 'react-hot-toast';

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
  warning:  { label: 'Warning',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  info:     { label: 'Info',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
};

export default function RankDropAlert() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // all | critical | warning | info
  const [acknowledgeModal, setAcknowledgeModal] = useState(null); // alert obj
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { activeClient } = useClient();

  const fetchAlerts = useCallback(async () => {
    if (!activeClient) return;
    setLoading(true);
    try {
      const clientParam = encodeURIComponent(activeClient.business_name || activeClient.client_name);
      const res = await api.get(`/thedal/rankdropalert?client=${clientParam}&client_id=${activeClient.id}`);
      if (res) setData(res);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  }, [activeClient]);

  useEffect(() => {
    fetchAlerts();
    setShowHistory(false);
    setFilterTab('all');
  }, [fetchAlerts]);

  const fetchHistory = async () => {
    if (!activeClient) return;
    setHistoryLoading(true);
    try {
      const clientParam = encodeURIComponent(activeClient.business_name || activeClient.client_name);
      const res = await api.get(`/thedal/rankdropalert/history?client=${clientParam}`);
      if (res) setHistory(res.history || []);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history.length === 0) fetchHistory();
  };

  const openAcknowledgeModal = (alert) => {
    setAcknowledgeModal(alert);
    setNoteText('');
  };

  const handleConfirmAcknowledge = async () => {
    if (!acknowledgeModal) return;
    setIsSaving(true);
    try {
      await api.put(`/thedal/rankdropalert/${acknowledgeModal.id}/acknowledge`, { note: noteText });
      toast.success('Alert acknowledged and saved!');
      setAcknowledgeModal(null);
      setNoteText('');
      fetchAlerts(); // Refresh active alerts
    } catch (err) {
      toast.error('Failed to acknowledge. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeClient) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.background, color: C.muted }}>
        <ShieldAlert size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
        <p>Please select a client from the sidebar to view Rank Drop Alerts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.background }}>
        <Loader2 size={32} color={C.accent} className="spin" />
      </div>
    );
  }

  const summary = data?.summary || { total_alerts: 0, critical_drops: 0, total_traffic_risk: 0 };
  const allAlerts = data?.alerts || [];
  const filteredAlerts = filterTab === 'all' ? allAlerts : allAlerts.filter(a => a.severity === filterTab);

  const tabs = [
    { key: 'all',      label: 'All Alerts',  count: allAlerts.length },
    { key: 'critical', label: '🔴 Critical',  count: allAlerts.filter(a => a.severity === 'critical').length },
    { key: 'warning',  label: '🟡 Warning',   count: allAlerts.filter(a => a.severity === 'warning').length },
    { key: 'info',     label: '🔵 Info',      count: allAlerts.filter(a => a.severity === 'info').length },
  ];

  return (
    <div style={{ padding: 30, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif" }}>Rank Drop Alert</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
            Monitoring search ranking fluctuations for <strong style={{ color: '#fff' }}>{activeClient.business_name || activeClient.client_name}</strong>.
          </p>
        </div>
        <button
          onClick={toggleHistory}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: `1px solid ${C.border}`, padding: '8px 14px', borderRadius: 8, color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <History size={14} />
          Alert History
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'rgba(234,179,8,0.1)', padding: 9, borderRadius: 10 }}>
              <TrendingDown size={18} color="#eab308" />
            </div>
            <span style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>Total Keywords Dropped</span>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#fff' }}>{summary.total_alerts}</div>
        </div>

        <div style={{ background: summary.critical_drops > 0 ? 'rgba(239,68,68,0.06)' : C.surface, border: `1px solid ${summary.critical_drops > 0 ? 'rgba(239,68,68,0.3)' : C.border}`, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'rgba(239,68,68,0.1)', padding: 9, borderRadius: 10 }}>
              <AlertTriangle size={18} color="#ef4444" />
            </div>
            <span style={{ color: summary.critical_drops > 0 ? '#fca5a5' : C.muted, fontSize: 13, fontWeight: 600 }}>Critical Drops (Off Page 1)</span>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: summary.critical_drops > 0 ? '#ef4444' : '#fff' }}>{summary.critical_drops}</div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'rgba(59,130,246,0.1)', padding: 9, borderRadius: 10 }}>
              <Activity size={18} color="#3b82f6" />
            </div>
            <span style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>Est. Traffic at Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#fff' }}>{(Number(summary.total_traffic_risk) || 0).toLocaleString()}</span>
            <span style={{ color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 5 }}>visits/mo</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            style={{
              background: filterTab === tab.key ? C.accent : 'transparent',
              border: `1px solid ${filterTab === tab.key ? C.accent : C.border}`,
              color: filterTab === tab.key ? '#fff' : C.muted,
              padding: '7px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
            <span style={{ background: filterTab === tab.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', padding: '1px 7px', borderRadius: 20, fontSize: 11 }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Active Alerts Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 28, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.15)' }}>
              <th style={{ padding: '14px 20px', color: C.muted, fontSize: 12, fontWeight: 700 }}>SEVERITY</th>
              <th style={{ padding: '14px 20px', color: C.muted, fontSize: 12, fontWeight: 700 }}>KEYWORD / URL</th>
              <th style={{ padding: '14px 20px', color: C.muted, fontSize: 12, fontWeight: 700 }}>RANK CHANGE</th>
              <th style={{ padding: '14px 20px', color: C.muted, fontSize: 12, fontWeight: 700 }}>SEARCH VOL</th>
              <th style={{ padding: '14px 20px', color: C.muted, fontSize: 12, fontWeight: 700 }}>TRAFFIC RISK</th>
              <th style={{ padding: '14px 20px', color: C.muted, fontSize: 12, fontWeight: 700, textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.length > 0 ? filteredAlerts.map((alert) => {
              const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
              return (
                <tr key={alert.id} style={{ borderBottom: `1px solid ${C.border}55` }}>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {sev.label}
                    </span>
                  </td>

                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{alert.keyword}</div>
                    <div style={{ fontSize: 12, color: C.accent, marginTop: 3 }}>{activeClient.domain}{alert.url}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />
                      {new Date(alert.date_detected).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>

                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, padding: '5px 10px', borderRadius: 8, fontSize: 15, fontWeight: 700, color: C.muted }}>
                        #{alert.old_rank}
                      </div>
                      <ArrowDownRight size={16} color="#ef4444" />
                      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '5px 10px', borderRadius: 8, fontSize: 15, fontWeight: 800, color: '#fca5a5' }}>
                        #{alert.new_rank}
                      </div>
                      <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>▼ {alert.drop_amount}</span>
                    </div>
                  </td>

                  <td style={{ padding: '18px 20px', fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>
                    {(Number(alert.search_volume) || 0).toLocaleString()}
                  </td>

                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: alert.severity === 'critical' ? '#fca5a5' : '#e2e8f0' }}>
                      ~{(Number(alert.traffic_risk) || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>lost visits</div>
                  </td>

                  <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => openAcknowledgeModal(alert)}
                      style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.accent, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <CheckCircle size={14} /> Acknowledge
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6} style={{ padding: '50px 20px', textAlign: 'center', color: C.muted }}>
                  <ShieldAlert size={32} style={{ marginBottom: 12, opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                  {filterTab === 'all' ? 'No rank drops detected. Looking good! 🎉' : `No ${filterTab} alerts at the moment.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Alert History Section */}
      {showHistory && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={16} color={C.muted} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Acknowledged Alert History</span>
          </div>
          {historyLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={24} color={C.accent} className="spin" /></div>
          ) : history.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.1)' }}>
                  <th style={{ padding: '12px 20px', color: C.muted, fontSize: 12, fontWeight: 700 }}>KEYWORD</th>
                  <th style={{ padding: '12px 20px', color: C.muted, fontSize: 12, fontWeight: 700 }}>RANK CHANGE</th>
                  <th style={{ padding: '12px 20px', color: C.muted, fontSize: 12, fontWeight: 700 }}>NOTE</th>
                  <th style={{ padding: '12px 20px', color: C.muted, fontSize: 12, fontWeight: 700 }}>ACKNOWLEDGED</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => {
                  const sev = SEVERITY_CONFIG[h.severity] || SEVERITY_CONFIG.info;
                  return (
                    <tr key={h.id} style={{ borderBottom: `1px solid ${C.border}33`, opacity: 0.7 }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{h.keyword}</div>
                        <span style={{ background: sev.bg, color: sev.color, padding: '2px 7px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>{sev.label}</span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>
                        #{h.old_rank} ➔ #{h.new_rank} (▼{h.drop_amount})
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: C.muted, fontStyle: h.note ? 'normal' : 'italic' }}>
                        {h.note || 'No note added'}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 12, color: C.muted }}>
                        {h.acknowledged_at ? new Date(h.acknowledged_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>No acknowledged alerts yet.</div>
          )}
        </div>
      )}

      {/* Acknowledge Modal */}
      {acknowledgeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.surface, width: 480, borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', border: `1px solid ${C.border}` }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={18} color={C.accent} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Acknowledge Alert</h3>
              </div>
              <button onClick={() => setAcknowledgeModal(null)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', padding: 0 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>ALERT</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{acknowledgeModal.keyword}</div>
                <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, marginTop: 4 }}>
                  Rank #{acknowledgeModal.old_rank} ➔ #{acknowledgeModal.new_rank} (▼{acknowledgeModal.drop_amount} positions)
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: C.muted, fontWeight: 600, marginBottom: 8 }}>
                  ADD A NOTE <span style={{ fontWeight: 400, fontStyle: 'italic' }}>(optional)</span>
                </label>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value.slice(0, 1000))}
                  placeholder="e.g. Google algo update — building links to recover. Monitoring weekly."
                  rows={4}
                  maxLength={1000}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, borderRadius: 8, color: '#fff', padding: 12, fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, textAlign: 'right' }}>{noteText.length} / 1000 characters</div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'rgba(0,0,0,0.15)' }}>
              <button onClick={() => setAcknowledgeModal(null)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleConfirmAcknowledge}
                disabled={isSaving}
                style={{ background: C.accent, border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                {isSaving ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
