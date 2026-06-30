import { useState, useEffect } from 'react';
import { Brain, CheckCircle, Star, Plus, Trash2, Globe, Edit2 } from 'lucide-react';
import { C } from '../constants/theme.js';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';

export const SettingsView = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('account');
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);

  // GMB Mafiya Plans State
  const [mafiyaPlans, setMafiyaPlans] = useState(() => {
    const saved = localStorage.getItem('gmb_mafiya_plans');
    return saved ? JSON.parse(saved) : [
      { name: 'Starter', price: '2,999', features: ['4 posts/month', '3 keywords', 'Basic report'], isPopular: false },
      { name: 'Growth', price: '4,999', features: ['8 posts/month', '5 keywords', 'Full report + competitor'], isPopular: true },
      { name: 'Business', price: '8,999', features: ['12 posts/month', '10 keywords', 'Advanced SEO + calls'], isPopular: false }
    ];
  });

  useEffect(() => {
    localStorage.setItem('gmb_mafiya_plans', JSON.stringify(mafiyaPlans));
  }, [mafiyaPlans]);

  // Form State for creating/editing a plan
  const [editingIdx, setEditingIdx] = useState(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newPlanPosts, setNewPlanPosts] = useState('');
  const [newPlanKeywords, setNewPlanKeywords] = useState('');
  const [newPlanReport, setNewPlanReport] = useState('Basic report');
  const [newPlanPopular, setNewPlanPopular] = useState(false);

  const [phoneId, setPhoneId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [waBizId, setWaBizId] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [status, setStatus] = useState('active');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const [discoveredAccounts, setDiscoveredAccounts] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [linkingBrand, setLinkingBrand] = useState(false);
  const [metaAppId, setMetaAppId] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  const loadConnectedAccounts = async () => {
    try {
      const res = await api.get('/api/content/social-accounts');
      setConnectedAccounts(res || []);
    } catch (err) {
      console.error('Error loading connected accounts:', err);
    }
  };

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
    const loadConfig = async () => {
      try {
        const res = await api.get('/api/content/config');
        setMetaAppId(res.appId || '');
      } catch (err) {
        console.error('Error loading meta config in settings:', err);
      }
    };
    loadClients();
    loadConfig();
    loadConnectedAccounts();
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setTab('social');
      setLoadingMeta(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const exchangeCode = async () => {
        try {
          const res = await api.post('/api/content/meta/callback', { code });
          if (res.success && res.accounts) {
            setDiscoveredAccounts(res.accounts);
            alert(`Successfully authenticated with Meta! Discovered ${res.accounts.length} page(s).`);
          } else {
            alert('Meta connection succeeded, but no pages were found.');
          }
        } catch (err) {
          console.error('Meta OAuth Callback exchange failed:', err);
          alert('Failed to connect to Meta: ' + err.message);
        } finally {
          setLoadingMeta(false);
        }
      };
      exchangeCode();
    }
  }, []);

  const handleConnectMeta = () => {
    if (!metaAppId) {
      alert('Meta App ID is not configured on the backend. Please add META_APP_ID to your server .env file.');
      return;
    }
    const redirectUri = window.location.origin + '/settings';
    const fbUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management,public_profile&response_type=code`;
    window.location.href = fbUrl;
  };

  const handleLinkToBrand = async (brandName, platform, accountName, accountId, facebookPageId, instagramBusinessId, accessToken, expiresAt) => {
    setLinkingBrand(true);
    try {
      const res = await api.post('/api/content/meta/link-account', {
        brand_name: brandName,
        platform,
        account_name: accountName,
        account_id: accountId,
        facebook_page_id: facebookPageId,
        instagram_business_id: instagramBusinessId,
        access_token: accessToken,
        expires_at: expiresAt
      });
      if (res.success) {
        alert(`Successfully linked ${platform} (${accountName}) to brand "${brandName}"!`);
        loadConnectedAccounts();
      } else {
        alert('Failed to link account to brand');
      }
    } catch (err) {
      alert('Linking brand account failed: ' + err.message);
    } finally {
      setLinkingBrand(false);
    }
  };

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

  const handleEditPlan = (idx) => {
    const plan = mafiyaPlans[idx];
    setEditingIdx(idx);
    setNewPlanName(plan.name);
    
    // Strip ₹ and commas
    const parsedPrice = plan.price.replace(/[₹,]/g, '');
    setNewPlanPrice(parsedPrice);

    // Parse features
    let posts = '';
    let keywords = '';
    let report = 'Basic report';

    plan.features.forEach(feat => {
      if (feat.includes('posts/month')) {
        posts = feat.replace(' posts/month', '');
      } else if (feat.includes('keywords')) {
        keywords = feat.replace(' keywords', '');
      } else {
        report = feat;
      }
    });

    setNewPlanPosts(posts);
    setNewPlanKeywords(keywords);
    setNewPlanReport(report);
    setNewPlanPopular(plan.isPopular || false);
  };

  const handleCancelEdit = () => {
    setEditingIdx(null);
    setNewPlanName('');
    setNewPlanPrice('');
    setNewPlanPosts('');
    setNewPlanKeywords('');
    setNewPlanReport('Basic report');
    setNewPlanPopular(false);
  };

  const handleDeletePlan = (idx) => {
    if (window.confirm(`Are you sure you want to delete the plan "${mafiyaPlans[idx].name}"?`)) {
      const updatedPlans = mafiyaPlans.filter((_, i) => i !== idx);
      setMafiyaPlans(updatedPlans);
      if (editingIdx === idx) {
        handleCancelEdit();
      } else if (editingIdx !== null && editingIdx > idx) {
        setEditingIdx(editingIdx - 1);
      }
    }
  };

  return (
    <div className="p-mobile" style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text, marginBottom: 22 }}>Settings</h1>
      <div className="flex-col-mobile" style={{ display: 'flex', gap: 18 }}>
        <div className="w-full-mobile" style={{ width: 180 }}>
          {[['account', 'Account'], ['whatsapp', 'WhatsApp API'], ['social', 'Social Accounts'], ['team', 'Team'], ['notifications', 'Alerts'], ['billing', 'Billing']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ width: '100%', textAlign: 'left', padding: '9px 13px', borderRadius: 7, border: 'none', background: tab === k ? C.accent + '20' : 'transparent', color: tab === k ? C.accent : C.muted, fontSize: 12, fontWeight: tab === k ? 600 : 400, marginBottom: 1, cursor: 'pointer' }}>
              {tab === k && <span style={{ marginRight: 5 }}>›</span>}{l}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, background: C.card, border: '1px solid ' + C.border, borderRadius: 13, padding: 22 }}>
          {tab === 'account' && (
            <form onSubmit={handleSavePassword}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Account & Password Settings</h3>
              {[['Business Name', user?.brand_name || 'Your Brand'], ['Portal Name', 'LeadOS by BM TechX'], ['Admin Email', user?.email || 'admin@example.com'], ['Contact', user?.phone || 'N/A'], ['Website', user?.website || 'N/A']].map(([l, v]) => (
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

              {[
                ['Phone Number ID', phoneId, setPhoneId, 'Meta Developer Phone ID'],
                ['Access Token', accessToken, setAccessToken, 'EAAB...'],
                ['WhatsApp Business Account ID', waBizId, setWaBizId, 'Meta WA Business Account ID'],
                ['WhatsApp Number', waNumber, setWaNumber, '+91...'],
              ].map(([label, val, setter, placeholder]) => (
                <div key={label} style={{ marginBottom: 13 }}>
                  <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</label>
                  <input value={val} onChange={(e) => setter(e.target.value)} placeholder={placeholder} style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '8px 11px', fontSize: 11, outline: 'none', fontFamily: 'monospace' }} />
                </div>
              ))}

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

          {tab === 'social' && (
            <div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Social Accounts Connection</h3>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 18 }}>
                Connect your Facebook Pages and Instagram Business Accounts to enable automated content auto-publishing.
              </p>

              <div style={{ marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={handleConnectMeta}
                  disabled={loadingMeta}
                  style={{
                    background: '#1877F2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 7,
                    padding: '10px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: loadingMeta ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <span>👍</span> {loadingMeta ? 'Connecting...' : 'Connect with Facebook & Instagram'}
                </button>
              </div>

              {loadingMeta && <p style={{ fontSize: 11, color: C.muted }}>Processing Meta OAuth callback. Please wait...</p>}

              {discoveredAccounts.length > 0 && (
                <div style={{ marginTop: 22 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Discovered Assets:</h4>
                  {discoveredAccounts.map((item, idx) => (
                    <div key={idx} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 9, padding: 14, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <p style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{item.facebook.name}</p>
                          <p style={{ fontSize: 10, color: C.muted }}>FB Page ID: {item.facebook.page_id}</p>
                          {item.instagram ? (
                            <p style={{ fontSize: 10, color: C.green, marginTop: 4 }}>
                              🔗 Connected IG: <strong>@{item.instagram.username}</strong> ({item.instagram.name})
                            </p>
                          ) : (
                            <p style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
                              ⚠️ No connected Instagram Business Account found for this page.
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <select 
                            disabled={linkingBrand}
                            onChange={(e) => {
                              const brand = e.target.value;
                              if (!brand) return;
                              handleLinkToBrand(brand, 'facebook', item.facebook.name, item.facebook.page_id, item.facebook.page_id, null, item.facebook.access_token, item.expires_at);
                              if (item.instagram) {
                                handleLinkToBrand(brand, 'instagram', item.instagram.username, item.instagram.business_id, item.facebook.page_id, item.instagram.business_id, item.instagram.access_token, item.expires_at);
                              }
                            }}
                            defaultValue=""
                            style={{ background: C.card, color: C.text, border: '1px solid ' + C.border, padding: '6px 10px', borderRadius: 6, fontSize: 11, outline: 'none' }}
                          >
                            <option value="" disabled>Link to Brand...</option>
                            <option value="BM Academy">BM Academy</option>
                            <option value="BM TechX">BM TechX</option>
                            <option value="Namma Pondy Properties">Namma Pondy Properties</option>
                            <option value="Dada's Kitchen">Dada's Kitchen</option>
                            <option value="ABM Groups">ABM Groups</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Connected Accounts List */}
              {connectedAccounts.filter(acc => acc.access_token).length > 0 && (
                <div style={{ marginTop: 26, borderTop: '1px solid ' + C.border, paddingTop: 20 }}>
                  <h4 style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                    Currently Connected Accounts
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {connectedAccounts.filter(acc => acc.access_token).map((acc, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          background: C.surface, 
                          border: '1px solid ' + C.border, 
                          borderRadius: 8, 
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                              {acc.account_name}
                            </span>
                            <span 
                              style={{ 
                                background: acc.platform === 'facebook' ? '#1877F220' : '#E1306C20', 
                                color: acc.platform === 'facebook' ? '#1877F2' : '#E1306C', 
                                padding: '2px 6px', 
                                borderRadius: 4, 
                                fontSize: 9, 
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}
                            >
                              {acc.platform}
                            </span>
                          </div>
                          <p style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                            Brand: <strong>{acc.brand_name}</strong> | ID: {acc.platform === 'facebook' ? acc.facebook_page_id : acc.instagram_business_id}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: C.green, fontSize: 11, fontWeight: 600 }}>● Connected</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'notifications' && (
            <div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Alert Settings</h3>
              {[
                ['Hot lead detected', 'Send WhatsApp alert to assigned team', true],
                ['Payment received', 'Notify admin and team member', true],
                ['Daily summary report', 'Sent at 9 PM every day', true],
                ['AI agent failure', 'Immediate alert', false]
              ].map(([l, d, on]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid ' + C.border }}>
                  <div><p style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{l}</p><p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{d}</p></div>
                  <div style={{ width: 38, height: 20, borderRadius: 10, background: on ? C.accent : C.border, position: 'relative', cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.15s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'mafiya-plan' && (
            <div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>GMB Mafiya Pricing Plans</h3>
              
              {/* Plan Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                {mafiyaPlans.map((plan, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      background: C.surface,
                      border: plan.isPopular ? '2px solid #eab308' : '1px solid ' + C.border,
                      borderRadius: 12,
                      padding: '20px 24px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 180,
                    }}
                  >
                    {/* Action Buttons */}
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleEditPlan(idx)}
                        title="Edit Plan"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          color: editingIdx === idx ? C.accent : C.muted,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(idx)}
                        title="Delete Plan"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          color: '#f87171',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingRight: 40 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: plan.isPopular ? '#eab308' : C.text }}>
                        {plan.name}
                      </span>
                      {plan.isPopular && (
                        <span style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Star size={12} fill="#eab308" />
                        </span>
                      )}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: 24, fontWeight: 800, color: C.text, fontFamily: "'Syne',sans-serif" }}>
                        ₹{plan.price}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted }}>/mo</span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: C.muted }}>
                      {plan.features.map((feat, fidx) => (
                        <li key={fidx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: plan.isPopular ? '#eab308' : C.accent }}>•</span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Create/Edit Plan Form */}
              <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: 18 }}>
                <h4 style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14 }}>
                  {editingIdx !== null ? 'Edit Pricing Plan' : 'Create New Pricing Plan'}
                </h4>
                
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newPlanName || !newPlanPrice) {
                      alert('Plan Name and Price are required');
                      return;
                    }
                    const features = [];
                    if (newPlanPosts) features.push(`${newPlanPosts} posts/month`);
                    if (newPlanKeywords) features.push(`${newPlanKeywords} keywords`);
                    if (newPlanReport) features.push(newPlanReport);

                    const updatedPlan = {
                      name: newPlanName,
                      price: parseInt(newPlanPrice).toLocaleString('en-IN'),
                      features: features.length > 0 ? features : ['Basic access'],
                      isPopular: newPlanPopular
                    };

                    if (editingIdx !== null) {
                      const updatedPlans = [...mafiyaPlans];
                      updatedPlans[editingIdx] = updatedPlan;
                      setMafiyaPlans(updatedPlans);
                      alert(`Plan "${newPlanName}" updated successfully!`);
                      setEditingIdx(null);
                    } else {
                      setMafiyaPlans([...mafiyaPlans, updatedPlan]);
                      alert(`Plan "${newPlanName}" created successfully!`);
                    }

                    // Reset form
                    setNewPlanName('');
                    setNewPlanPrice('');
                    setNewPlanPosts('');
                    setNewPlanKeywords('');
                    setNewPlanReport('Basic report');
                    setNewPlanPopular(false);
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="grid-responsive">
                    <div>
                      <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Plan Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Growth Pro"
                        value={newPlanName}
                        onChange={(e) => setNewPlanName(e.target.value)}
                        style={{ width: '100%', background: C.card, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Price (INR / month) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 5999"
                        value={newPlanPrice}
                        onChange={(e) => setNewPlanPrice(e.target.value)}
                        style={{ width: '100%', background: C.card, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="grid-responsive">
                    <div>
                      <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Posts Per Month</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={newPlanPosts}
                        onChange={(e) => setNewPlanPosts(e.target.value)}
                        style={{ width: '100%', background: C.card, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Target Keywords</label>
                      <input
                        type="number"
                        placeholder="e.g. 8"
                        value={newPlanKeywords}
                        onChange={(e) => setNewPlanKeywords(e.target.value)}
                        style={{ width: '100%', background: C.card, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }} className="grid-responsive">
                    <div>
                      <label style={{ display: 'block', fontSize: 9, color: C.muted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Report Type</label>
                      <select
                        value={newPlanReport}
                        onChange={(e) => setNewPlanReport(e.target.value)}
                        style={{ width: '100%', background: C.card, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, padding: '9px 11px', fontSize: 12, outline: 'none' }}
                      >
                        <option value="Basic report">Basic report</option>
                        <option value="Full report + competitor">Full report + competitor</option>
                        <option value="Advanced SEO + calls">Advanced SEO + calls</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
                      <input
                        type="checkbox"
                        id="isPopular"
                        checked={newPlanPopular}
                        onChange={(e) => setNewPlanPopular(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor="isPopular" style={{ fontSize: 12, color: C.text, fontWeight: 500, cursor: 'pointer' }}>Mark as Popular plan (⭐)</label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    {editingIdx !== null && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        style={{
                          background: 'transparent',
                          border: '1px solid ' + C.border,
                          borderRadius: 7,
                          color: C.text,
                          padding: '8px 18px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      style={{
                        background: C.accent,
                        border: 'none',
                        borderRadius: 7,
                        color: '#fff',
                        padding: '8px 18px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {editingIdx !== null ? (
                        <>Save Changes</>
                      ) : (
                        <>
                          <Plus size={14} /> Create Plan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {(tab === 'team' || tab === 'billing') && (
            <div style={{ textAlign: 'center', padding: 36, color: C.muted }}>
              <Brain size={28} color={C.muted} style={{ margin: '0 auto 11px' }} />
              <p>Available in full deployment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
