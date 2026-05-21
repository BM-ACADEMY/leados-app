import { useState } from 'react';
import { STYLE } from './constants/theme.js';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { Header } from './components/layout/Header.jsx';
import { LeadModal } from './components/LeadModal.jsx';
import { useAuth } from './hooks/useAuth.js';
import {
  Dashboard,
  LeadsView,
  InboxView,
  CampaignsView,
  TemplatesView,
  AIBrainView,
  ReportsView,
  ClientsView,
  SettingsView,
} from './views/index.jsx';

export default function App() {
  const { user, login, logout, loading: authLoading, error: authError } = useAuth();
  const [active, setActive] = useState('dashboard');
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadRefresh, setLeadRefresh] = useState(0);
  const [email, setEmail] = useState('kamar@abmgroups.org');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const success = await login(email, pass);
    if (!success) {
      setLoginError('Invalid email or password');
    }
  };

  if (!user) {
    return (
      <>
        <style>{STYLE}</style>
        <div style={{minHeight:'100vh',background:'#060c17',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 25% 25%, rgba(249,115,22,0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59,130,246,0.05) 0%, transparent 50%)'}} />
          <div style={{background:'#0c1525',border:'1px solid #1a2e4a',borderRadius:18,padding:46,width:410,position:'relative',boxShadow:'0 0 80px rgba(0,0,0,0.6)'}}>
            <div style={{textAlign:'center',marginBottom:34}}>
              <div style={{width:54,height:54,background:'linear-gradient(135deg,#f97316,#ea580c)',borderRadius:15,display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:'#fff',marginBottom:14}}>L</div>
              <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:'#e2e8f0'}}>LeadOS</h1>
              <p style={{color:'#475569',fontSize:11,marginTop:4}}>ABM Groups - Powered by BM TechX</p>
            </div>
            <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{marginBottom:0}}>
                <label style={{display:'block',fontSize:9,color:'#64748b',marginBottom:6,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  style={{width:'100%',background:'#060c17',border:'1px solid #1a2e4a',borderRadius:9,padding:'11px 14px',color:'#e2e8f0',fontSize:13,outline:'none'}}
                />
              </div>
              <div style={{marginBottom:0}}>
                <label style={{display:'block',fontSize:9,color:'#64748b',marginBottom:6,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>Password</label>
                <input
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  type="password"
                  placeholder="Enter password"
                  style={{width:'100%',background:'#060c17',border:'1px solid #1a2e4a',borderRadius:9,padding:'11px 14px',color:'#e2e8f0',fontSize:13,outline:'none'}}
                />
              </div>
              {(loginError || authError) && (
                <div style={{background:'#2d1010',border:'1px solid #7c2d12',borderRadius:7,padding:10,color:'#ef4444',fontSize:12}}>
                  {loginError || authError}
                </div>
              )}
              <button
                type="submit"
                disabled={authLoading}
                style={{width:'100%',background:'linear-gradient(135deg,#f97316,#ea580c)',border:'none',borderRadius:9,padding:14,color:'#fff',fontSize:13,fontWeight:700,boxShadow:'0 4px 20px rgba(249,115,22,0.3)',opacity:authLoading?0.6:1,cursor:authLoading?'not-allowed':'pointer'}}>
                {authLoading ? 'Signing in...' : 'Sign In to LeadOS'}
              </button>
            </form>
            <p style={{textAlign:'center',color:'#64748b',fontSize:10,marginTop:18}}>API Connected - https://leados-api.abmgroups.org/</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{STYLE}</style>
      <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
        <Sidebar active={active} setActive={setActive} onLogout={logout} />
        <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
          <Header active={active} user={user} />
          <div style={{flex:1,overflow:'hidden'}}>
            {active === 'dashboard' && <Dashboard />}
            {active === 'leads' && <LeadsView onLeadClick={setSelectedLead} refreshTrigger={leadRefresh} />}
            {active === 'inbox' && <InboxView />}
            {active === 'campaigns' && <CampaignsView />}
            {active === 'templates' && <TemplatesView />}
            {active === 'brain' && <AIBrainView />}
            {active === 'reports' && <ReportsView />}
            {active === 'clients' && <ClientsView />}
            {active === 'settings' && <SettingsView />}
          </div>
        </div>
        {selectedLead && <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={() => setLeadRefresh(prev => prev + 1)} />}
      </div>
    </>
  );
}
