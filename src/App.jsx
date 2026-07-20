import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { STYLE } from './constants/theme.js';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { Header } from './components/layout/Header.jsx';
import { useAuth } from './hooks/useAuth.js';
import { Dashboard } from './views/Dashboard.jsx';
import { LeadsView } from './views/LeadsView.jsx';
import { InboxView } from './views/InboxView.jsx';
import { CampaignsView } from './views/CampaignsView.jsx';
import { TemplatesView } from './views/TemplatesView.jsx';
import { AIBrainView } from './views/AIBrainView.jsx';
import { ReportsView } from './views/ReportsView.jsx';
import { FounderReportsView } from './views/FounderReportsView.jsx';
import { ClientsView } from './views/ClientsView.jsx';
import { SettingsView } from './views/SettingsView.jsx';
import { WorkflowsView } from './views/WorkflowsView.jsx';


import { AllianceDashboard } from './views/AllianceDashboard.jsx';
import { UploadLeads } from './views/UploadLeads.jsx';
import { LeadList } from './views/LeadList.jsx';
import { Pipeline } from './views/Pipeline.jsx';
import { LeadProfile } from './views/LeadProfile.jsx';
import { KnowledgeBase } from './views/KnowledgeBase.jsx';
import { PromptManager } from './views/PromptManager.jsx';
import { AllianceInboxView } from './views/AllianceInboxView.jsx';
import ContentOSDashboard from '../contentos/ContentOSDashboard.jsx';

import KeywordTracking from './views/thedal/KeywordTracking.jsx';
import ThedalHQ from './views/thedal/ThedalHQ.jsx';
import GscIntel from './views/thedal/GscIntel.jsx';
import OnPageAudit from './views/thedal/OnPageAudit.jsx';
import ContentFactory from './views/thedal/ContentFactory.jsx';
import MonthlyReport from './views/thedal/MonthlyReport.jsx';
import RankDropAlert from './views/thedal/RankDropAlert.jsx';
import ClientOnboard from './views/thedal/ClientOnboard.jsx';
import SerpRadar from './views/thedal/SerpRadar.jsx';
import GapHunter from './views/thedal/GapHunter.jsx';
import SchemaLibrary from './views/thedal/SchemaLibrary.jsx';
import CompetitorSpy from './views/thedal/CompetitorSpy.jsx';
import BacklinkTracker from './views/thedal/BacklinkTracker.jsx';
import LocalCitations from './views/thedal/LocalCitations.jsx';
import LocalSeoBridge from './views/thedal/LocalSeoBridge.jsx';
import PlanManagement from './views/thedal/PlanManagement.jsx';
import PlanSubscription from './views/thedal/PlanSubscription.jsx';
import { ClientProvider } from './contexts/ClientContext.jsx';
import AddClientMafiya from './views/mafiya/AddClient.jsx';
import LoyaltyMafiya from './views/mafiya/Loyalty.jsx';
import GmbBrain from './views/mafiya/GmbBrain.jsx';
import StreetPosts from './views/mafiya/StreetPosts.jsx';
import GbpInsights from './views/mafiya/GbpInsights.jsx';
import RivalFamilies from './views/mafiya/RivalFamilies.jsx';

