import React, { useState, useRef } from 'react';
import { C } from '../../constants/theme.js';
import { Loader2, Play, CheckCircle2, XCircle, AlertTriangle, Globe, ChevronDown, ChevronRight, Activity, BrainCircuit, Link, Type, Search, Download } from 'lucide-react';
import { api } from '../../services/api.js';
import html2pdf from 'html2pdf.js';
import SeoReportTemplate from '../../components/pdf/SeoReportTemplate.jsx';

export default function OnPageAudit() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('onPage'); // onPage, technical, social, ai
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const reportRef = useRef();

  const handleRunCheck = async () => {
    if (!url) {
      setError('Please enter a valid URL');
      return;
    }
    setError('');
    setLoading(true);
    setAuditData(null);

    try {
      const res = await api.post('/thedal/seo-audit', { url });
      setAuditData(res);
      setActiveTab('onPage');
    } catch (err) {
      console.error('Audit failed', err);
      setError(err.message || 'Failed to analyze website. Ensure the URL is accessible.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!reportRef.current || !auditData) return;
    setDownloadingPdf(true);
    
    const opt = {
      margin:       0,
      filename:     `SEO_Report_${auditData.url.replace(/https?:\/\//, '')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Temporarily make the hidden element visible for capturing
    const element = reportRef.current;
    element.style.display = 'block';

    html2pdf().set(opt).from(element).save().then(() => {
      element.style.display = 'none';
      setDownloadingPdf(false);
    }).catch(err => {
      console.error('PDF Generation Failed', err);
      element.style.display = 'none';
      setDownloadingPdf(false);
      alert('Failed to generate PDF report.');
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'; // Green
    if (score >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const renderProgressBar = (label, score) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: getScoreColor(score) }}>{score}%</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: getScoreColor(score), borderRadius: 4, transition: 'width 1s ease-in-out' }} />
      </div>
    </div>
  );

  const renderCheckList = (categoryData) => {
    if (!categoryData) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {categoryData.failed.map((check, idx) => (
          <div key={`failed-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, borderLeft: '3px solid #ef4444' }}>
            <XCircle size={18} color="#ef4444" style={{ marginTop: 2 }} />
            <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.5 }}>{check}</div>
          </div>
        ))}
        {categoryData.passed.map((check, idx) => (
          <div key={`passed-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, background: 'rgba(34, 197, 94, 0.05)', borderRadius: 8, borderLeft: '3px solid #22c55e' }}>
            <CheckCircle2 size={18} color="#22c55e" style={{ marginTop: 2 }} />
            <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.5 }}>{check}</div>
          </div>
        ))}
        {categoryData.failed.length === 0 && categoryData.passed.length === 0 && (
          <div style={{ padding: 16, color: C.muted, fontStyle: 'italic' }}>No data available.</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 40, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${getScoreColor(auditData ? auditData.overallScore : 100)}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={32} color={getScoreColor(auditData ? auditData.overallScore : 100)} />
        </div>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif" }}>Advanced SEO Dashboard</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Deep Technical Analysis & AI Content Auditing</p>
        </div>
      </div>

      {/* Input Section */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 30, marginBottom: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ width: '120px', fontSize: 14, fontWeight: 600, color: C.muted }}>Enter URL:</div>
          <div style={{ display: 'flex', flex: 1, height: 46, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{ background: '#3b82f6', width: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={20} color="#fff" />
            </div>
            <input 
              type="text" 
              placeholder="https://www.yourdomain.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ flex: 1, background: '#060c17', border: 'none', padding: '0 16px', color: '#fff', fontSize: 15, outline: 'none' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunCheck();
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 136 }}>
          <button 
            onClick={handleRunCheck}
            disabled={loading}
            style={{ background: '#3b82f6', border: 'none', padding: '10px 24px', borderRadius: 30, color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <Play size={14} fill="currentColor" />} 
            {loading ? 'Running Deep Analysis...' : 'Perform Audit'}
          </button>
          
          {auditData && !loading && (
            <button 
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, padding: '10px 24px', borderRadius: 30, color: '#e2e8f0', fontSize: 14, fontWeight: 600, cursor: downloadingPdf ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {downloadingPdf ? <Loader2 size={16} className="spin" /> : <Download size={14} />} 
              {downloadingPdf ? 'Generating PDF...' : 'Download Report'}
            </button>
          )}

          {error && <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 500 }}>{error}</span>}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
          <Search size={48} color="#3b82f6" className="spin" style={{ marginBottom: 24 }} />
          <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 8 }}>Auditing Website...</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>Extracting links, keywords, and analyzing HTML structure.</p>
        </div>
      )}

      {auditData && !loading && (
        <>
          {/* Top Overview Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
            {/* Overall Score Box */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: `12px solid ${getScoreColor(auditData.overallScore)}` }}>
                <div style={{ fontSize: 56, fontWeight: 800, color: getScoreColor(auditData.overallScore) }}>
                  {auditData.overallScore}
                </div>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 24, marginBottom: 8 }}>Site Health Score</h2>
            </div>

            {/* Sub-Scores Box */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 24px 0' }}>Performance Metrics</h3>
              {renderProgressBar('On-Page SEO', auditData.categories.onPage.score)}
              {renderProgressBar('Technical SEO', auditData.categories.technical.score)}
              {renderProgressBar('Gemini AI Content', auditData.aiContent.score)}
              {renderProgressBar('Social Tags', auditData.categories.social.score)}
            </div>
          </div>

          {/* Grid Layout for Previews & Analytics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 40 }}>
            
            {/* Google SERP Preview */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: C.muted }}>
                <Search size={16} />
                <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase' }}>Google Search Preview</span>
              </div>
              <div style={{ background: '#ffffff', padding: 20, borderRadius: 8, fontFamily: 'Arial, sans-serif' }}>
                <div style={{ fontSize: 14, color: '#202124', marginBottom: 4 }}>{auditData.url}</div>
                <div style={{ fontSize: 20, color: '#1a0dab', marginBottom: 4, fontWeight: 400, textDecoration: 'none' }}>
                  {auditData.serp.title}
                </div>
                <div style={{ fontSize: 14, color: '#4d5156', lineHeight: 1.58 }}>
                  {auditData.serp.description.length > 160 ? auditData.serp.description.substring(0, 157) + '...' : auditData.serp.description}
                </div>
              </div>
            </div>

            {/* Analytics Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Links Box */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: C.muted }}>
                  <Link size={16} />
                  <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase' }}>Link Analysis</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ color: '#e2e8f0', fontSize: 15 }}>Internal Links</span>
                  <span style={{ color: '#3b82f6', fontWeight: 700 }}>{auditData.links.internal}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ color: '#e2e8f0', fontSize: 15 }}>External Links</span>
                  <span style={{ color: '#3b82f6', fontWeight: 700 }}>{auditData.links.external}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#e2e8f0', fontSize: 15 }}>Broken Links</span>
                  <span style={{ color: auditData.links.broken > 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{auditData.links.broken}</span>
                </div>
              </div>

              {/* Keywords Box */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: C.muted }}>
                  <Type size={16} />
                  <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase' }}>Top Keywords</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {auditData.keywords.map((kw, idx) => (
                    <div key={idx} style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '4px 10px', borderRadius: 20, fontSize: 12, color: '#93c5fd' }}>
                      {kw.word} ({kw.count})
                    </div>
                  ))}
                  {auditData.keywords.length === 0 && <span style={{ color: C.muted, fontSize: 13 }}>No significant text found.</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed Detail Section */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
              {[
                { id: 'onPage', label: 'On-Page SEO', errors: auditData.categories.onPage.failed.length },
                { id: 'technical', label: 'Technical SEO', errors: auditData.categories.technical.failed.length },
                { id: 'social', label: 'Social & Tags', errors: auditData.categories.social.failed.length },
                { id: 'ai', label: 'AI Insights', icon: <BrainCircuit size={16}/> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1, padding: '16px 0', background: activeTab === tab.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                    border: 'none', borderBottom: activeTab === tab.id ? `3px solid #3b82f6` : '3px solid transparent',
                    color: activeTab === tab.id ? '#fff' : C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  {tab.icon} {tab.label}
                  {tab.errors > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                      {tab.errors}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ padding: 24 }}>
              {activeTab === 'onPage' && renderCheckList(auditData.categories.onPage)}
              {activeTab === 'technical' && renderCheckList(auditData.categories.technical)}
              {activeTab === 'social' && renderCheckList(auditData.categories.social)}
              
              {activeTab === 'ai' && (
                <div style={{ background: 'rgba(139, 92, 246, 0.05)', borderRadius: 8, padding: 24, borderLeft: '3px solid #8b5cf6' }}>
                  <h3 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BrainCircuit size={20} color="#8b5cf6" />
                    Gemini Content Analysis
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#e2e8f0', fontSize: 15, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {auditData.aiContent.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {/* Hidden PDF Template Container */}
          <div style={{ overflow: 'hidden', height: 0, width: 0, position: 'absolute', top: -9999, left: -9999 }}>
            <div ref={reportRef} style={{ display: 'none', width: '800px', backgroundColor: '#fff' }}>
              <SeoReportTemplate data={auditData} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
