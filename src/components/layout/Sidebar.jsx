import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, LineChart, Inbox, Zap, FileText, Brain, BarChart2, Building2, Settings, LogOut, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Layers, UploadCloud, Columns, Sparkles, List, User, BookOpen, CheckSquare, MonitorPlay, Search, Activity, FileSearch, ShieldAlert, FileOutput, MapPin, Share2, Eye, FileJson, GitPullRequest, Link as LinkIcon, Target, Shield, UserPlus, Heart, Megaphone } from 'lucide-react';
import { C } from '../../constants/theme.js';
import { useClient } from '../../contexts/ClientContext.jsx';

const NAV = [
  { path: '/dashboard', Icon: Home, label: 'Dashboard' },
  { path: '/leads', Icon: Users, label: 'Leads' },
  { path: '/inbox', Icon: Inbox, label: 'Inbox', showBadge: true },
  { path: '/campaigns', Icon: Zap, label: 'Campaigns' },
  { path: '/templates', Icon: FileText, label: 'Templates' },
  { path: '/brain', Icon: Brain, label: 'AI Brain' },
  { path: '/reports', Icon: BarChart2, label: 'Reports' },
  { path: '/clients', Icon: Building2, label: 'Clients' },
];

export const Sidebar = ({ onLogout, unreadCount = 0, mobileOpen, setMobileOpen }) => {
  const [isExpanded, setIsExpanded] = useState(window.innerWidth > 768);
  const [allianceOpen, setAllianceOpen] = useState(false);
  const [contentOsOpen, setContentOsOpen] = useState(false);
  const [thedalOsOpen, setThedalOsOpen] = useState(false);
  const [mafiyaOpen, setMafiyaOpen] = useState(false);
  const [rankDropCount, setRankDropCount] = useState(0);
  
  const { clients, plans, activeClient, setActiveClient } = useClient();

  // Fetch unread rank drop alert count
  useEffect(() => {
    const fetchRankDropCount = async () => {
      try {
        const token = localStorage.getItem('leados_token');
        const API_URL = import.meta.env.VITE_API_URL || '';
        const url = activeClient 
          ? `${API_URL}/api/thedal/rankdropalert/count?client=${encodeURIComponent(activeClient.business_name || activeClient.client_name)}`
          : `${API_URL}/api/thedal/rankdropalert/count`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRankDropCount(data.count || 0);
        }
      } catch (e) { /* silent */ }
    };
    fetchRankDropCount();
    const interval = setInterval(fetchRankDropCount, 5 * 60 * 1000); // every 5 mins
    return () => clearInterval(interval);
  }, [activeClient]);

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

  const isFeatureEnabled = (featureName) => {
    if (!activeClient) return true; // Enable all if no client selected
    
    const plan = plans.find(p => p.name === activeClient.plan);
    if (!plan || !plan.features) return false;
    
    return plan.features.some(f => f.feature_name === featureName);
  };

  const getLinkStyle = (isActive, featureName = null) => {
    const enabled = featureName ? isFeatureEnabled(featureName) : true;
    return {
      width: '100%',
      height: 36,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      fontSize: 13,
      color: isActive ? C.accent : C.muted,
      background: isActive ? C.accent + '11' : 'transparent',
      textDecoration: 'none',
      fontWeight: 500,
      opacity: enabled ? 1 : 0.3,
      pointerEvents: enabled ? 'auto' : 'none'
    };
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

                <NavLink to="/alliance-inbox" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <Inbox size={14} style={{ marginRight: 8 }} /> Inbox
                </NavLink>

              </div>
            )}
          </div>

          {/* Content OS Parent Link */}
          <div style={{ width: '100%', marginTop: 8 }}>
            <button
              onClick={() => {
                setContentOsOpen(!contentOsOpen);
                if (!isExpanded) setIsExpanded(true);
              }}
              title={!isExpanded ? "Content OS" : undefined}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 9,
                border: 'none',
                background: contentOsOpen ? C.accent + '11' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isExpanded ? 'space-between' : 'center',
                padding: isExpanded ? '0 12px' : '0',
                cursor: 'pointer',
                color: contentOsOpen ? C.accent : C.muted,
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <MonitorPlay size={17} color={contentOsOpen ? C.accent : C.muted} />
                {isExpanded && <span style={{ marginLeft: 12, fontSize: 13, fontWeight: contentOsOpen ? 600 : 500 }}>Content OS</span>}
              </div>
              {isExpanded && (
                contentOsOpen ? <ChevronUp size={14} color={C.muted} /> : <ChevronDown size={14} color={C.muted} />
              )}
            </button>

            {/* Child Links */}
            {isExpanded && contentOsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 24, marginTop: 4, position: 'relative' }}>
                {/* Left indicator line */}
                <div style={{ position: 'absolute', left: 20, top: 4, bottom: 10, width: 1, background: C.border }} />

                <NavLink to="/admin/content-os/approval" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <CheckSquare size={14} style={{ marginRight: 8 }} /> Approval Room
                </NavLink>

                <NavLink to="/admin/content-os/monitors" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <FileSearch size={14} style={{ marginRight: 8 }} /> Folder Monitors
                </NavLink>

                <NavLink to="/admin/content-os/scheduler" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <Target size={14} style={{ marginRight: 8 }} /> Scheduler
                </NavLink>

                <NavLink to="/admin/content-os/captions" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <Sparkles size={14} style={{ marginRight: 8 }} /> Caption Studio
                </NavLink>

                <NavLink to="/admin/content-os/social-connection" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <Share2 size={14} style={{ marginRight: 8 }} /> Social Accounts
                </NavLink>

                <NavLink to="/admin/content-os/tokens" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <Shield size={14} style={{ marginRight: 8 }} /> Token Health
                </NavLink>

                <NavLink to="/admin/content-os/logs" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <FileText size={14} style={{ marginRight: 8 }} /> Publish Logs
                </NavLink>

                <NavLink to="/admin/content-os/reach" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <BarChart2 size={14} style={{ marginRight: 8 }} /> Reach Report
                </NavLink>

                <NavLink to="/admin/content-os/failed" onClick={handleNavClick} style={({ isActive }) => ({ width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: isActive ? C.accent : C.muted, background: isActive ? C.accent + '11' : 'transparent', textDecoration: 'none', fontWeight: 500 })}>
                  <ShieldAlert size={14} style={{ marginRight: 8 }} /> Failed Jobs
                </NavLink>
              </div>
            )}
          </div>

          {/* Thedal OS Parent Link */}
          <div style={{ width: '100%', marginTop: 8 }}>
            <button
              onClick={() => {
                setThedalOsOpen(!thedalOsOpen);
                if (!isExpanded) setIsExpanded(true);
              }}
              title={!isExpanded ? "Thedal OS" : undefined}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 9,
                border: 'none',
                background: thedalOsOpen ? C.accent + '11' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isExpanded ? 'space-between' : 'center',
                padding: isExpanded ? '0 12px' : '0',
                cursor: 'pointer',
                color: thedalOsOpen ? C.accent : C.muted,
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Search size={17} color={thedalOsOpen ? C.accent : C.muted} />
                {isExpanded && <span style={{ marginLeft: 12, fontSize: 13, fontWeight: thedalOsOpen ? 600 : 500 }}>Thedal OS</span>}
              </div>
              {isExpanded && (
                thedalOsOpen ? <ChevronUp size={14} color={C.muted} /> : <ChevronDown size={14} color={C.muted} />
              )}
            </button>

            {/* Child Links */}
            {isExpanded && thedalOsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 24, marginTop: 4, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 20, top: 4, bottom: 10, width: 1, background: C.border }} />

                {/* Client Selector Dropdown */}
                <div style={{ padding: '8px 10px 12px 0' }}>
                  <select
                    value={activeClient ? activeClient.id : ''}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === parseInt(e.target.value));
                      setActiveClient(client || null);
                    }}
                    style={{ width: '100%', background: '#0f172a', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', cursor: 'pointer', appearance: 'none' }}
                  >
                    <option value="" style={{ background: '#0f172a', color: '#fff' }}>All Clients (No Selection)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} style={{ background: '#0f172a', color: '#fff' }}>
                        {c.business_name && c.client_name && c.business_name !== c.client_name 
                          ? `${c.business_name} (${c.client_name})` 
                          : c.business_name || c.client_name} - {c.plan}
                      </option>
                    ))}
                  </select>
                </div>

                <NavLink to="/thedal/keyword-tracking" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Keyword Tracking Limit')}>
                  <Activity size={14} style={{ marginRight: 8 }} /> Keyword Tracking
                </NavLink>

                <NavLink to="/thedal/gsc-intel" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'GSC Intel Access')}>
                  <LineChart size={14} style={{ marginRight: 8 }} /> GSC Intel
                </NavLink>

                <NavLink to="/thedal/on-page-audit" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'On-Page Audit Scans/mo')}>
                  <FileSearch size={14} style={{ marginRight: 8 }} /> On-Page Audit
                </NavLink>

                <NavLink to="/thedal/content-factory" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Content Factory Drafts/mo')}>
                  <Brain size={14} style={{ marginRight: 8 }} /> Content Factory
                </NavLink>

                <NavLink to="/thedal/monthly-report" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Monthly PDF Report')}>
                  <FileOutput size={14} style={{ marginRight: 8 }} /> Monthly PDF Report
                </NavLink>

                <NavLink to="/thedal/rank-drop-alert" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Rank Drop Alert')}>
                  <ShieldAlert size={14} style={{ marginRight: 8 }} /> Rank Drop Alert
                  {rankDropCount > 0 && (
                    <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 20, minWidth: 18, textAlign: 'center', lineHeight: '16px' }}>
                      {rankDropCount}
                    </span>
                  )}
                </NavLink>

                <div style={{ margin: '16px 0 8px 10px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Manage</div>
                
                <NavLink to="/thedal/clients" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive)}>
                  <Target size={14} style={{ marginRight: 8 }} /> Clients
                </NavLink>

                <NavLink to="/thedal/plan-subscription" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive)}>
                  <Activity size={14} style={{ marginRight: 8 }} /> Plan Subscription
                </NavLink>
                
                <NavLink to="/thedal/plans" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive)}>
                  <Activity size={14} style={{ marginRight: 8 }} /> Plans & Pricing
                </NavLink>

                <div style={{ margin: '16px 0 8px 10px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Intelligence</div>

                <NavLink to="/thedal/serp-radar" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'SERP Radar Access')}>
                  <Eye size={14} style={{ marginRight: 8 }} /> SERP Radar
                </NavLink>

                <NavLink to="/thedal/gap-hunter" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Gap Hunter Access')}>
                  <Target size={14} style={{ marginRight: 8 }} /> Gap Hunter
                </NavLink>

                <NavLink to="/thedal/schema-library" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Schema Library Builder')}>
                  <FileJson size={14} style={{ marginRight: 8 }} /> Schema Library
                </NavLink>

                <NavLink to="/thedal/competitor-spy" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Competitor Spy Limit')}>
                  <GitPullRequest size={14} style={{ marginRight: 8 }} /> Competitor Spy
                </NavLink>

                <NavLink to="/thedal/backlink-tracker" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Backlink Tracker CRM')}>
                  <LinkIcon size={14} style={{ marginRight: 8 }} /> Backlink Tracker
                </NavLink>

                <NavLink to="/thedal/local-citations" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Local Citations')}>
                  <MapPin size={14} style={{ marginRight: 8 }} /> Local Citations
                </NavLink>

                <NavLink to="/thedal/local-seo-bridge" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Local SEO Bridge (GMB)')}>
                  <Share2 size={14} style={{ marginRight: 8 }} /> Local SEO Bridge
                </NavLink>
              </div>
            )}
          </div>

          {/* Mafiya OS Section */}
          <div style={{ width: '100%', marginTop: 8 }}>
            <button
              onClick={() => {
                setMafiyaOpen(!mafiyaOpen);
                if (!isExpanded) setIsExpanded(true);
              }}
              title={!isExpanded ? "Mafiya OS" : undefined}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 9,
                border: 'none',
                background: mafiyaOpen ? C.accent + '11' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isExpanded ? 'space-between' : 'center',
                padding: isExpanded ? '0 12px' : '0',
                cursor: 'pointer',
                color: mafiyaOpen ? C.accent : C.muted,
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Shield size={17} color={mafiyaOpen ? C.accent : C.muted} />
                {isExpanded && <span style={{ marginLeft: 12, fontSize: 13, fontWeight: mafiyaOpen ? 600 : 500 }}>Mafiya OS</span>}
              </div>
              {isExpanded && (
                mafiyaOpen ? <ChevronUp size={14} color={C.muted} /> : <ChevronDown size={14} color={C.muted} />
              )}
            </button>

            {/* Child Links */}
            {isExpanded && mafiyaOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 24, marginTop: 4, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 20, top: 4, bottom: 10, width: 1, background: C.border }} />

                <NavLink to="/mafiya/add-client" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'GMB Clients')}>
                  <UserPlus size={14} style={{ marginRight: 8 }} /> GMB Clients
                </NavLink>

                <NavLink to="/thedal/keyword-tracking" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Turf Control')}>
                  <Target size={14} style={{ marginRight: 8 }} /> Turf Control
                </NavLink>

                <NavLink to="/mafiya/loyalty" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Loyalty (Review)')}>
                  <Heart size={14} style={{ marginRight: 8 }} /> Loyalty (Review)
                </NavLink>

                <NavLink to="/mafiya/gbp-insights" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'GBP Insights')}>
                  <BarChart2 size={14} style={{ marginRight: 8 }} /> GBP Insights
                </NavLink>
                
                <NavLink to="/mafiya/street-posts" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'Street Posts')}>
                  <Megaphone size={14} style={{ marginRight: 8 }} /> Street Posts
                </NavLink>

                <NavLink to="/mafiya/brain" onClick={handleNavClick} style={({ isActive }) => getLinkStyle(isActive, 'GMB Brain')}>
                  <Brain size={14} style={{ marginRight: 8 }} /> GMB Brain
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
