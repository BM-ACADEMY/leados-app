import React, { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';
import './AllianceDashboard.css';

export const UploadLeads = () => {
  const [orgType, setOrgType] = useState('');
  const [source, setSource] = useState('CSV Upload');
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [insertedCount, setInsertedCount] = useState(0);
  const [insertedIds, setInsertedIds] = useState([]);
  
  // Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const res = await api.getPrompts();
        if (res.success && res.prompts) {
          const activePrompts = res.prompts.filter(p => p.active);
          setPrompts(activePrompts);
          if (activePrompts.length > 0) {
            setOrgType(activePrompts[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch prompts in upload view:', err);
      }
    };
    fetchPrompts();
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const selectFile = (file) => {
    if (!file) return;
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Only CSV files are supported.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select or drop a CSV file first.');
      return;
    }

    if (!orgType) {
      toast.error('Please select a Campaign / Lead Type prompt.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', orgType);
      formData.append('source', source);

      const res = await api.uploadAllianceCSV(formData);
      toast.success('File uploaded successfully!');
      setInsertedCount(res.inserted || 0);
      setInsertedIds(res.insertedIds || []);
      setIsUploaded(true);
    } catch (err) {
      toast.error(err.message || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (insertedIds.length === 0) {
      toast.error('No new leads found to analyze.');
      return;
    }

    setAnalyzing(true);
    try {
      await api.analyzeBatch(insertedIds);
      toast.success('AI Analysis & Outreach sequence started in background!');
      // Reset UI state
      setSelectedFile(null);
      setIsUploaded(false);
      setInsertedIds([]);
      setInsertedCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error('Failed to start analysis: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setIsUploaded(false);
    setInsertedIds([]);
    setInsertedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            <div className="card-title">
              {isUploaded ? 'Step 2: AI Lead Analysis' : 'Step 1: Upload CSV File'}
            </div>
            
            {!isUploaded && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Campaign / Lead Type</label>
                <select 
                  className="form-select" 
                  value={orgType} 
                  onChange={(e) => setOrgType(e.target.value)}
                  style={{ width: '100%', background: 'var(--navy3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 14px', borderRadius: 8, fontSize: 13, outline: 'none' }}
                >
                  {prompts.length === 0 ? (
                    <option value="">No analyzer prompts available</option>
                  ) : (
                    prompts.map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
            
            {/* Step 1 Content: Show File Selector */}
            {!isUploaded ? (
              <>
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
                    {uploading ? 'Uploading...' : selectedFile ? `Selected: ${selectedFile.name}` : 'Drop CSV here or click to browse'}
                  </div>
                  <div className="upload-sub" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Accepts .csv and .xlsx — max 500 rows per upload'}
                  </div>
                  <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    onChange={(e) => selectFile(e.target.files?.[0])} 
                    style={{ display: 'none' }} 
                  />
                </div>
                
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 2, justifyContent: 'center', background: 'var(--gold)', color: 'var(--navy)' }}
                    disabled={uploading || !selectedFile}
                    onClick={handleUpload}
                  >
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => setSelectedFile(null)} 
                    disabled={!selectedFile || uploading}
                  >
                    Clear File
                  </button>
                </div>
              </>
            ) : (
              /* Step 2 Content: Show AI Analysis trigger */
              <>
                <div style={{ 
                  padding: '30px 20px', 
                  textAlign: 'center', 
                  background: 'rgba(76,175,80,0.06)', 
                  border: '1px dashed rgba(76,175,80,0.3)', 
                  borderRadius: 12, 
                  marginBottom: 16 
                }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#4CAF50', marginBottom: 4 }}>Import Complete!</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                    <strong>{insertedCount}</strong> new lead records were successfully loaded.
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    Campaign Template: <code style={{ fontFamily: 'monospace', color: 'var(--gold)' }}>{orgType}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 2, justifyContent: 'center', background: 'var(--teal2)', color: 'white' }}
                    disabled={analyzing}
                    onClick={handleAnalyze}
                  >
                    {analyzing ? 'Running AI Analysis...' : 'Start AI Analysis & Outreach'}
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={handleCancelUpload} 
                    disabled={analyzing}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
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
                  <div className="timeline-text">Outreach introduction hook generated</div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot grey"></div>
                <div className="timeline-content">
                  <div className="timeline-label">WhatsApp Outreach Sent</div>
                  <div className="timeline-text">Personalized message sent to the lead</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
