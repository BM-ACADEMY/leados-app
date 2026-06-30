import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, X, FileText, Menu } from 'lucide-react';
import { C } from '../../constants/theme.js';

const LABELS = {
  dashboard: 'Dashboard',
  leads: 'Lead Management',
  inbox: 'WhatsApp Inbox',
  campaigns: 'Bulk Campaigns',
  templates: 'Templates',
  brain: 'AI Brain',
  reports: 'Reports',
  clients: 'Clients',
  settings: 'Settings',
};

const SEARCH_PAGES = [
  { path: '/dashboard', label: 'Dashboard', desc: 'Overview and quick stats' },
  { path: '/leads', label: 'Lead Management', desc: 'View, filter, and manage all leads' },
  { path: '/inbox', label: 'WhatsApp Inbox', desc: 'Chat directly with your leads' },
  { path: '/campaigns', label: 'Bulk Campaigns', desc: 'Send mass WhatsApp messages' },
  { path: '/templates', label: 'Templates', desc: 'Manage WhatsApp message templates' },
  { path: '/brain', label: 'AI Brain', desc: 'Configure AI assistant behavior' },
  { path: '/reports', label: 'Reports', desc: 'Detailed analytics and performance' },
  { path: '/clients', label: 'Clients', desc: 'Manage client accounts and billing' },
  { path: '/settings', label: 'Settings', desc: 'System configuration and preferences' },
];

export const Header = ({user, onMenuClick}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = location.pathname.substring(1) || 'dashboard';
  const activeLabel = LABELS[activePath] || 'Dashboard';

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [dataMode, setDataMode] = useState(localStorage.getItem('leados_data_mode') || 'live');

  const handleDataModeChange = (mode) => {
    setDataMode(mode);
    localStorage.setItem('leados_data_mode', mode);
    window.location.reload();
  };

  const initial = user?.name ? user.name[0].toUpperCase() : 'K';
  const roleLabel = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Super Admin';
  const nameLabel = user?.name || 'Kamar';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setSearchQuery('');
    }
  }, [searchOpen]);

  const filteredPages = SEARCH_PAGES.filter(p => 
    p.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div style={{height:54,background:C.surface,borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',flexShrink:0}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <button className="show-mobile" onClick={onMenuClick} style={{background:'transparent',border:'none',color:C.muted, display: 'none'}}>
            <Menu size={20} />
          </button>
          <div>
            <span style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:C.text}}>{activeLabel}</span>
            <span className="hide-mobile" style={{color:C.dim,fontSize:12,marginLeft:7}}>- LeadOS by BM TechX</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {/* Data Mode Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.card, border: '1px solid ' + C.border, borderRadius: 7, padding: '4px 8px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mode:</span>
            <select
              value={dataMode}
              onChange={(e) => handleDataModeChange(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: dataMode === 'live' ? '#10b981' : '#f59e0b',
                fontSize: 11,
                fontWeight: 800,
                outline: 'none',
                cursor: 'pointer',
                padding: '2px 4px'
              }}
            >
              <option value="live" style={{ background: C.surface, color: '#10b981' }}>🟢 Live API</option>
              <option value="demo" style={{ background: C.surface, color: '#f59e0b' }}>🧪 Demo Sandbox</option>
            </select>
          </div>

          <div 
            onClick={() => setSearchOpen(true)} 
            style={{display:'flex',alignItems:'center',gap:7,background:C.card,border:'1px solid '+C.border,borderRadius:7,padding:'6px 11px', cursor:'pointer', transition: 'border-color 0.2s'}}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <Search size={14} color={C.muted} />
            <span className="hide-mobile" style={{color:C.muted,fontSize:11,width:140,display:'inline-block'}}>Quick search... (Ctrl+K)</span>
          </div>
          <button className="hide-mobile" style={{position:'relative',width:34,height:34,borderRadius:7,background:C.card,border:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'center', cursor:'pointer'}}>
            <Bell size={14} color={C.muted} />
            <div style={{position:'absolute',top:7,right:7,width:6,height:6,borderRadius:'50%',background:C.accent}} />
          </button>
          <div style={{display:'flex',alignItems:'center',gap:7,background:C.card,border:'1px solid '+C.border,borderRadius:7,padding:'5px 11px'}}>
            <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,'+C.accent+',#ea580c)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#fff'}}>{initial}</div>
            <div className="hide-mobile">
              <p style={{fontSize:10,fontWeight:600,color:C.text}}>{nameLabel}</p>
              <p style={{fontSize:8,color:C.muted}}>{roleLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {searchOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:'12vh'}} onClick={() => setSearchOpen(false)}>
          <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:12,width:'90%',maxWidth:520,boxShadow:'0 20px 40px rgba(0,0,0,0.5)',overflow:'hidden'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',padding:'16px 20px',borderBottom:'1px solid '+C.border, background: C.card}}>
              <Search size={18} color={C.accent} style={{marginRight:12}} />
              <input 
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for pages..." 
                style={{flex:1,background:'transparent',border:'none',color:C.text,fontSize:15,outline:'none'}} 
              />
              <button onClick={() => setSearchOpen(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.muted, display: 'flex', alignItems: 'center'}}>
                <X size={18} />
              </button>
            </div>
            <div style={{maxHeight:380,overflowY:'auto',padding:'8px 0'}}>
              {filteredPages.length > 0 ? (
                filteredPages.map(page => (
                  <div 
                    key={page.path}
                    onClick={() => { navigate(page.path); setSearchOpen(false); }}
                    style={{display:'flex',alignItems:'center',padding:'12px 20px',cursor:'pointer',borderBottom:'1px solid transparent', transition: 'background 0.15s'}}
                    onMouseEnter={e => e.currentTarget.style.background = C.accent+'15'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{width: 32, height: 32, borderRadius: 8, background: C.accent+'22', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14}}>
                      <FileText size={16} color={C.accent} />
                    </div>
                    <div>
                      <p style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{page.label}</p>
                      <p style={{fontSize:11,color:C.muted}}>{page.desc}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{padding:'40px 20px',textAlign:'center'}}>
                  <Search size={24} color={C.muted} style={{marginBottom: 10, opacity: 0.5}} />
                  <p style={{color:C.muted,fontSize:13}}>No pages found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
            <div style={{padding: '10px 20px', background: C.card, borderTop: '1px solid '+C.border, display: 'flex', justifyContent: 'flex-end', fontSize: 10, color: C.muted}}>
              Press Esc to close
            </div>
          </div>
        </div>
      )}
    </>
  );
};
