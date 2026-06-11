import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Inbox, Zap, FileText, Brain, BarChart2, Building2, Settings, LogOut, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Layers, UploadCloud, Columns, Sparkles, List, User, BookOpen, Plus, Globe, Star } from 'lucide-react';
import { C } from '../../constants/theme.js';

const NAV = [
  { path: '/dashboard', Icon: Home,      label: 'Dashboard' },
  { path: '/leads',     Icon: Users,     label: 'Leads' },
  { path: '/inbox',     Icon: Inbox,     label: 'Inbox', showBadge: true },
  { path: '/campaigns', Icon: Zap,       label: 'Campaigns' },
  { path: '/templates', Icon: FileText,  label: 'Templates' },
  { path: '/brain',     Icon: Brain,     label: 'AI Brain' },
  { path: '/reports',   Icon: BarChart2, label: 'Reports' },
  { path: '/clients',   Icon: Building2, label: 'Clients' },
];

export const Sidebar = ({ onLogout, unreadCount = 0, mobileOpen, setMobileOpen }) => {
  const [isExpanded, setIsExpanded] = useState(window.innerWidth > 768);
  const [allianceOpen, setAllianceOpen] = useState(false);
  const [gmbOpen, setGmbOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsExpanded(true); // Auto expand on mobile for better usability in the offcanvas
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {mobileOpen && (
        <div 
          className="mobile-overlay show-mobile" 
          onClick={() => setMobileOpen(false)} 
          style={{ display: 'none' }} 
        />
      )}
      <div 
        className={`mobile-sidebar ${!mobileOpen ? 'closed' : ''}`} 
        style={{ width: isExpanded ? 240 : 62, transition: 'width 0.2s, transform 0.3s', background: C.surface, borderRight: '1px solid ' + C.border, display: 'flex', flexDirection: 'column', alignItems: isExpanded ? 'flex-start' : 'center', padding: '14px 0', height: '100vh', flexShrink: 0, overflowY: 'auto', overflowX: 'hidden' }}
      >
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isExpanded ? 'space-between' : 'center', width: '100%', padding: isExpanded ? '0 18px' : '0', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,' + C.accent + ',#ea580c)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>L</div>
            {isExpanded && <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>LeadOS</span>}
          </div>
        </div>

        <div className="hide-mobile" style={{ width: '100%', padding: isExpanded ? '0 14px' : '0', marginBottom: 12, display: 'flex', justifyContent: isExpanded ? 'flex-end' : 'center' }}>
          <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, zIndex: 10 }}>
            {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: isExpanded ? '0 12px' : '0 7px' }}>
          {NAV.map((item) => {
            const Icon = item.Icon;
            const displayBadge = item.showBadge && unreadCount > 0;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                title={!isExpanded ? item.label : undefined}
                style={({ isActive }) => ({
                  width: '100%',
                  height: 42,
                  borderRadius: 9,
                  border: 'none',
                  background: isActive ? C.accent + '22' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isExpanded ? 'flex-start' : 'center',
                  padding: isExpanded ? '0 12px' : '0',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.15s',
                  textDecoration: 'none',
                })}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} color={isActive ? C.accent : C.muted} />
                    {isExpanded && <span style={{ marginLeft: 12, fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? C.accent : C.text }}>{item.label}</span>}
                    {displayBadge && (
                      <div style={{ position: 'absolute', top: 6, right: isExpanded ? 12 : 6, width: 13, height: 13, borderRadius: '50%', background: C.accent, fontSize: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {unreadCount}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Alliance Parent Link with Nested Children */}
          <div style={{ width: '100%', marginTop: 8 }}>
            <button
              onClick={() => {
                setAllianceOpen(!allianceOpen);
                if (!isExpanded) setIsExpanded(true); // Auto-expand sidebar if collapsed
              }}
              title={!isExpanded ? "AllianceOS" : undefined}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 9,
                border: 'none',
                background: allianceOpen ? C.accent + '11' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isExpanded ? 'space-between' : 'center',
                padding: isExpanded ? '0 12px' : '0',
                cursor: 'pointer',
                color: allianceOpen ? C.accent : C.muted,
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Layers size={17} color={allianceOpen ? C.accent : C.muted} />
                {isExpanded && <span style={{ marginLeft: 12, fontSize: 13, fontWeight: allianceOpen ? 600 : 500 }}>AllianceOS</span>}
              </div>
              {isExpanded && (
                allianceOpen ? <ChevronUp size={14} color={C.muted} /> : <ChevronDown size={14} color={C.muted} />
              )}
            </button>

            {/* Child Links */}
            {isExpanded && allianceOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 24, marginTop: 4, position: 'relative' }}>
                {/* Left indicator line */}
                <div style={{ position: 'absolute', left: 20, top: 4, bottom: 10, width: 1, background: C.border }} />
                
                <NavLink to="/alliance-dashboard" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <Home size={14} style={{ marginRight: 8 }} /> Dashboard
                </NavLink>

                <NavLink to="/upload-leads" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <UploadCloud size={14} style={{ marginRight: 8 }} /> Upload Leads
                </NavLink>

                <NavLink to="/lead-list" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <List size={14} style={{ marginRight: 8 }} /> Lead List
                </NavLink>

                <NavLink to="/pipeline" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <Columns size={14} style={{ marginRight: 8 }} /> Pipeline
                </NavLink>

                <NavLink to="/lead-profile" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <User size={14} style={{ marginRight: 8 }} /> Lead Profile
                </NavLink>

                <NavLink to="/knowledge-base" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <BookOpen size={14} style={{ marginRight: 8 }} /> Knowledge Base
                </NavLink>

                <NavLink to="/prompt-manager" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <Sparkles size={14} style={{ marginRight: 8 }} /> Prompt Manager
                </NavLink>

              </div>
            )}
          </div>

          {/* GMB Mafiya Parent Link with Nested Children */}
          <div style={{ width: '100%', marginTop: 8 }}>
            <button
              onClick={() => {
                setGmbOpen(!gmbOpen);
                if (!isExpanded) setIsExpanded(true); // Auto-expand sidebar if collapsed
              }}
              title={!isExpanded ? "GMB Mafiya" : undefined}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 9,
                border: 'none',
                background: gmbOpen ? C.accent + '11' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isExpanded ? 'space-between' : 'center',
                padding: isExpanded ? '0 12px' : '0',
                cursor: 'pointer',
                color: gmbOpen ? C.accent : C.muted,
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Globe size={17} color={gmbOpen ? C.accent : C.muted} />
                {isExpanded && <span style={{ marginLeft: 12, fontSize: 13, fontWeight: gmbOpen ? 600 : 500 }}>GMB Mafiya</span>}
              </div>
              {isExpanded && (
                gmbOpen ? <ChevronUp size={14} color={C.muted} /> : <ChevronDown size={14} color={C.muted} />
              )}
            </button>

            {/* Child Links */}
            {isExpanded && gmbOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 24, marginTop: 4, position: 'relative' }}>
                {/* Left indicator line */}
                <div style={{ position: 'absolute', left: 20, top: 4, bottom: 10, width: 1, background: C.border }} />
                
                <NavLink to="/gmb/add-client" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <Plus size={14} style={{ marginRight: 8 }} /> Add client
                </NavLink>

                <NavLink to="/gmb/loyalty" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <Star size={14} style={{ marginRight: 8 }} /> Loyalty
                </NavLink>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: isExpanded ? '0 12px' : '0 7px', display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
          <NavLink
            to="/settings"
            onClick={handleNavClick}
            title={!isExpanded ? "Settings" : undefined}
            style={({ isActive }) => ({
              width: '100%',
              height: 42,
              borderRadius: 9,
              border: 'none',
              background: isActive ? C.accent + '22' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isExpanded ? 'flex-start' : 'center',
              padding: isExpanded ? '0 12px' : '0',
              cursor: 'pointer',
              textDecoration: 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <Settings size={17} color={isActive ? C.accent : C.muted} />
                {isExpanded && <span style={{ marginLeft: 12, fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? C.accent : C.text }}>Settings</span>}
              </>
            )}
          </NavLink>
          <button
            onClick={onLogout}
            title={!isExpanded ? "Logout" : undefined}
            style={{ width: '100%', height: 42, borderRadius: 9, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: isExpanded ? 'flex-start' : 'center', padding: isExpanded ? '0 12px' : '0', cursor: 'pointer' }}
          >
            <LogOut size={17} color={C.muted} />
            {isExpanded && <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 500, color: C.text }}>Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};