function LoginPage({ login, authLoading, authError }) {
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

  return (
    <>
      <style>{STYLE}</style>
      <div style={{ minHeight: '100vh', background: '#060c17', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 25% 25%, rgba(249,115,22,0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59,130,246,0.05) 0%, transparent 50%)' }} />
        <div style={{ background: '#0c1525', border: '1px solid #1a2e4a', borderRadius: 18, padding: 46, width: 410, position: 'relative', boxShadow: '0 0 80px rgba(0,0,0,0.6)' }}>
          <div style={{ textAlign: 'center', marginBottom: 34 }}>
            <div style={{ width: 54, height: 54, background: 'linear-gradient(135deg,#f97316,#ea580c)', borderRadius: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 14 }}>L</div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: '#e2e8f0' }}>LeadOS</h1>
            <p style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>ABM Groups - Powered by BM TechX</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                style={{ width: '100%', background: '#060c17', border: '1px solid #1a2e4a', borderRadius: 9, padding: '11px 14px', color: '#e2e8f0', fontSize: 13, outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Password</label>
              <input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                type="password"
                placeholder="Enter password"
                style={{ width: '100%', background: '#060c17', border: '1px solid #1a2e4a', borderRadius: 9, padding: '11px 14px', color: '#e2e8f0', fontSize: 13, outline: 'none' }}
              />
            </div>
            {(loginError || authError) && (
              <div style={{ background: '#2d1010', border: '1px solid #7c2d12', borderRadius: 7, padding: 10, color: '#ef4444', fontSize: 12 }}>
                {loginError || authError}
              </div>
            )}
            <button
              type="submit"
              disabled={authLoading}
              style={{ width: '100%', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 9, padding: 14, color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px rgba(249,115,22,0.3)', opacity: authLoading ? 0.6 : 1, cursor: authLoading ? 'not-allowed' : 'pointer' }}>
              {authLoading ? 'Signing in...' : 'Sign In to LeadOS'}
            </button>
          </form>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 10, marginTop: 18 }}>API Connected - https://leados-api.abmgroups.org/</p>
        </div>
      </div>
    </>
  );
}

import { Toaster } from 'react-hot-toast';

function AppLayout({ user, logout, leadRefresh, setLeadRefresh }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLeadClick = (lead) => {
    navigate('/inbox', { state: { leadId: lead.id } });
  };
  return (
    <>
      <style>{STYLE}</style>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' } }} />
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar onLogout={logout} mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', width: '100%' }}>
          <Header user={user} onMenuClick={() => setMobileMenuOpen(true)} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leads" element={<LeadsView onLeadClick={handleLeadClick} refreshTrigger={leadRefresh} />} />
              <Route path="/inbox" element={<InboxView />} />
              <Route path="/campaigns" element={<CampaignsView />} />
              <Route path="/templates" element={<TemplatesView />} />
              <Route path="/brain" element={<AIBrainView />} />
              <Route path="/reports" element={<ReportsView />} />
              <Route path="/founder-reports" element={<FounderReportsView />} />
              <Route path="/clients" element={<ClientsView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/workflows" element={<WorkflowsView />} />
              
              <Route path="/alliance-dashboard" element={<AllianceDashboard />} />
              <Route path="/upload-leads" element={<UploadLeads />} />
              <Route path="/lead-list" element={<LeadList />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/lead-profile" element={<LeadProfile />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/prompt-manager" element={<PromptManager />} />
              <Route path="/alliance-inbox" element={<AllianceInboxView />} />
              <Route path="/admin/content-os/approval" element={<ContentOSDashboard defaultPage="approval" />} />
              <Route path="/admin/content-os/monitors" element={<ContentOSDashboard defaultPage="monitors" />} />
              <Route path="/admin/content-os/scheduler" element={<ContentOSDashboard defaultPage="scheduler" />} />
              <Route path="/admin/content-os/captions" element={<ContentOSDashboard defaultPage="captions" />} />
              <Route path="/admin/content-os/social-connection" element={<ContentOSDashboard defaultPage="accounts" />} />
              <Route path="/admin/content-os/tokens" element={<ContentOSDashboard defaultPage="tokens" />} />
              <Route path="/admin/content-os/logs" element={<ContentOSDashboard defaultPage="logs" />} />
              <Route path="/admin/content-os/reach" element={<ContentOSDashboard defaultPage="reach" />} />
              <Route path="/admin/content-os/failed" element={<ContentOSDashboard defaultPage="failed" />} />

              <Route path="/thedal/clients" element={<ClientOnboard />} />
              <Route path="/thedal/plan-subscription" element={<PlanSubscription />} />
              <Route path="/thedal/plans" element={<PlanManagement />} />
              <Route path="/thedal" element={<ThedalHQ />} />
              <Route path="/thedal/keyword-tracking" element={<KeywordTracking />} />
              <Route path="/thedal/gsc-intel" element={<GscIntel />} />
              <Route path="/thedal/on-page-audit" element={<OnPageAudit />} />
              <Route path="/thedal/content-factory" element={<ContentFactory />} />
              <Route path="/thedal/monthly-report" element={<MonthlyReport />} />
              <Route path="/thedal/rank-drop-alert" element={<RankDropAlert />} />
              <Route path="/thedal/serp-radar" element={<SerpRadar />} />
              <Route path="/thedal/gap-hunter" element={<GapHunter />} />
              <Route path="/thedal/schema-library" element={<SchemaLibrary />} />
              <Route path="/thedal/competitor-spy" element={<CompetitorSpy />} />
              <Route path="/thedal/backlink-tracker" element={<BacklinkTracker />} />
              <Route path="/thedal/local-citations" element={<LocalCitations />} />
              <Route path="/thedal/local-seo-bridge" element={<LocalSeoBridge />} />

              <Route path="/mafiya/add-client" element={<AddClientMafiya />} />
              <Route path="/mafiya/loyalty" element={<LoyaltyMafiya />} />
              <Route path="/mafiya/brain" element={<GmbBrain />} />
              <Route path="/mafiya/street-posts" element={<StreetPosts />} />
              <Route path="/mafiya/gbp-insights" element={<GbpInsights />} />
              <Route path="/mafiya/rivals" element={<RivalFamilies />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const { user, login, logout, loading: authLoading, error: authError } = useAuth();
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadRefresh, setLeadRefresh] = useState(0);

  if (!user) {
    return <LoginPage login={login} authLoading={authLoading} authError={authError} />;
  }

  return (
    <BrowserRouter>
      <ClientProvider>
        <AppLayout
          user={user}
          logout={logout}
          leadRefresh={leadRefresh}
          setLeadRefresh={setLeadRefresh}
        />
      </ClientProvider>
    </BrowserRouter>
  );
}
