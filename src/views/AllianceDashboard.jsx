import React from 'react';
import './AllianceDashboard.css';
export const AllianceDashboard = () => {
  return (
    <div className="alliance-dashboard" style={{ height: '100%', overflowY: 'auto', paddingTop: '16px' }}>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-val">110</div>
          <div className="stat-lbl">Total Leads</div>
          <div className="stat-change up">↑ 25 this week</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-val">23</div>
          <div className="stat-lbl">Replies Received</div>
          <div className="stat-change up">↑ 21% reply rate</div>
        </div>
        <div className="stat-card hot">
          <div className="stat-val">7</div>
          <div className="stat-lbl">High Potential Leads</div>
          <div className="stat-change up">↑ 4 new today</div>
        </div>
        <div className="stat-card green">
          <div className="stat-val">6</div>
          <div className="stat-lbl">Meetings Booked</div>
          <div className="stat-change up">↑ 3 this week</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-val">2</div>
          <div className="stat-lbl">MoUs Signed</div>
          <div className="stat-change up">Target: 5 / month</div>
        </div>
      </div>

      <div className="grid-2-1" style={{ marginBottom: '16px' }}>
        <div className="card">
          <div className="card-title">Leads — Action Required</div>
          <div className="hot-lead">
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--hot)', flexShrink: 0 }}>S</div>
            <div className="hot-info">
              <div className="hot-name">Sri Venkateswara Engg College · Villupuram</div>
              <div className="hot-hook">4,200 students, CSE dominant. Only 12% placed in tech roles — direct BM Academy Full Stack match.</div>
            </div>
            <div className="hot-action">
              <button className="btn btn-primary btn-sm">Call</button>
              <button className="btn btn-secondary btn-sm">View</button>
            </div>
          </div>
          <div className="hot-lead">
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,154,163,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--teal2)', flexShrink: 0 }}>D</div>
            <div className="hot-info">
              <div className="hot-name">Digital Spark Agency · Pondicherry</div>
              <div className="hot-hook">Growing DM agency, 12 team members. Actively hiring DM executives. Free Tier → Growth Tier opportunity.</div>
            </div>
            <div className="hot-action">
              <button className="btn btn-primary btn-sm">Call</button>
              <button className="btn btn-secondary btn-sm">View</button>
            </div>
          </div>
          <div className="hot-lead">
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(228,165,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>B</div>
            <div className="hot-info">
              <div className="hot-name">Bright Smile Dental · Anna Nagar, Pondicherry</div>
              <div className="hot-hook">Only 18 GMB reviews. No website. Last GMB post: 6 weeks ago. Missing 20+ patient enquiries/month.</div>
            </div>
            <div className="hot-action">
              <button className="btn btn-primary btn-sm">Call</button>
              <button className="btn btn-secondary btn-sm">View</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Pipeline Summary</div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>New</span><span style={{ fontWeight: 600 }}>58</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: '53%' }}></div></div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Contacted</span><span style={{ fontWeight: 600 }}>34</span>
            </div>
            <div className="progress-track"><div className="progress-fill teal" style={{ width: '31%' }}></div></div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Replied</span><span style={{ fontWeight: 600 }}>23</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: '21%', background: 'var(--hot)' }}></div></div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Meeting</span><span style={{ fontWeight: 600 }}>6</span>
            </div>
            <div className="progress-track"><div className="progress-fill green" style={{ width: '6%' }}></div></div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>MoU Signed</span><span style={{ fontWeight: 600, color: '#4CAF50' }}>2</span>
            </div>
            <div className="progress-track"><div className="progress-fill green" style={{ width: '2%' }}></div></div>
          </div>
          <div className="divider"></div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>AI Analysis Complete</div>
          <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: "'Syne', sans-serif", color: 'var(--teal2)', marginTop: '4px' }}>87 / 110</div>
        </div>
      </div>

      <div className="grid-3">
        <div className="card" style={{ gridColumn: '1/3' }}>
          <div className="card-title">Recent Activity</div>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="timeline-label">Sri Venkateswara College replied via WhatsApp</div>
                <div className="timeline-text">PO Rajan: "Can you visit campus next week?"</div>
                <div className="timeline-time">2 hours ago</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot teal"></div>
              <div className="timeline-content">
                <div className="timeline-label">AI Analysis completed — 15 new leads analyzed</div>
                <div className="timeline-text">15 leads successfully processed</div>
                <div className="timeline-time">4 hours ago</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="timeline-label">Bright Smile Dental replied via WhatsApp</div>
                <div className="timeline-text">Dr. Ramesh: "Please share more details"</div>
                <div className="timeline-time">5 hours ago</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot grey"></div>
              <div className="timeline-content">
                <div className="timeline-label">WA M2 auto-fired — 18 colleges</div>
                <div className="timeline-text">Follow-up sequence sent automatically via n8n</div>
                <div className="timeline-time">Yesterday 10:00 AM</div>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Campaign Status</div>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>CT Colleges</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: "'Syne', sans-serif", color: 'var(--gold)' }}>50</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>contacted · 12 replied</div>
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>CT Companies</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: "'Syne', sans-serif", color: 'var(--teal2)' }}>30</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>contacted · 8 replied</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>TechX Clinics</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: "'Syne', sans-serif", color: 'var(--hot)' }}>30</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>audited · 3 replied</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
