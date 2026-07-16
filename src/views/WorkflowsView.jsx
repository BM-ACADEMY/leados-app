import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { C } from '../constants/theme';
import { toast } from 'react-hot-toast';
import { Activity, CheckCircle, Zap, Search, ChevronDown, ChevronRight, Settings, Inbox, Clock, RefreshCw, BarChart2, Shield } from 'lucide-react';

const ENGINES = [
  { id: 'WF00', name: 'Lead Integrator', icon: Inbox, desc: 'Captures and normalizes incoming leads' },
  { id: 'WF01', name: 'Sales Engine', icon: Zap, desc: 'AI-driven initial conversational sales' },
  { id: 'WF02', name: 'Follow-up Engine', icon: Clock, desc: 'Automated 24h & timeline follow-ups' },
  { id: 'WF03', name: 'Reminder Engine', icon: CheckCircle, desc: 'SLA enforcement & team reminders' },
  { id: 'WF04', name: 'Customer Journey', icon: Activity, desc: 'Post-purchase onboarding & routing' },
  { id: 'WF05', name: 'Marketing Auto', icon: BarChart2, desc: 'Frequency-capped broadcast campaigns' },
  { id: 'WF06', name: 'Founder Dashboard', icon: Search, desc: 'Generates daily revenue/SLA reports' },
  { id: 'WF07', name: 'Admin & Maintenance', icon: Shield, desc: 'Cleans DB and syncs vector memory' }
];

export const WorkflowsView = () => {
  const [logs, setLogs] = useState([]);
  const [telemetry, setTelemetry] = useState({ totalExecutions: 0, successRate: 0, aiInterventions: 0, activeWorkflows: 8 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [logsRes, teleRes] = await Promise.all([
        api.getWorkflowLogs(),
        api.getWorkflowTelemetry()
      ]);
      if (logsRes && logsRes.logs) setLogs(logsRes.logs);
      if (teleRes && teleRes.telemetry) setTelemetry(teleRes.telemetry);
    } catch (err) {
      console.error('Failed to fetch workflow data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'success': return '#4caf50';
      case 'failed': return '#f44336';
      case 'pending': return '#ff9800';
      default: return C.textDim;
    }
  };

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => (l.workflow || '').includes(filter));

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Settings size={28} color={C.accent} />
            Advanced Control Center
          </h1>
          <p style={{ color: C.textDim, marginTop: 4 }}>Monitor and command the 8 core engines of SalesOS.</p>
        </div>
        <button onClick={fetchData} style={{ background: C.card, border: `1px solid ${C.border}`, padding: '8px 16px', borderRadius: 8, color: C.text, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* 1. Workflow Engines Visual Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
        {ENGINES.map((engine) => (
          <div key={engine.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: '50%', background: '#4caf50', boxShadow: '0 0 8px #4caf50' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: `${C.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <engine.icon size={20} color={C.accent} />
              </div>
              <div>
                <h3 style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>{engine.id}</h3>
                <div style={{ color: C.textDim, fontSize: 13 }}>{engine.name}</div>
              </div>
            </div>
            <p style={{ color: C.textDim, fontSize: 13, margin: 0, lineHeight: 1.4 }}>{engine.desc}</p>
          </div>
        ))}
      </div>

      {/* 2. High-Level Telemetry Metrics */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ color: C.textDim, fontSize: 13, fontWeight: 500, marginBottom: 8, textTransform: 'uppercase' }}>Total Executions</div>
          <div style={{ color: C.text, fontSize: 32, fontWeight: 700 }}>{telemetry.totalExecutions.toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ color: C.textDim, fontSize: 13, fontWeight: 500, marginBottom: 8, textTransform: 'uppercase' }}>Success Rate</div>
          <div style={{ color: '#4caf50', fontSize: 32, fontWeight: 700 }}>{telemetry.successRate}%</div>
        </div>
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ color: C.textDim, fontSize: 13, fontWeight: 500, marginBottom: 8, textTransform: 'uppercase' }}>AI Interventions</div>
          <div style={{ color: C.accent, fontSize: 32, fontWeight: 700 }}>{telemetry.aiInterventions.toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ color: C.textDim, fontSize: 13, fontWeight: 500, marginBottom: 8, textTransform: 'uppercase' }}>Active Engines</div>
          <div style={{ color: C.text, fontSize: 32, fontWeight: 700 }}>{telemetry.activeWorkflows} <span style={{ fontSize: 14, color: C.textDim, fontWeight: 400 }}>/ 8</span></div>
        </div>
      </div>

      {/* 3. Advanced Deep-Dive Logs */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: 0 }}>Real-Time Telemetry Logs</h2>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '8px 12px', fontSize: 13, outline: 'none' }}
          >
            <option value="ALL">All Workflows</option>
            {ENGINES.map(e => <option key={e.id} value={e.id}>{e.id} - {e.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.textDim }}>Loading live logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.textDim }}>No logs found for this filter.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.card, borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>
                <th style={{ padding: '12px 20px', width: 40 }}></th>
                <th style={{ padding: '16px 20px', color: C.textDim, fontWeight: 500 }}>Time</th>
                <th style={{ padding: '16px 20px', color: C.textDim, fontWeight: 500 }}>Engine</th>
                <th style={{ padding: '16px 20px', color: C.textDim, fontWeight: 500 }}>Lead</th>
                <th style={{ padding: '16px 20px', color: C.textDim, fontWeight: 500 }}>Output Message</th>
                <th style={{ padding: '16px 20px', color: C.textDim, fontWeight: 500 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr 
                    style={{ borderBottom: expandedLog === log.id ? 'none' : `1px solid ${C.border}`, background: expandedLog === log.id ? C.card : 'transparent', cursor: 'pointer' }}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <td style={{ padding: '16px 20px', color: C.textDim }}>
                      {expandedLog === log.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td style={{ padding: '16px 20px', color: C.textDim, fontSize: 13 }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 20px', color: C.text, fontWeight: 600 }}>
                      {log.workflow}
                    </td>
                    <td style={{ padding: '16px 20px', color: C.text }}>
                      {log.lead_name || log.lead_id || '-'}
                    </td>
                    <td style={{ padding: '16px 20px', color: C.textDim, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.message || 'Workflow executed silently'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ background: `${getStatusColor(log.status)}20`, color: getStatusColor(log.status), padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                        {log.status || 'UNKNOWN'}
                      </span>
                    </td>
                  </tr>
                  
                  {expandedLog === log.id && (
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.card }}>
                      <td colSpan={6} style={{ padding: '20px 40px' }}>
                        <div style={{ background: '#00000030', borderRadius: 8, padding: 16, border: `1px solid ${C.border}` }}>
                          <h4 style={{ color: C.text, margin: '0 0 12px 0', fontSize: 14 }}>Advanced Telemetry Details</h4>
                          <pre style={{ margin: 0, color: C.textDim, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
{JSON.stringify(log, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
