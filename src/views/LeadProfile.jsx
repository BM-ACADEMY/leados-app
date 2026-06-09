import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AllianceDashboard.css';

export const LeadProfile = () => {
  const navigate = useNavigate();

  return (
    <div className="alliance-dashboard" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back to Leads</button>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Sri Venkateswara Engineering College</div>
      </div>

      {/* PROFILE HEADER */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(228,165,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>S</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, marginBottom: 6, color: 'white' }}>Sri Venkateswara Engineering College</h2>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 12 }}>Engineering College · Villupuram District, Tamil Nadu · Contact: Mr. Rajan (PO) · 94XXXXXXXX</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-hot">🔥 HOT Lead</span>
            <span className="badge badge-cool">College</span>
            <span className="badge badge-done">Replied</span>
            <span className="badge" style={{ background: 'rgba(106,27,154,0.15)', color: '#ba68c8', border: '1px solid rgba(106,27,154,0.3)' }}>4,200 Students</span>
            <span className="badge" style={{ background: 'rgba(230,81,0,0.15)', color: 'var(--gold)', border: '1px solid rgba(230,81,0,0.3)' }}>CSE Dominant</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" style={{ justifyContent: 'center' }}>📞 Book Meeting</button>
          <button className="btn btn-secondary" style={{ background: 'rgba(0,123,131,0.2)', color: 'var(--teal2)', borderColor: 'rgba(0,123,131,0.4)', justifyContent: 'center' }}>📄 Send MoU</button>
        </div>
      </div>

      <div className="grid-2-1">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* AI ANALYSIS */}
          <div className="card">
            <div className="section-title" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>AI ANALYSIS</div>
            
            <div style={{ background: 'rgba(255,107,53,0.05)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ color: 'var(--hot)', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>RECOMMENDED OFFER</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Training & Employability MoU — Free Model First</div>
            </div>

            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 20 }}>
              4,200 students with CSE department dominant. Current placement rate only 12% in tech roles — direct gap for BM Academy Full Stack and AI Tools programs. Placement officer is proactive based on website content.
            </p>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>BM Course Match</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>Full Stack Dev Tier 2 + AI Tools Mastery</div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Personalisation Hook</div>
              <div style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.8)', borderLeft: '2px solid var(--teal)', paddingLeft: 10 }}>
                "Their 2024 annual report shows only 12% CSE students placed in tech roles — BM Academy Full Stack program directly addresses this gap."
              </div>
            </div>
          </div>

          {/* CONTACT DETAILS */}
          <div className="card">
            <div className="section-title" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>CONTACT DETAILS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              <div style={{ display: 'flex', gap: 10 }}><span style={{ color: 'var(--purple)' }}>👤</span> PO: Mr. Rajan Kumar</div>
              <div style={{ display: 'flex', gap: 10 }}><span style={{ color: 'var(--purple)' }}>📞</span> 94XXXXXXXX</div>
              <div style={{ display: 'flex', gap: 10 }}><span style={{ color: 'var(--purple)' }}>✉️</span> rajan@svec.edu.in</div>
              <div style={{ display: 'flex', gap: 10 }}><span style={{ color: 'var(--teal2)' }}>🌐</span> svec.edu.in</div>
              <div style={{ display: 'flex', gap: 10 }}><span style={{ color: 'var(--hot)' }}>📍</span> Villupuram District</div>
              <div style={{ display: 'flex', gap: 10 }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>🏛️</span> Principal: Dr. Suresh Babu</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TIMELINE */}
        <div className="card">
          <div className="section-title" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>ACTIVITY TIMELINE</div>
          
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot" style={{ borderColor: '#4CAF50' }}></div>
              <div className="timeline-content" style={{ border: '1px solid rgba(76,175,80,0.2)', background: 'rgba(76,175,80,0.05)' }}>
                <div className="timeline-label" style={{ color: '#4CAF50' }}>✅ WhatsApp Reply Received</div>
                <div className="timeline-text">"Can you visit campus next week? We have placement committee meeting on Friday."</div>
                <div className="timeline-time">Today 2:14 PM · Via WhatsApp</div>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot teal"></div>
              <div className="timeline-content">
                <div className="timeline-label">WhatsApp M2 Sent (Auto)</div>
                <div className="timeline-text">Follow-up message sent via n8n sequence</div>
                <div className="timeline-time">Yesterday 10:00 AM</div>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="timeline-label">AI Analysis Completed</div>
                <div className="timeline-text">Offer: Training + Employability MoU</div>
                <div className="timeline-time">2 days ago · OpenAI GPT-4o</div>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot grey"></div>
              <div className="timeline-content">
                <div className="timeline-label">WhatsApp M1 Sent (Auto)</div>
                <div className="timeline-text">Introduction message via n8n</div>
                <div className="timeline-time">3 days ago 10:05 AM</div>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot grey"></div>
              <div className="timeline-content">
                <div className="timeline-label">Lead Imported via CSV</div>
                <div className="timeline-text">CT_Colleges_Week1.csv · Row 12</div>
                <div className="timeline-time">4 days ago</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="section-title" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>ADD NOTE</div>
            <textarea 
              style={{ width: '100%', height: 80, background: 'var(--navy2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, color: 'white', fontFamily: 'inherit', fontSize: 12, resize: 'vertical' }} 
              placeholder="Add meeting notes, call summary, or follow-up reminders..."
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
};
