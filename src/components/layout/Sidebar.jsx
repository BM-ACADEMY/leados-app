import { NavLink } from 'react-router-dom';
import { Home, Users, Inbox, Zap, FileText, Brain, BarChart2, Building2, Settings, LogOut } from 'lucide-react';
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

export const Sidebar = ({ onLogout, unreadCount = 0 }) => (
  <div style={{ width: 62, background: C.surface, borderRight: '1px solid ' + C.border, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', height: '100vh', flexShrink: 0 }}>
    <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,' + C.accent + ',#ea580c)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 22 }}>L</div>

    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, width: '100%', padding: '0 7px' }}>
      {NAV.map((item) => {
        const Icon = item.Icon;
        const displayBadge = item.showBadge && unreadCount > 0;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            style={({ isActive }) => ({
              width: '100%',
              height: 42,
              borderRadius: 9,
              border: 'none',
              background: isActive ? C.accent + '22' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.15s',
              textDecoration: 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} color={isActive ? C.accent : C.muted} />
                {displayBadge && (
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 13, height: 13, borderRadius: '50%', background: C.accent, fontSize: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {unreadCount}
                  </div>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </div>

    <div style={{ padding: '0 7px', display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
      <NavLink
        to="/settings"
        title="Settings"
        style={({ isActive }) => ({
          width: '100%',
          height: 42,
          borderRadius: 9,
          border: 'none',
          background: isActive ? C.accent + '22' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          textDecoration: 'none',
        })}
      >
        {({ isActive }) => <Settings size={17} color={isActive ? C.accent : C.muted} />}
      </NavLink>
      <button
        onClick={onLogout}
        title="Logout"
        style={{ width: '100%', height: 42, borderRadius: 9, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <LogOut size={15} color={C.muted} />
      </button>
    </div>
  </div>
);
