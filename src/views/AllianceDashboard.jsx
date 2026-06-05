import React from 'react';

export const AllianceDashboard = () => {
  return (
    <div className="alliance-mode" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="screen">
        <div className="section-header">
          <div>
            <h2 className="section-title">Overview</h2>
            <div className="section-subtitle">Real-time performance of ABM groups</div>
          </div>
          <div className="tabs" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
            <button className="tab active">This Week</button>
            <button className="tab">This Month</button>
            <button className="tab">All Time</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-lbl">New Leads</div>
            <div className="stat-val">342</div>
            <div className="stat-change up">↑ 12% vs last week</div>
          </div>
          <div className="stat-card teal">
            <div className="stat-lbl">Analysed</div>
            <div className="stat-val">280</div>
            <div className="stat-change up">↑ 5% vs last week</div>
          </div>
          <div className="stat-card hot">
            <div className="stat-lbl">Hot & Warm</div>
            <div className="stat-val">84</div>
            <div className="stat-change down">↓ 2% vs last week</div>
          </div>
          <div className="stat-card green">
            <div className="stat-lbl">Converted</div>
            <div className="stat-val">12</div>
            <div className="stat-change up">↑ 40% vs last week</div>
          </div>
        </div>

        <div className="grid-2-1">
          <div className="card">
            <div className="card-title">Recent Hot Leads</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Organisation</th>
                    <th>Score</th>
                    <th>Hook</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>SRM University</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Chennai • College</div>
                    </td>
                    <td><span className="badge badge-hot">92/100</span></td>
                    <td style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Focus on AI/ML curriculum gap</td>
                    <td><button className="btn btn-sm btn-primary">Outreach</button></td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>Zoho Corp</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Chennai • Company</div>
                    </td>
                    <td><span className="badge badge-hot">88/100</span></td>
                    <td style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Pitch MERN stack trained freshers</td>
                    <td><button className="btn btn-sm btn-primary">Outreach</button></td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>Apollo Hospitals</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Chennai • Clinic</div>
                    </td>
                    <td><span className="badge badge-warm">75/100</span></td>
                    <td style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Medical coding training need</td>
                    <td><button className="btn btn-sm btn-secondary">Review</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Pipeline Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <span>New</span>
                  <span style={{ fontWeight: 700 }}>62</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: '20%' }}></div></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <span>Analysed</span>
                  <span style={{ fontWeight: 700 }}>196</span>
                </div>
                <div className="progress-track"><div className="progress-fill teal" style={{ width: '60%' }}></div></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <span>Contacted</span>
                  <span style={{ fontWeight: 700 }}>45</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: '15%' }}></div></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <span>Converted</span>
                  <span style={{ fontWeight: 700 }}>12</span>
                </div>
                <div className="progress-track"><div className="progress-fill green" style={{ width: '5%' }}></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
