import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.js';
import html2pdf from 'html2pdf.js';
import { useClient } from '../../contexts/ClientContext.jsx';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { 
  Loader2, Play, CheckCircle2, XCircle, AlertTriangle, Globe, Activity, 
  BrainCircuit, Link as LinkIcon, Type, Search, Download, Copy, Printer, 
  Clock, Smartphone, Shield, CheckSquare, Square, ExternalLink, MapPin 
} from 'lucide-react';

const C = {
  bg: '#0d1117',
  surface: '#161b22',
  card: '#161b22',
  border: '#30363d',
  blue: '#2563eb',
  green: '#22c55e',
  orange: '#f59e0b',
  red: '#ef4444',
  text: '#f0f6fc',
  muted: '#8b949e'
};

const stopWordsList = new Set([
  'the', 'a', 'and', 'or', 'in', 'of', 'to', 'is', 'that', 'it', 'for', 'on', 'with', 
  'as', 'this', 'was', 'at', 'by', 'an', 'be', 'are', 'from', 'but', 'if', 'your', 'you',
  'we', 'our', 'us', 'they', 'them', 'he', 'she', 'him', 'her', 'my', 'can', 'will'
]);

function CountUp({ end, duration = 800 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const endVal = Number(end) || 0;
    if (endVal === 0) return;
    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const rate = Math.min(progress / duration, 1);
      setCount(Math.round(rate * endVal));
      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  return <span>{count}</span>;
}

function ScoreDonut({ score, size = 100, strokeWidth = 8, title, color }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#21262d" strokeWidth={strokeWidth} />
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={radius} 
            fill="transparent" 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round" 
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }} 
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 800, color: '#f0f6fc' }}>{Math.round(score)}%</span>
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textAlign: 'center' }}>{title}</span>
    </div>
  );
}

