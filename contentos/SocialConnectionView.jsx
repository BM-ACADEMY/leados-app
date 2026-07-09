import { useState, useEffect } from 'react';
import { Share2, Link as LinkIcon, CheckCircle, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { C } from '../src/constants/theme.js';
import { api } from '../src/services/api.js';


export const SocialConnectionView = () => {
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
    const loadConfig = async () => {
      try {
        const res = await api.get('/api/content/config');
        setMetaAppId(res.appId || '');
      } catch (err) {
        console.error('Error loading meta config in social settings:', err);
      }
    };
    loadConfig();
    loadConnectedAccounts();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const via = params.get('via');
    if (code) {
      setLoadingMeta(true);
      // Clean query params from address bar
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const exchangeCode = async () => {
        try {
          const redirectUri = via === 'settings'
            ? window.location.origin + '/settings'
            : window.location.origin + '/admin/content-os/social-connection';

          const res = await api.post('/api/content/meta/callback', { code, redirectUri });
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
    const redirectUri = window.location.origin + '/admin/content-os/social-connection';
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

  return (
    <div className="p-mobile" style={{ padding: '24px clamp(12px, 4vw, 36px)', background: C.background, height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 26, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: C.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent }}>
            <Share2 size={20} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, color: C.text }}>
              Social Connections
            </h1>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Connect Facebook Pages and Instagram Accounts to automate Content OS scheduling.
            </p>
          </div>
        </div>

        {/* Info card */}
        <div style={{ background: '#0a1220', border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 28, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <ShieldCheck size={22} color={C.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Meta Integration Live</h4>
            <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
              Ensure your Meta App is published/live on the developer portal. Newly connected accounts will immediately be ready to stream, transcode, and publish video reels to page feeds.
            </p>
          </div>
        </div>

        {/* Main Panel */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '24px clamp(14px, 3vw, 28px)', boxShadow: '0 4px 30px rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            Connect Social Channels
          </h3>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 22 }}>
            Link your brand's official Facebook Page and associated Instagram Business accounts.
          </p>

          <div style={{ marginBottom: 26 }}>
            <button
              type="button"
              onClick={handleConnectMeta}
              disabled={loadingMeta}
              style={{
                background: '#1877F2',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: loadingMeta ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 4px 14px rgba(24,119,242,0.3)',
                transition: 'transform 0.15s, opacity 0.15s'
              }}
            >
              {loadingMeta ? <Loader2 size={16} className="animate-spin" /> : <span>👍</span>}
              {loadingMeta ? 'Connecting Account...' : 'Connect with Facebook & Instagram'}
            </button>
          </div>

          {loadingMeta && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b22', border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 20 }}>
              <Loader2 size={14} className="animate-spin" color={C.accent} />
              <p style={{ fontSize: 11, color: C.muted }}>Processing authentication callback from Meta...</p>
            </div>
          )}

          {/* Discovered Accounts */}
          {discoveredAccounts.length > 0 && (
            <div style={{ marginTop: 24, marginBottom: 28 }}>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Discovered Meta Assets:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {discoveredAccounts.map((item, idx) => (
                  <div key={idx} style={{ background: '#070d19', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{item.facebook.name}</p>
                        <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>FB Page ID: {item.facebook.page_id}</p>
                        {item.instagram ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e1306c11', border: '1px solid #e1306c22', padding: '3px 8px', borderRadius: 20, marginTop: 8 }}>
                            <span style={{ fontSize: 10, color: '#e1306c', fontWeight: 600 }}>
                              🔗 Instagram: @{item.instagram.username}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f59e0b11', border: '1px solid #f59e0b22', padding: '3px 8px', borderRadius: 20, marginTop: 8 }}>
                            <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 500 }}>
                              ⚠️ No connected Instagram Business Account
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
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
                          style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, padding: '8px 12px', borderRadius: 8, fontSize: 12, outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="" disabled>Link to Brand Dashboard...</option>
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
            </div>
          )}

          {/* Connected Accounts List */}
          {connectedAccounts.filter(acc => acc.access_token).length > 0 ? (
            <div style={{ marginTop: 28, borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
              <h4 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={15} color={C.green} /> Currently Connected Channels
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {connectedAccounts.filter(acc => acc.access_token).map((acc, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      background: '#070d19', 
                      border: `1px solid ${C.border}`, 
                      borderRadius: 10, 
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                          {acc.account_name}
                        </span>
                        <span 
                          style={{ 
                            background: acc.platform === 'facebook' ? '#1877F215' : '#E1306C15', 
                            color: acc.platform === 'facebook' ? '#1877F2' : '#E1306C', 
                            padding: '3px 8px', 
                            borderRadius: 6, 
                            fontSize: 9, 
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          {acc.platform}
                        </span>
                      </div>
                      <p style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>
                        Brand: <strong style={{ color: C.text }}>{acc.brand_name}</strong> | ID: {acc.platform === 'facebook' ? acc.facebook_page_id : acc.instagram_business_id}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: C.green, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} /> Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 28, borderTop: `1px solid ${C.border}`, paddingTop: 24, textAlign: 'center', padding: 24, background: '#070d1922', borderRadius: 10 }}>
              <AlertTriangle size={20} color={C.muted} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 12, color: C.muted }}>No social accounts currently connected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
