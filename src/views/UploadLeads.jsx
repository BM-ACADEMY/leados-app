import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';
import './AllianceDashboard.css';

export const UploadLeads = () => {
  const [orgType, setOrgType] = useState('college');
  const [source, setSource] = useState('CSV Upload');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Only CSV files are supported.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', orgType);
      formData.append('source', source);

      const res = await api.uploadAllianceCSV(formData);
      toast.success(res.message || 'Upload successful');
    } catch (err) {
      toast.error(err.message || 'Failed to upload CSV');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="alliance-dashboard" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="section-title" style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: 'white' }}>Upload Leads</div>
          <div className="section-subtitle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Upload CSV from Google Sheets. AI analysis runs automatically.</div>
        </div>
      </div>
      
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Upload CSV File</div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Campaign / Lead Type</label>
              <select 
                className="form-select" 
                value={orgType} 
                onChange={(e) => setOrgType(e.target.value)}
                style={{ width: '100%', background: 'var(--navy3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 14px', borderRadius: 8, fontSize: 13, outline: 'none' }}
              >
                <option value="college">College Outreach (CT_Colleges)</option>
                <option value="company">Company Outreach (CT_Companies)</option>
                <option value="clinic">Clinic Outreach (TechX_Clinics)</option>
              </select>
            </div>
            
            <div 
              className="upload-zone" 
              style={{ 
                marginBottom: 14, 
                border: '1px dashed rgba(255,255,255,0.2)', 
                borderRadius: 12, 
                padding: '40px 20px', 
                textAlign: 'center', 
                background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                opacity: uploading ? 0.5 : 1, 
                pointerEvents: uploading ? 'none' : 'auto'
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon" style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
              <div className="upload-title" style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                {uploading ? 'Uploading...' : 'Drop CSV here or click to browse'}
              </div>
              <div className="upload-sub" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Accepts .csv and .xlsx — max 500 rows per upload</div>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={(e) => handleFile(e.target.files?.[0])} 
                style={{ display: 'none' }} 
              />
            </div>
            
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Uploading...' : 'Upload & Analyse'}
              </button>
              <button className="btn btn-secondary">Download Template</button>
            </div>
          </div>
          
          <div className="card">
            <div className="card-title">Recent Uploads</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 0', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>File</th>
                  <th style={{ padding: '10px 0', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '10px 0', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Imported</th>
                  <th style={{ padding: '10px 0', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Analysed</th>
                  <th style={{ padding: '10px 0', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 0' }}>CT_Colleges_Week1.csv</td>
                  <td>College</td>
                  <td>50</td>
                  <td>48</td>
                  <td><span className="badge badge-done" style={{ background: 'rgba(76,175,80,0.1)', color: '#4CAF50', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>Complete</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 0' }}>CT_Companies_Batch1.csv</td>
                  <td>Company</td>
                  <td>30</td>
                  <td>30</td>
                  <td><span className="badge badge-done" style={{ background: 'rgba(76,175,80,0.1)', color: '#4CAF50', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>Complete</span></td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 0' }}>TechX_Clinics_Pondicherry.csv</td>
                  <td>Clinic</td>
                  <td>30</td>
                  <td>22</td>
                  <td><span className="badge badge-warm" style={{ background: 'rgba(255,184,0,0.1)', color: 'var(--gold2)', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>In Progress</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">CSV Column Requirements</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>For College uploads, your CSV must have these columns:</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 0', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Column Name</th>
                  <th style={{ padding: '10px 0', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Required?</th>
                  <th style={{ padding: '10px 0', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Example</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--gold)' }}>College Name</code></td>
                  <td><span className="badge badge-hot" style={{ fontSize: 9, background: 'rgba(255,107,53,0.1)', color: 'var(--hot)', padding: '3px 6px', borderRadius: 4 }}>Required</span></td>
                  <td>SV Engineering College</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--gold)' }}>District</code></td>
                  <td><span className="badge badge-hot" style={{ fontSize: 9, background: 'rgba(255,107,53,0.1)', color: 'var(--hot)', padding: '3px 6px', borderRadius: 4 }}>Required</span></td>
                  <td>Villupuram</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--gold)' }}>Phone</code></td>
                  <td><span className="badge badge-hot" style={{ fontSize: 9, background: 'rgba(255,107,53,0.1)', color: 'var(--hot)', padding: '3px 6px', borderRadius: 4 }}>Required</span></td>
                  <td>94XXXXXXXX</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--gold)' }}>Email</code></td>
                  <td><span className="badge badge-cool" style={{ fontSize: 9, background: 'rgba(0,123,131,0.1)', color: 'var(--teal2)', padding: '3px 6px', borderRadius: 4 }}>Optional</span></td>
                  <td>po@college.edu</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--gold)' }}>Website</code></td>
                  <td><span className="badge badge-cool" style={{ fontSize: 9, background: 'rgba(0,123,131,0.1)', color: 'var(--teal2)', padding: '3px 6px', borderRadius: 4 }}>Optional</span></td>
                  <td>svec.edu.in</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--gold)' }}>Placement Officer</code></td>
                  <td><span className="badge badge-cool" style={{ fontSize: 9, background: 'rgba(0,123,131,0.1)', color: 'var(--teal2)', padding: '3px 6px', borderRadius: 4 }}>Optional</span></td>
                  <td>Mr. Rajan Kumar</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="card">
            <div className="card-title">After Upload — What Happens</div>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-label">Rows inserted into database</div>
                  <div className="timeline-text">Duplicates automatically skipped</div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot teal"></div>
                <div className="timeline-content">
                  <div className="timeline-label">Website scraping starts (background)</div>
                  <div className="timeline-text">Each org's website text extracted</div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-label">OpenAI analysis with KB context</div>
                  <div className="timeline-text">Score + personalised hook generated</div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot grey"></div>
                <div className="timeline-content">
                  <div className="timeline-label">Telegram alert for 85+ scores</div>
                  <div className="timeline-text">Kamar notified immediately for hot leads</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