export default function OnPageAudit() {
  const { activeClient } = useClient();
  const [url, setUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [auditData, setAuditData] = useState(null);
  
  const [activeTab, setActiveTab] = useState('onPage');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const pdfContainerRef = useRef(null);

  const [offPageCheck, setOffPageCheck] = useState({});
  const [gmbCheck, setGmbCheck] = useState({});

  const hasLocalBusinessSchema = auditData && auditData.schemaInfo && auditData.schemaInfo.types && auditData.schemaInfo.types.some(t => t.toLowerCase().includes('business') || t.toLowerCase().includes('local'));
  const foundPhone = auditData && auditData.phone ? auditData.phone : '';

  useEffect(() => {
    const fetchSavedAudit = async () => {
      if (!activeClient) {
        setAuditData(null);
        setUrl('');
        setOffPageCheck({});
        return;
      }
      try {
        const res = await api.get(`/thedal/seo-audit/saved?clientId=${activeClient.id}`);
        if (res.saved) {
          setUrl(res.url || '');
          setAuditData(res.auditData || null);
          setOffPageCheck(res.offPageChecklist || {});
          
          if (res.auditData) {
            setKeyword(res.auditData.inferredKeyword || 'seo');
            setBusinessName(res.auditData.inferredBusinessName || 'Local Business');
            setCity(res.auditData.inferredCity || 'Local Area');
          }
        } else {
          setAuditData(null);
          setUrl('');
          setOffPageCheck({});
        }
      } catch (err) {
        console.error('Failed to fetch saved audit', err);
      }
    };
    fetchSavedAudit();
  }, [activeClient]);

  const getDomainKey = (rawUrl) => {
    try {
      return new URL(rawUrl).hostname.replace(/\./g, '_');
    } catch (e) {
      return 'default';
    }
  };

  const toggleOffPageItem = async (item) => {
    const updated = { ...offPageCheck, [item]: !offPageCheck[item] };
    setOffPageCheck(updated);

    if (activeClient) {
      try {
        await api.put('/thedal/seo-audit/offpage', {
          clientId: activeClient.id,
          checklist: updated
        });
      } catch (err) {
        console.error('Failed to save offpage checklist to DB', err);
      }
    }

    // Update auditData and scores in real-time if an audit is already loaded
    if (auditData) {
      const offPageCheckedCount = Object.values(updated).filter(Boolean).length;
      const newOffPageScore = Math.round((offPageCheckedCount / 10) * 100);
      const newOverallScore = Math.round((auditData.onPage.score + auditData.technical.score + newOffPageScore + auditData.local.score) / 4);
      
      const newAuditData = {
        ...auditData,
        overallScore: newOverallScore,
        offPage: { score: newOffPageScore }
      };
      setAuditData(newAuditData);
    }
  };

  const toggleGmbItem = (item) => {
    const key = getDomainKey(url);
    const updated = { ...gmbCheck, [item]: !gmbCheck[item] };
    setGmbCheck(updated);
    localStorage.setItem(`seo_gmb_${key}`, JSON.stringify(updated));
  };

  const runAudit = async () => {
    if (!activeClient) {
      setError('Please select a client from the sidebar first.');
      return;
    }
    if (!url.trim()) {
      setError('Please enter a valid URL.');
      return;
    }
    
    setError('');
    setLoading(true);
    setProgress(10);
    setStatusText('Fetching page...');

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Progress bar simulation timer
    let currentProgress = 10;
    const progressTimer = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += 5;
        setProgress(currentProgress);
        if (currentProgress < 30) setStatusText('Fetching page...');
        else if (currentProgress < 55) setStatusText('Checking Technical...');
        else if (currentProgress < 75) setStatusText('Scanning Off-Page signals...');
        else setStatusText('Running Local SEO checks...');
      }
    }, 450);

    try {
      const resData = await api.post('/thedal/seo-audit', { 
        url: normalizedUrl,
        clientId: activeClient.id
      });
      
      clearInterval(progressTimer);
      setProgress(100);
      setStatusText('Complete!');

      // Set inferred details in UI
      setKeyword(resData.inferredKeyword || 'seo');
      setBusinessName(resData.inferredBusinessName || 'Local Business');
      setCity(resData.inferredCity || 'Local Area');

      // Calculate Off-Page checklist completion
      const offPageCheckedCount = Object.values(offPageCheck).filter(Boolean).length;
      const offPageScore = Math.round((offPageCheckedCount / 10) * 100);

      // Recompute overall health score including client-side checklist completion rate
      const overallScore = Math.round((resData.onPage.score + resData.technical.score + offPageScore + resData.local.score) / 4);

      const finalResult = {
        ...resData,
        overallScore,
        offPage: { score: offPageScore }
      };

      setAuditData(finalResult);

      await new Promise(r => setTimeout(r, 400));
      setLoading(false);
    } catch (err) {
      clearInterval(progressTimer);
      console.error(err);
      setError(err.message || 'Audit execution failed. Ensure connection or backend server is running.');
      setLoading(false);
    }
  };

  const getGrade = (score) => {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  const getScoreColor = (score) => {
    if (score >= 75) return C.green;
    if (score >= 50) return C.orange;
    return C.red;
  };

  const copySummaryToClipboard = () => {
    if (!auditData) return;
    const summary = `
# SEO Audit Summary - LeadOS Portal
URL: ${url}
Date: ${new Date().toLocaleDateString()}
Target Keyword: "${keyword}"

## Scores:
- Overall SEO Score: ${auditData.overallScore}% (Grade ${getGrade(auditData.overallScore)})
- On-Page SEO Score: ${auditData.onPage.score}/100
- Technical SEO Score: ${auditData.technical.score}/100
- Off-Page Checklist Score: ${auditData.offPage.score}%
- Local SEO Score: ${auditData.local.score}/100

## Quick Findings:
- Total page words: ${auditData.onPage.checks.find(c => c.id === 'content-length-check')?.value || ''}
- Target keyword density: ${auditData.densityInfo.percent.toFixed(2)}%
- Broken links: ${auditData.linksCount.broken}
- Schema types found: ${auditData.schemaInfo.types.join(', ') || 'None'}
    `.trim();

    navigator.clipboard.writeText(summary)
      .then(() => setShowCopyModal(true))
      .catch(() => alert('Failed to copy.'));
  };

  const triggerDownloadReport = () => {
    if (!auditData || !pdfContainerRef.current) return;
    
    // Temporarily make it visible for html2canvas to capture
    const el = pdfContainerRef.current;
    const originalDisplay = el.style.display;
    el.style.display = 'block';
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    el.style.top = '0';
    
    const opt = {
      margin:       [15, 15, 15, 15],
      filename:     `SEO_Audit_${getDomainKey(url)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(el).save().then(() => {
      // Restore styles
      el.style.display = originalDisplay;
      el.style.position = '';
      el.style.left = '';
      el.style.top = '';
    });
  };

  const activeChecks = () => {
    if (!auditData) return [];
    if (activeTab === 'onPage') return auditData.onPage.checks;
    if (activeTab === 'technical') return auditData.technical.checks;
    if (activeTab === 'local') return auditData.local.checks;
    return [];
  };

  const filteredCards = activeChecks().filter(c => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  return (
    <div className="p-mobile" style={{ padding: '26px', overflowY: 'auto', height: '100%', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="screen-only" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={28} color={C.blue} />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#ffffff' }}>All-in-One SEO Audit Tool</h1>
            <p style={{ color: C.muted, fontSize: '14px', marginTop: 4 }}>Deep browser analysis of On-Page, Off-Page, Technical & Local SEO signals</p>
          </div>
        </div>

        {/* Audit Inputs Container */}
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '24px', marginBottom: 32 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Website URL / Domain *</label>
            <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 8, background: '#0a0e14', overflow: 'hidden' }}>
              <div style={{ padding: 12, borderRight: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center' }}><Globe size={16} /></div>
              <input 
                type="text" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="https://example.com" 
                style={{ width: '100%', border: 'none', background: 'transparent', color: '#fff', outline: 'none', padding: '12px', fontSize: 15 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runAudit();
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <button 
              onClick={runAudit} 
              disabled={loading} 
              style={{ background: C.blue, color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 24, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1, transition: 'all 0.2s', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Play size={14} fill="currentColor" />}
              {loading ? 'Running Full SEO Audit...' : 'Run Full SEO Audit'}
            </button>

            {auditData && !loading && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={copySummaryToClipboard} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Copy size={14} /> Copy Summary
                </button>
                <button onClick={triggerDownloadReport} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Download size={14} /> Download as PDF
                </button>
              </div>
            )}
          </div>

          {error && <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginTop: 12 }}>{error}</div>}
        </div>

        {/* Progress Container */}
        {loading && (
          <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12, padding: '32px', textAlign: 'center', marginBottom: 32 }}>
            <Search size={40} className="spin" color={C.blue} style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 8 }}>{statusText}</h3>
            <div style={{ width: '100%', height: 8, background: '#0a0e14', borderRadius: 4, overflow: 'hidden', maxWidth: '400px', margin: '16px auto' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: C.blue, borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
            <p style={{ color: C.muted, fontSize: 13 }}>Extracting HTML, verifying tags, analyzing schemas and parsing server response codes...</p>
          </div>
        )}

        {/* Main Dashboard Panel */}
        {auditData && !loading && (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: 24, marginBottom: 32 }}>
              
              {/* Score Box */}
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: `10px solid ${getScoreColor(auditData.overallScore)}` }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '44px', fontWeight: 900, color: getScoreColor(auditData.overallScore) }}>
                      <CountUp end={auditData.overallScore} />
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginTop: -4 }}>GRADE {getGrade(auditData.overallScore)}</div>
                  </div>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 16 }}>Overall Health Score</h3>
                <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 1.5, padding: '0 10px' }}>
                  Computed average of On-Page, Off-Page, Tech, and Local audits
                </p>
              </div>

              {/* Sub Scores Chart/Canvas view Grid */}
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Detailed Segment Metrics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 24, alignItems: 'center' }}>
                  
                  {/* Radar Chart Canvas */}
                  <div style={{ height: 180, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                        { subject: 'On-Page', A: auditData.onPage.score },
                        { subject: 'Technical', A: auditData.technical.score },
                        { subject: 'Off-Page', A: auditData.offPage.score },
                        { subject: 'Local SEO', A: auditData.local.score }
                      ]}>
                        <PolarGrid stroke={C.border} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: C.muted, fontSize: 10, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: C.muted, fontSize: 8 }} axisLine={false} tickLine={false} />
                        <Radar name="SEO Scores" dataKey="A" stroke={C.blue} fill={C.blue} fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Donut Indicators */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <ScoreDonut score={auditData.onPage.score} size={80} title="On-Page" color={getScoreColor(auditData.onPage.score)} />
                    <ScoreDonut score={auditData.technical.score} size={80} title="Technical" color={getScoreColor(auditData.technical.score)} />
                    <ScoreDonut score={auditData.offPage.score} size={80} title="Off-Page" color={getScoreColor(auditData.offPage.score)} />
                    <ScoreDonut score={auditData.local.score} size={80} title="Local SEO" color={getScoreColor(auditData.local.score)} />
                  </div>

                </div>
              </div>
            </div>

            {/* Sub-features Preview Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 24, marginBottom: 32 }}>
              
              {/* SERP Search Simulator */}
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: C.muted }}>
                  <Search size={15} />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Google SERP Snippet Preview</span>
                </div>
                <div style={{ background: '#ffffff', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'Arial, sans-serif' }}>
                  <div style={{ fontSize: 14, color: '#202124', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
                  <div style={{ fontSize: 19, color: '#1a0dab', marginBottom: 4, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {auditData.serp.title || 'Placeholder Title'}
                  </div>
                  <div style={{ fontSize: 13, color: '#4d5156', lineHeight: '20px', wordBreak: 'break-word' }}>
                    {auditData.serp.description ? (auditData.serp.description.length > 155 ? auditData.serp.description.substring(0, 152) + '...' : auditData.serp.description) : 'Please add a meta description tag to showcase your snippet description.'}
                  </div>
                </div>
              </div>

              {/* Extra parsed statistics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Link metrics */}
                <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: C.muted }}>
                    <LinkIcon size={15} />
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Page Link Profile</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: C.muted }}>Internal Hrefs</span><span style={{ color: '#fff', fontWeight: 700 }}>{auditData.linksCount.internal}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: C.muted }}>External Links</span><span style={{ color: '#fff', fontWeight: 700 }}>{auditData.linksCount.external}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: C.muted }}>Broken Internal</span><span style={{ color: auditData.linksCount.broken > 0 ? C.red : C.green, fontWeight: 700 }}>{auditData.linksCount.broken}</span></div>
                  </div>
                </div>

                {/* Cloud & Keywords types */}
                <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: C.muted }}>
                    <Type size={15} />
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Top Keyword Cloud</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {auditData.wordCloud.map((w, idx) => (
                      <span key={idx} style={{ color: '#93c5fd', background: 'rgba(59, 130, 246, 0.1)', padding: '3px 8px', borderRadius: 12, fontSize: '12px' }}>
                        {w.word} ({w.count})
                      </span>
                    ))}
                    {auditData.wordCloud.length === 0 && <span style={{ color: C.muted, fontSize: 12 }}>No terms identified.</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter controls & tabs */}
            <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 40 }}>
              
              {/* Tab Navigation header */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: '#0f141c' }}>
                {[
                  { id: 'onPage', label: 'On-Page SEO', count: auditData.onPage.checks.filter(c => c.status === 'failed').length },
                  { id: 'technical', label: 'Technical SEO', count: auditData.technical.checks.filter(c => c.status === 'failed').length },
                  { id: 'local', label: 'Local SEO', count: auditData.local.checks.filter(c => c.status === 'failed').length },
                  { id: 'offPage', label: 'Off-Page SEO', count: 0 }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTab(t.id); setFilterStatus('all'); }}
                    style={{ flex: 1, padding: '16px 8px', background: activeTab === t.id ? '#161b22' : 'transparent', color: activeTab === t.id ? '#fff' : C.muted, border: 'none', borderBottom: activeTab === t.id ? `3px solid ${C.blue}` : '3px solid transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {t.label}
                    {t.count > 0 && <span style={{ background: C.red, color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 8, fontWeight: 800 }}>{t.count}</span>}
                  </button>
                ))}
              </div>

              {/* Tab Content body */}
              <div style={{ padding: '24px' }}>
                
                {/* Standard checks (On-Page, Technical, Local) */}
                {activeTab !== 'offPage' && (
                  <div>
                    {/* Filters bar */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                      {[
                        { id: 'all', label: 'All Checks' },
                        { id: 'passed', label: 'Passed ✅' },
                        { id: 'warning', label: 'Warnings ⚠️' },
                        { id: 'failed', label: 'Failed ❌' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setFilterStatus(f.id)}
                          style={{ padding: '6px 12px', border: filterStatus === f.id ? `1px solid ${C.blue}` : `1px solid ${C.border}`, background: filterStatus === f.id ? 'rgba(37, 99, 235, 0.15)' : 'transparent', color: filterStatus === f.id ? '#fff' : C.muted, borderRadius: 16, fontSize: 12, fontWeight: 600 }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Cards grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {filteredCards.map((c, idx) => (
                        <div key={idx} style={{ background: '#0d1117', borderRadius: 8, border: `1px solid ${C.border}`, padding: '16px', display: 'flex', gap: 14, position: 'relative' }}>
                          <div style={{ fontSize: 20, marginTop: 2 }}>
                            {c.status === 'passed' && '✅'}
                            {c.status === 'warning' && '⚠️'}
                            {c.status === 'failed' && '❌'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.name}</span>
                              <span style={{ fontSize: 11, background: '#1c2128', padding: '2px 8px', borderRadius: 10, border: `1px solid ${C.border}`, color: C.muted }}>{c.points} / {c.maxPoints} pts</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: c.priority === 'high' ? C.red : (c.priority === 'medium' ? C.orange : C.blue), textTransform: 'uppercase' }}>{c.priority} Priority</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#c9d1d9', marginTop: 8, lineHeight: 1.5 }}>
                              <strong>Found:</strong> {c.value}
                            </div>
                            {c.status !== 'passed' && (
                              <div style={{ fontSize: 12, color: C.muted, marginTop: 6, borderTop: `1px dashed ${C.border}`, paddingTop: 6 }}>
                                <strong style={{ color: C.orange }}>Recommendation:</strong> {c.recommendation}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {filteredCards.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: C.muted }}>No audit points found matching the selected filters.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Off-page Info and Checklist */}
                {activeTab === 'offPage' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
                      
                      {/* Do-follow and No-follow summary */}
                      <div style={{ background: '#0d1117', border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px' }}>
                        <h4 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>Follow vs No-Follow Profile</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>Do-Follow Internal</span><span>{auditData.linksCount.doFollowInt}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>Do-Follow External</span><span>{auditData.linksCount.doFollowExt}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>No-Follow Links</span><span>{auditData.linksCount.noFollow}</span></div>
                        </div>
                      </div>

                      {/* Tool shortcuts */}
                      <div style={{ background: '#0d1117', border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px' }}>
                        <h4 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>SEO Tool Audits</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <a href={`https://moz.com/domain-analysis?site=${url}`} target="_blank" rel="noopener noreferrer" style={{ background: C.blue, color: '#fff', textAlign: 'center', padding: '6px', borderRadius: 4, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>Check DA on Moz</a>
                          <a href={`https://ahrefs.com/backlink-checker/?target=${url}`} target="_blank" rel="noopener noreferrer" style={{ background: C.border, color: '#fff', textAlign: 'center', padding: '6px', borderRadius: 4, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>Backlinks on Ahrefs</a>
                        </div>
                      </div>
                    </div>

                    {/* interactive checklists */}
                    <div style={{ background: '#0d1117', border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px', marginBottom: 24 }}>
                      <h4 style={{ fontSize: 14, color: '#fff', marginBottom: 14 }}>Backlink Submission Checklist</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                        {[
                          'Bookmark Submission', 'Classified Submission', 'Directory Submission', 
                          'Article Submission (Medium, LinkedIn)', 'Forum Submission', 
                          'Image Submission (Pinterest)', 'PPT Submission', 'Business Listing', 
                          'Product Listing', 'Guest Blogging'
                        ].map((item) => (
                          <div key={item} onClick={() => toggleOffPageItem(item)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#c9d1d9' }}>
                            {offPageCheck[item] ? <CheckSquare size={16} color={C.green} /> : <Square size={16} color={C.muted} />}
                            <span style={{ textDecoration: offPageCheck[item] ? 'line-through' : 'none', color: offPageCheck[item] ? C.muted : '#fff' }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Schema Snippet Recommendation */}
                    {(!hasLocalBusinessSchema) && (
                      <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: `1px solid ${C.blue}`, borderRadius: 8, padding: '20px' }}>
                        <h4 style={{ fontSize: 14, color: '#fff', marginBottom: 8 }}>Recommended Local Business Schema</h4>
                        <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Copy and insert this JSON-LD script inside the HTML of the website to optimize local discovery.</p>
                        <pre style={{ background: '#070a13', border: `1px solid ${C.border}`, padding: '12px', borderRadius: 6, fontSize: 11, color: '#a5d6ff', overflowX: 'auto' }}>
{`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "${businessName || 'Your Business Name'}",
  "url": "${url}",
  "telephone": "${foundPhone || 'Phone Number'}",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "${city || 'City'}"
  }
}
</script>`}
                        </pre>
                      </div>
                    )}

                  </div>
                )}

              </div>
            </div>
          </div>
        )}

      </div>

      {/* PRINT-ONLY REPORT TEMPLATE */}
      {auditData && (
        <div className="print-only" style={{ display: 'none' }} ref={pdfContainerRef}>
          <div style={{ padding: '40px', color: '#000', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', borderBottom: '2px solid #000', paddingBottom: '10px' }}>SEO Audit Report</h1>
            <p><strong>Website URL:</strong> {url}</p>
            <p><strong>Target Keyword:</strong> {keyword}</p>
            <p><strong>Business Name:</strong> {businessName || 'N/A'}</p>
            <p><strong>Location:</strong> {city || 'N/A'}</p>
            <p><strong>Report Date:</strong> {new Date().toLocaleDateString()}</p>
            
            <h2 style={{ fontSize: '22px', marginTop: '30px' }}>Summary Scores</h2>
            <ul style={{ fontSize: '16px', lineHeight: '1.6' }}>
              <li><strong>Overall SEO Score:</strong> {auditData.overallScore}%</li>
              <li><strong>On-Page SEO Score:</strong> {auditData.onPage.score}/100</li>
              <li><strong>Technical SEO Score:</strong> {auditData.technical.score}/100</li>
              <li><strong>Off-Page Checklist Completion:</strong> {auditData.offPage.score}%</li>
              <li><strong>Local SEO Score:</strong> {auditData.local.score}/100</li>
            </ul>

            <h2 style={{ fontSize: '22px', marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>On-Page SEO Checks</h2>
            {auditData.onPage.checks.map((c, i) => (
              <div key={i} style={{ marginBottom: '14px', pageBreakInside: 'avoid' }}>
                <p><strong>[{c.status.toUpperCase()}] {c.name} ({c.points}/{c.maxPoints} pts)</strong></p>
                <p style={{ margin: '4px 0', color: '#333' }}>Found: {c.value}</p>
                {c.status !== 'passed' && <p style={{ margin: '4px 0', color: '#666' }}>Fix: {c.recommendation}</p>}
              </div>
            ))}

            <h2 style={{ fontSize: '22px', marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Technical SEO Checks</h2>
            {auditData.technical.checks.map((c, i) => (
              <div key={i} style={{ marginBottom: '14px', pageBreakInside: 'avoid' }}>
                <p><strong>[{c.status.toUpperCase()}] {c.name} ({c.points}/{c.maxPoints} pts)</strong></p>
                <p style={{ margin: '4px 0', color: '#333' }}>Found: {c.value}</p>
                {c.status !== 'passed' && <p style={{ margin: '4px 0', color: '#666' }}>Fix: {c.recommendation}</p>}
              </div>
            ))}

            <h2 style={{ fontSize: '22px', marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Local SEO Checks</h2>
            {auditData.local.checks.map((c, i) => (
              <div key={i} style={{ marginBottom: '14px', pageBreakInside: 'avoid' }}>
                <p><strong>[{c.status.toUpperCase()}] {c.name} ({c.points}/{c.maxPoints} pts)</strong></p>
                <p style={{ margin: '4px 0', color: '#333' }}>Found: {c.value}</p>
                {c.status !== 'passed' && <p style={{ margin: '4px 0', color: '#666' }}>Fix: {c.recommendation}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Styled css variables & layout rules */}
      <style>{`
        .spin {
          animation: spin-anim 1.2s linear infinite;
        }
        @keyframes spin-anim {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media print {
          .screen-only {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Copy Summary Modal */}
      {showCopyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: C.surface, padding: 30, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: 'center', maxWidth: 400, width: '90%', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} color={C.green} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Success!</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>Audit summary successfully copied to clipboard!</p>
            <button 
              onClick={() => setShowCopyModal(false)}
              style={{ background: C.blue, color: '#fff', border: 'none', padding: '10px 32px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
