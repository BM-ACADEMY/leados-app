import { useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
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

export const Header = ({user}) => {
  const location = useLocation();
  const activePath = location.pathname.substring(1) || 'dashboard';
  const activeLabel = LABELS[activePath] || 'Dashboard';

  const initial = user?.name ? user.name[0].toUpperCase() : 'K';
  const roleLabel = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Super Admin';
  const nameLabel = user?.name || 'Kamar';

  return (
    <div style={{height:54,background:C.surface,borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 22px',flexShrink:0}}>
      <div>
        <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text}}>{activeLabel}</span>
        <span style={{color:C.dim,fontSize:12,marginLeft:7}}>- LeadOS by BM TechX</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:7,background:C.card,border:'1px solid '+C.border,borderRadius:7,padding:'6px 11px'}}>
          <Search size={11} color={C.muted} />
          <input placeholder="Quick search..." style={{background:'transparent',border:'none',color:C.text,fontSize:11,outline:'none',width:150}} />
        </div>
        <button style={{position:'relative',width:34,height:34,borderRadius:7,background:C.card,border:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Bell size={14} color={C.muted} />
          <div style={{position:'absolute',top:7,right:7,width:6,height:6,borderRadius:'50%',background:C.accent}} />
        </button>
        <div style={{display:'flex',alignItems:'center',gap:7,background:C.card,border:'1px solid '+C.border,borderRadius:7,padding:'5px 11px'}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,'+C.accent+',#ea580c)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#fff'}}>{initial}</div>
          <div>
            <p style={{fontSize:10,fontWeight:600,color:C.text}}>{nameLabel}</p>
            <p style={{fontSize:8,color:C.muted}}>{roleLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
