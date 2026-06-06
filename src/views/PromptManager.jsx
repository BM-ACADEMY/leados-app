import React, { useState } from 'react';
import './AllianceDashboard.css';

export const PromptManager = () => {
  const [activeTab, setActiveTab] = useState('Analyzer Prompts');

  return (
    <div className="alliance-dashboard" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div className="section-header">
        <div>
          <div className="section-title" style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: 'white' }}>Prompt Manager</div>
          <div className="section-subtitle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Edit AI prompts without touching code. Changes apply immediately.</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <div className={`tab ${activeTab === 'Analyzer Prompts' ? 'active' : ''}`} onClick={() => setActiveTab('Analyzer Prompts')}>Analyzer Prompts</div>
        <div className={`tab ${activeTab === 'Outreach Prompts' ? 'active' : ''}`} onClick={() => setActiveTab('Outreach Prompts')}>Outreach Prompts</div>
        <div className={`tab ${activeTab === 'Follow-up Prompts' ? 'active' : ''}`} onClick={() => setActiveTab('Follow-up Prompts')}>Follow-up Prompts</div>
      </div>

      <div className="grid-2-1">
        {/* Left Column: Prompt List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Prompt Card 1 */}
          <div className="card">
            <div style={{ fontFamily: "'DM Mono', monospace", color: 'var(--gold)', fontWeight: 500, marginBottom: 4 }}>college_analyzer</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>Scores a college and recommends ABM Groups offer</div>
            
            <div className="code-block" style={{ position: 'relative' }}>
              You are an AI analyst for ABM Groups — BM Academy, Core Talents, and BM TechX in Pondicherry, Tamil Nadu. Analyze the following college using the scraped website data and our offerings context below. Return ONLY valid JSON. No markdown.
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, var(--navy2))', borderRadius: '0 0 8px 8px' }}></div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ background: 'var(--gold)', color: 'var(--navy)' }}>Edit</button>
                <button className="btn btn-secondary">Test with Lead</button>
              </div>
              <span className="badge badge-done" style={{ background: 'rgba(76,175,80,0.1)' }}>Active</span>
            </div>
          </div>

          {/* Prompt Card 2 */}
          <div className="card">
            <div style={{ fontFamily: "'DM Mono', monospace", color: 'var(--gold)', fontWeight: 500, marginBottom: 4 }}>company_analyzer</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>Scores a company for Core Talents hiring partnership</div>
            
            <div className="code-block" style={{ position: 'relative' }}>
              You are an AI analyst for Core Talents — the talent placement division of ABM Groups, Pondicherry. Analyze the following company using website data and our talent offerings below. Return ONLY valid JSON. No markdown.
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, var(--navy2))', borderRadius: '0 0 8px 8px' }}></div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ background: 'var(--gold)', color: 'var(--navy)' }}>Edit</button>
                <button className="btn btn-secondary">Test with Lead</button>
              </div>
              <span className="badge badge-done" style={{ background: 'rgba(76,175,80,0.1)' }}>Active</span>
            </div>
          </div>

        </div>

        {/* Right Column: Testing Output */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="section-title" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>PROMPT TEST OUTPUT</div>
          
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            Select a prompt and click "Test with Lead" to see actual AI output
          </div>

          <div className="code-block" style={{ color: '#A0C4FF', flex: 1, minHeight: 200, whiteSpace: 'pre-wrap' }}>
{`{
  "score": 92,
  "offer_recommended": "Training + Employability MoU — Free Model",
  "reason": "4200 students, CSE dominant. Only 12% placed in tech roles.",
  "bm_course_match": "Full Stack Dev Tier 2 + AI Tools Mastery",
  "core_talents_offer": "Free MoU → Placement support from batch 1",
  "training_potential": "high",
  "placement_potential": "high",
  "personalisation_hook": "Their 2024 annual report shows only 12% CSE students placed in tech roles."
}`}
          </div>

          <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24 }}>
            <div className="section-title" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>PROMPT VARIABLES AVAILABLE</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
              <span style={{ color: 'var(--teal2)' }}>{`{{org_name}}`}</span> — Organisation name<br/>
              <span style={{ color: 'var(--teal2)' }}>{`{{district}}`}</span> — District / location<br/>
              <span style={{ color: 'var(--teal2)' }}>{`{{industry}}`}</span> — Industry (companies only)<br/>
              <span style={{ color: 'var(--teal2)' }}>{`{{website_text}}`}</span> — Scraped website content<br/>
              <span style={{ color: 'var(--teal2)' }}>{`{{kb_context}}`}</span> — Knowledge base docs (auto-injected)
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
