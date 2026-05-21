import { Home, Users, Inbox, Zap, FileText, Brain, BarChart2, Building2, Settings, LogOut } from 'lucide-react';
import { C } from '../../constants/theme.js';
import { NAV } from '../../data/mockData.js';

const ICONS = {
  Home, Users, Inbox, Zap, FileText, Brain, BarChart2, Building2, Settings, LogOut,
};

export const Sidebar = ({active, setActive, onLogout}) => (
  <div style={{width:62,background:C.surface,borderRight:'1px solid '+C.border,display:'flex',flexDirection:'column',alignItems:'center',padding:'14px 0',height:'100vh',flexShrink:0}}>
    <div style={{width:38,height:38,background:'linear-gradient(135deg,'+C.accent+',#ea580c)',borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:'#fff',marginBottom:22}}>L</div>
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:1,width:'100%',padding:'0 7px'}}>
      {NAV.map((item) => {
        const Icon = ICONS[item.Icon];
        return (
          <button key={item.id} onClick={() => setActive(item.id)} title={item.label} style={{width:'100%',height:42,borderRadius:9,border:'none',background:active===item.id?C.accent+'22':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative',transition:'background 0.1s'}}>
            <Icon size={17} color={active===item.id?C.accent:C.muted} />
            {item.badge && <div style={{position:'absolute',top:6,right:6,width:13,height:13,borderRadius:'50%',background:C.accent,fontSize:8,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{item.badge}</div>}
          </button>
        );
      })}
    </div>
    <div style={{padding:'0 7px',display:'flex',flexDirection:'column',gap:1,width:'100%'}}>
      <button onClick={() => setActive('settings')} title="Settings" style={{width:'100%',height:42,borderRadius:9,border:'none',background:active==='settings'?C.accent+'22':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
        <Settings size={17} color={active==='settings'?C.accent:C.muted} />
      </button>
      <button onClick={onLogout} title="Logout" style={{width:'100%',height:42,borderRadius:9,border:'none',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
        <LogOut size={15} color={C.muted} />
      </button>
    </div>
  </div>
);
