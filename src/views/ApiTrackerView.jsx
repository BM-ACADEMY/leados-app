import React, { useState, useEffect } from 'react';
import { Lock, Search, Activity, CheckCircle, XCircle, Send, MessageSquare, BarChart3, AlertCircle } from 'lucide-react';
import { STYLE } from '../constants/theme.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

// Uses VITE_ prefixed environment variable
const TRACKER_PASSWORD = import.meta.env.VITE_API_TRACKER_PASSWORD || 'abm2026';

export function ApiTrackerView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterSender, setFilterSender] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === TRACKER_PASSWORD) {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setError('Incorrect password');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetching from the backend API we created earlier
      const res = await fetch('/api/alliance/external/apitracker');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch tracker data', err);
    }
    setLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040812', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
        <form onSubmit={handleLogin} style={{ background: '#0f172a', padding: '40px', borderRadius: '16px', width: '400px', border: '1px solid #1e293b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ background: '#3b82f620', padding: '16px', borderRadius: '50%' }}>
              <Lock size={32} color="#3b82f6" />
            </div>
          </div>
          <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>API Tracker Access</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Enter the secure password to view logs.</p>
          
          <input
            type="password"
            placeholder="Enter password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', marginBottom: '16px', outline: 'none' }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}
          
          <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}>
            Access Dashboard
          </button>
        </form>
      </div>
    );
  }

  if (loading || !data) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040812', color: '#fff' }}>Loading data...</div>;
  }

  // Filter logs logic
  const filteredLogs = data.recent_logs?.filter(log => {
    if (filterSender !== 'All' && log.sender_name !== filterSender) return false;
    if (filterStatus !== 'All' && log.status !== filterStatus) return false;
    return true;
  }) || [];

  return (
    <div style={{ minHeight: '100vh', background: '#040812', color: '#f8fafc', fontFamily: 'Inter, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Activity color="#3b82f6" /> Alliance External API Tracker
            </h1>
            <p style={{ color: '#94a3b8', marginTop: '4px' }}>Real-time monitoring of external WhatsApp usage</p>
          </div>
          <button onClick={fetchData} style={{ padding: '8px 16px', background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer' }}>
            Refresh Data
          </button>
        </div>

        {/* Top Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <div style={{ background: '#0f172a', padding: '24px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8', marginBottom: '12px' }}>
              <Send size={20} /> Total Sent
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700' }}>{data.summary?.total_sent || 0}</div>
          </div>
          <div style={{ background: '#052e1620', padding: '24px', borderRadius: '12px', border: '1px solid #05966950' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#34d399', marginBottom: '12px' }}>
              <CheckCircle size={20} /> Successful
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#10b981' }}>{data.summary?.successful || 0}</div>
          </div>
          <div style={{ background: '#450a0a20', padding: '24px', borderRadius: '12px', border: '1px solid #e11d4850' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fb7185', marginBottom: '12px' }}>
              <XCircle size={20} /> Failed
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#f43f5e' }}>{data.summary?.failed || 0}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          {/* Sender Breakdown Chart */}
          <div style={{ background: '#0f172a', padding: '24px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="#8b5cf6" /> Messages by Sender
            </h3>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sender_breakdown || []} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="sender_name" type="category" stroke="#94a3b8" width={100} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="messages_sent" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20}>
                    {(data.sender_breakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'][index % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Breakdown Chart */}
          <div style={{ background: '#0f172a', padding: '24px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="#3b82f6" /> Messages by Project
            </h3>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.project_breakdown || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="project_name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="messages_sent" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Logs Table */}
        <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Recent API Logs</h3>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', outline: 'none' }}>
                <option value="All">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
              
              <select value={filterSender} onChange={e => setFilterSender(e.target.value)} style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', outline: 'none' }}>
                <option value="All">All Senders</option>
                {(data.sender_breakdown || []).map(s => (
                  <option key={s.sender_name} value={s.sender_name}>{s.sender_name || 'Unknown'}</option>
                ))}
              </select>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 24px', fontWeight: '600' }}>Date & Time</th>
                <th style={{ padding: '12px 24px', fontWeight: '600' }}>Sender</th>
                <th style={{ padding: '12px 24px', fontWeight: '600' }}>Project</th>
                <th style={{ padding: '12px 24px', fontWeight: '600' }}>Phone</th>
                <th style={{ padding: '12px 24px', fontWeight: '600' }}>Type / Template</th>
                <th style={{ padding: '12px 24px', fontWeight: '600' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #1e293b', fontSize: '14px' }}>
                  <td style={{ padding: '16px 24px', color: '#cbd5e1' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: '500' }}>{log.sender_name || '-'}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ background: '#334155', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {log.project_name}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>+{log.phone_number}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} color="#94a3b8" />
                      {log.message_type === 'template' ? log.template_name : 'Free Text'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {log.status === 'success' ? (
                      <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={16} /> Success
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <XCircle size={16} /> Failed
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.error_message}>
                          {log.error_message}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No logs found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
