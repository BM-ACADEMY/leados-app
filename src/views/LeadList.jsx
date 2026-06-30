import React from 'react';
import './AllianceDashboard.css';

export const LeadList = () => {
  return (
    <div className="alliance-dashboard" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div className="section-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="section-title" style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: 'white' }}>Lead List</div>
          <div className="section-subtitle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>110 organisations · 87 analysed · 7 hot leads</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select className="form-select" style={{ width: 160, background: 'var(--navy3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12, outline: 'none' }}>
            <option>All Types</option>
            <option>College</option>
            <option>Company</option>
          </select>
          <select className="form-select" style={{ width: 160, background: 'var(--navy3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12, outline: 'none' }}>
            <option>All Scores</option>
            <option>{'> 85 (Hot)'}</option>
            <option>{'> 70 (Warm)'}</option>
          </select>
          <button className="btn btn-secondary">Export CSV</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Organisation</th>
              <th style={{ width: '10%' }}>Type</th>
              <th style={{ width: '12%' }}>District</th>
              <th style={{ width: '8%' }}>Score</th>
              <th style={{ width: '25%' }}>Offer</th>
              <th style={{ width: '10%' }}>Stage</th>
              <th style={{ width: '10%' }}>WA Status</th>
              <th style={{ width: '8%' }}>Replied</th>
              <th style={{ width: '12%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="org-name">Sri Venkateswara Engg College</div>
                <div className="org-sub">Mr. Rajan · 94XXXXXXXX</div>
              </td>
              <td><span className="badge badge-cool">College</span></td>
              <td>Villupuram</td>
              <td><span className="score-dot hot"></span> 92</td>
              <td>Training + Employability MoU</td>
              <td><span className="badge badge-hot">Replied</span></td>
              <td><span className="badge badge-done" style={{ fontSize: 9 }}>REPLIED</span></td>
              <td><span style={{ color: '#4CAF50' }}>✅ Yes</span></td>
              <td><button className="btn btn-sm btn-primary">View</button></td>
            </tr>
            <tr>
              <td>
                <div className="org-name">Bright Smile Dental</div>
                <div className="org-sub">Dr. Ramesh · 94XXXXXXXX</div>
              </td>
              <td><span className="badge badge-warm">Clinic</span></td>
              <td>Pondicherry</td>
              <td><span className="score-dot hot"></span> 87</td>
              <td>GMB + Instagram + Meta Ads</td>
              <td><span className="badge badge-hot">Replied</span></td>
              <td><span className="badge badge-done" style={{ fontSize: 9 }}>REPLIED</span></td>
              <td><span style={{ color: '#4CAF50' }}>✅ Yes</span></td>
              <td><button className="btn btn-sm btn-primary">View</button></td>
            </tr>
            <tr>
              <td>
                <div className="org-name">Digital Spark Agency</div>
                <div className="org-sub">Ms. Kavitha · 94XXXXXXXX</div>
              </td>
              <td><span className="badge badge-cool">Company</span></td>
              <td>Pondicherry</td>
              <td><span className="score-dot warm"></span> 88</td>
              <td>Growth Tier — DM + Full Stack</td>
              <td><span className="badge badge-warm">Contacted</span></td>
              <td><span className="badge badge-hot" style={{ fontSize: 9 }}>SENT_M2</span></td>
              <td><span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span></td>
              <td><button className="btn btn-sm btn-secondary">View</button></td>
            </tr>
            <tr>
              <td>
                <div className="org-name">Annamalai Arts & Science</div>
                <div className="org-sub">Mrs. Priya · 98XXXXXXXX</div>
              </td>
              <td><span className="badge badge-cool">College</span></td>
              <td>Cuddalore</td>
              <td><span className="score-dot green"></span> 74</td>
              <td>Free Workshop → MoU</td>
              <td><span className="badge badge-cool">Contacted</span></td>
              <td><span className="badge badge-hot" style={{ fontSize: 9 }}>SENT_M1</span></td>
              <td><span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span></td>
              <td><button className="btn btn-sm btn-secondary">View</button></td>
            </tr>
            <tr>
              <td>
                <div className="org-name">PhysioFit Centre</div>
                <div className="org-sub">Dr. Anand · 90XXXXXXXX</div>
              </td>
              <td><span className="badge badge-warm">Clinic</span></td>
              <td>Pondicherry</td>
              <td><span className="score-dot hot"></span> 91</td>
              <td>Full Digital Setup — No GMB</td>
              <td><span className="badge badge-cool" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>New</span></td>
              <td><span className="badge badge-cool" style={{ fontSize: 9, background: 'rgba(0,123,131,0.2)', color: 'var(--teal2)' }}>SEND</span></td>
              <td><span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span></td>
              <td><button className="btn btn-sm btn-secondary" style={{ background: 'var(--teal)', color: '#fff', border: 'none' }}>Send WA</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
