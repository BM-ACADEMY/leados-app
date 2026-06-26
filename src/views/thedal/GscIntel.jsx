import React, { useState, useEffect } from 'react';
import { C } from '../../constants/theme.js';
import { LineChart, Loader2, Search, Globe, Smartphone, Calendar, CheckCircle2, AlertCircle, MousePointerClick, Eye, Target, TrendingUp, TrendingDown, RefreshCw, Zap } from 'lucide-react';
import { api } from '../../services/api.js';
import toast from 'react-hot-toast';

export default function GscIntel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filters State
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [propertyType, setPropertyType] = useState('sc-domain'); // 'sc-domain' or 'url-prefix'
  const [dateRange, setDateRange] = useState('28Days');
  const [device, setDevice] = useState('All');
  const [country, setCountry] = useState('All');
  const [activeTab, setActiveTab] = useState('topQueries');

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await api.get('/thedal/clients');
        const clientList = Array.isArray(res) ? res : (res?.clients || []);
        setClients(clientList);
        if (clientList.length > 0) {
          let defaultUrl = clientList[0].domain || '';
          if (defaultUrl) {
            defaultUrl = defaultUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
            setSelectedClient(defaultUrl);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false); // Clear loader if no clients
        }
      } catch (err) {
        console.error('Failed to load clients', err);
        setLoading(false); // Clear loader on error
        setErrorMsg('Failed to fetch clients from database.');
      }
    };
    loadClients();
  }, []);

  const fetchData = async () => {
    if (!selectedClient) return; // Wait until a client is selected
    setLoading(true);
    setErrorMsg('');
    try {
      const siteUrl = propertyType === 'sc-domain' ? 'sc-domain:' + selectedClient : 'https://' + selectedClient + '/';
      const params = new URLSearchParams({
        clientId: 'default',
        siteUrl,
        days: dateRange,
        device,
        country
      });
      const res = await api.get(`/thedal/gscintel?${params.toString()}`);
      if (res) {
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setData(res);
        }
      }
    } catch (err) {
      console.error('Failed to load data', err);
      setErrorMsg(err.message || 'Failed to fetch GSC data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      fetchData();
    }
  }, [selectedClient, dateRange, device, country, propertyType]);

  const handlePushToPage1 = async (query) => {
    const toastId = toast.loading(`Mapping keyword "${query}"...`);
    try {
      const targetUrl = 'https://' + selectedClient;
      await api.post('/thedal/keywordtracking', { keyword: query, targetUrl });
      toast.success(`Successfully mapped keyword "${query}" to Keyword Map!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to map keyword.', { id: toastId });
    }
  };

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <Loader2 size={32} color={C.accent} className="spin" />
      </div>
    );
  }

  // Derived data based on UI toggles
  let displayQueries = (data?.queries || []);
  let displayPages = (data?.pages || []);
    
  let currentTableData = [];
  if (activeTab === 'topQueries') {
    currentTableData = displayQueries;
  } else if (activeTab === 'topPages') {
    currentTableData = displayPages;
  } else if (activeTab === 'quickWins') {
    currentTableData = displayQueries
      .filter(q => parseFloat(q.position) >= 11 && parseFloat(q.position) <= 20)
      .sort((a, b) => b.impressions - a.impressions);
  }

  const MetricCard = ({ title, value, trend, icon: Icon, color, reverseGood = false }) => {
    const isPositive = reverseGood ? trend < 0 : trend > 0;
    const trendColor = isPositive ? '#22c55e' : '#ef4444';
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>{title}</div>
          <div style={{ padding: 8, background: `${color}15`, borderRadius: 8 }}>
            <Icon size={18} color={color} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{value}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: trendColor, fontWeight: 600 }}>
            <TrendIcon size={14} />
            {Math.abs(trend)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '30px 40px', color: C.text, height: '100%', overflowY: 'auto', background: C.bg }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }} className="flex-col-mobile gap-mobile">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif" }}>GSC Intel</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Live Google Search Console traffic analysis.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select 
            value={selectedClient} 
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 14, outline: 'none', cursor: 'pointer' }}
          >
            {clients.map(client => {
              let url = client.domain || '';
              url = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
              const displayName = client.business_name || client.client_name || 'Unnamed Client';
              return <option key={client.id} value={url} style={{ background: '#1e293b', color: '#fff' }}>{displayName} ({url})</option>
            })}
            {clients.length === 0 && <option value="" style={{ background: '#1e293b', color: '#fff' }}>No clients found</option>}
          </select>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 14, outline: 'none', cursor: 'pointer' }}
          >
            <option value="sc-domain">Domain (sc-domain:)</option>
            <option value="url-prefix">URL-Prefix (https://.../)</option>
          </select>
          <button onClick={fetchData} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} /> Sync Data
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 20, alignItems: 'center' }} className="flex-responsive">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Calendar size={16} color={C.muted} />
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer', width: '100%' }}>
            <option value="7Days" style={{ background: '#1e293b', color: '#fff' }}>Last 7 Days</option>
            <option value="28Days" style={{ background: '#1e293b', color: '#fff' }}>Last 28 Days</option>
            <option value="3Months" style={{ background: '#1e293b', color: '#fff' }}>Last 3 Months</option>
          </select>
        </div>
        <div style={{ width: 1, height: 24, background: C.border }} className="hide-mobile"></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Smartphone size={16} color={C.muted} />
          <select value={device} onChange={(e) => setDevice(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer', width: '100%' }}>
            <option value="All" style={{ background: '#1e293b', color: '#fff' }}>All Devices</option>
            <option value="Mobile" style={{ background: '#1e293b', color: '#fff' }}>Mobile Only</option>
            <option value="Desktop" style={{ background: '#1e293b', color: '#fff' }}>Desktop Only</option>
          </select>
        </div>
        <div style={{ width: 1, height: 24, background: C.border }} className="hide-mobile"></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Globe size={16} color={C.muted} />
          <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer', width: '100%' }}>
            <option value="All" style={{ background: '#1e293b', color: '#fff' }}>All Countries</option>
            {(data?.countries || []).map(c => (
              <option key={c.countryCode} value={c.countryCode} style={{ background: '#1e293b', color: '#fff' }}>
                {c.countryCode.toUpperCase()} ({c.clicks} clicks)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VERIFICATION STATE OR ERRORS */}
      {errorMsg ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, padding: 40, textAlign: 'center', marginBottom: 24 }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: 22, color: '#fff', margin: '0 0 10px 0' }}>
            {errorMsg.includes('Access Denied') ? 'Permission Required' : 'API Error'}
          </h2>
          
          {errorMsg.includes('Access Denied') ? (
            <div style={{ textAlign: 'left', maxWidth: 600, margin: '0 auto 30px', background: 'rgba(0,0,0,0.2)', padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <p style={{ color: '#fff', fontSize: 15, marginTop: 0, marginBottom: 16 }}>
                Google blocked this request because your connected account doesn't have access to this website. To fix this instantly:
              </p>
              <ol style={{ color: C.muted, paddingLeft: 20, margin: 0, lineHeight: 1.8, fontSize: 14 }}>
                <li>Log into your <strong>Google Search Console</strong> dashboard.</li>
                <li>Select this domain in your property list.</li>
                <li>Go to <strong>Settings</strong> → <strong>Users and permissions</strong>.</li>
                <li>Click <strong>Add User</strong> and add the email address you just connected with.</li>
                <li>Come back here and click Retry!</li>
              </ol>
            </div>
          ) : (
            <p style={{ color: C.muted, maxWidth: 600, margin: '0 auto 30px', lineHeight: 1.6 }}>{errorMsg}</p>
          )}

          <button onClick={fetchData} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Retry Request</button>
        </div>
      ) : data && !data.isVerified ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: 22, color: '#fff', margin: '0 0 10px 0' }}>Property Not Verified</h2>
          <p style={{ color: C.muted, maxWidth: 500, margin: '0 auto 30px', lineHeight: 1.6 }}>
            You must verify ownership of this website in Google Search Console before we can pull the live traffic metrics. 
            Connect your Google account to generate the secure OAuth token.
          </p>
          <button 
            onClick={() => {
              const apiUrl = import.meta.env.VITE_API_URL || '';
              window.location.href = `${apiUrl}/api/thedal/gscintel/auth/google?clientId=default`;
            }}
            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Verify with Google
          </button>
        </div>
      ) : (
        <>
          {/* DELAY WARNING */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px 20px', borderRadius: 8, marginBottom: 24, color: '#f59e0b', fontSize: 13, fontWeight: 500 }}>
            <AlertCircle size={16} />
            <span><strong>Data Freshness:</strong> Please note that Google Search Console data is typically delayed by 2-3 days according to Google's official processing schedule.</span>
          </div>

          {/* METRICS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 10 }}>
            <MetricCard title="Total Clicks" value={data?.metrics?.clicks.toLocaleString()} trend={data?.metrics?.trends?.clicks || 0} icon={MousePointerClick} color="#3b82f6" />
            <MetricCard title="Total Impressions" value={data?.metrics?.impressions.toLocaleString()} trend={data?.metrics?.trends?.impressions || 0} icon={Eye} color="#8b5cf6" />
            <MetricCard title="Average CTR" value={`${data?.metrics?.ctr}%`} trend={data?.metrics?.trends?.ctr || 0} icon={Target} color="#10b981" />
            <MetricCard title="Average Position" value={data?.metrics?.position} trend={data?.metrics?.trends?.position || 0} icon={LineChart} color="#f59e0b" reverseGood={true} />
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 30, textAlign: 'right' }}>
            Last updated: 1 hour ago
          </div>

          {(!data?.queries || data.queries.length === 0) ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 60, textAlign: 'center', borderRadius: 12, border: `1px dashed ${C.border}` }}>
              <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 10 }}>No Data Available Yet</h2>
              <p style={{ color: C.muted, fontSize: 15 }}>GSC data is still being processed by Google. Please check back in 24-48 hours.</p>
            </div>
          ) : (
            <>
              {/* TABS */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                {['topQueries', 'topPages', 'quickWins'].map((tab) => {
                  const tabLabels = {
                    'topQueries': 'Top Queries',
                    'topPages': 'Top Pages',
                    'quickWins': 'Quick Wins ⚡'
                  };
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        background: activeTab === tab ? '#3b82f6' : 'rgba(255,255,255,0.02)',
                        color: activeTab === tab ? '#fff' : C.text,
                        border: `1px solid ${activeTab === tab ? '#3b82f6' : C.border}`,
                        padding: '10px 20px',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tabLabels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* DATA TABLE */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 600 }}>
                    {activeTab === 'topQueries' ? 'Top Search Queries' : activeTab === 'topPages' ? 'Top Pages' : 'Quick Wins (Page 2 Keywords)'}
                  </h3>
                </div>

                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                        <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                          {activeTab === 'topPages' ? 'Page URL' : 'Search Query'}
                        </th>
                        <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Clicks</th>
                        <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Impressions</th>
                        <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>CTR</th>
                        <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Position</th>
                        {activeTab === 'quickWins' && <th style={{ padding: '16px 20px', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentTableData.length === 0 ? (
                        <tr>
                          <td colSpan={activeTab === 'quickWins' ? 6 : 5} style={{ padding: '40px', textAlign: 'center', color: C.muted }}>
                            No data available for this view.
                          </td>
                        </tr>
                      ) : (
                        currentTableData.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${C.border}55`, transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                            <td style={{ padding: '16px 20px', fontSize: 14, color: '#e2e8f0', fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.page || item.query}>
                              {item.page || item.query}
                            </td>
                            <td style={{ padding: '16px 20px', fontSize: 14, color: '#93c5fd', textAlign: 'right', fontWeight: 600 }}>{item.clicks.toLocaleString()}</td>
                            <td style={{ padding: '16px 20px', fontSize: 14, color: C.muted, textAlign: 'right' }}>{item.impressions.toLocaleString()}</td>
                            <td style={{ padding: '16px 20px', fontSize: 14, color: C.muted, textAlign: 'right' }}>{item.ctr}%</td>
                            <td style={{ padding: '16px 20px', fontSize: 14, color: '#fff', textAlign: 'right' }}>
                              <span style={{ background: item.position <= 10 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: item.position <= 10 ? '#22c55e' : '#f59e0b', padding: '4px 10px', borderRadius: 12, fontWeight: 600 }}>
                                {item.position}
                              </span>
                            </td>
                            {activeTab === 'quickWins' && (
                              <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                <button 
                                  onClick={() => handlePushToPage1(item.query)}
                                  style={{ background: 'rgba(245, 158, 11, 0.2)', border: 'none', color: '#f59e0b', padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                  title="Add to keyword tracking map"
                                >
                                  Push to Page 1
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
