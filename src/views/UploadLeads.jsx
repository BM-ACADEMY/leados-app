import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';

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
    <div className="alliance-mode" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="screen">
        <div className="section-header">
          <div>
            <h2 className="section-title">Data Ingestion</h2>
            <div className="section-subtitle">Upload scraped targets for AI analysis</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-title">Upload Bulk Data</div>
            
            <div 
              className="upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ opacity: uploading ? 0.5 : 1, pointerEvents: uploading ? 'none' : 'auto' }}
            >
              <div className="upload-icon">📄</div>
              <div className="upload-title">{uploading ? 'Uploading...' : 'Drag & drop CSV file here'}</div>
              <div className="upload-sub">or click to browse from computer</div>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={(e) => handleFile(e.target.files?.[0])} 
                style={{ display: 'none' }} 
              />
            </div>

            <div className="divider"></div>

            <div className="form-group">
              <label className="form-label">Data Type</label>
              <select 
                className="form-select" 
                value={orgType} 
                onChange={(e) => setOrgType(e.target.value)}
              >
                <option value="college">Colleges / Universities</option>
                <option value="company">Corporate / Companies</option>
                <option value="clinic">Clinics / Hospitals</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Lead Source</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Apollo Scrape Q2" 
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Uploading...' : 'Upload Now'}
            </button>
          </div>

          <div className="card">
            <div className="card-title">Recent Uploads</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Rows</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>chennai_colleges_v1.csv</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Today, 10:42 AM</div>
                    </td>
                    <td>142</td>
                    <td><span className="badge badge-cool">College</span></td>
                    <td><span className="badge badge-done">Completed</span></td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>bengaluru_tech.csv</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Yesterday, 3:15 PM</div>
                    </td>
                    <td>38</td>
                    <td><span className="badge badge-warm">Company</span></td>
                    <td><span className="badge badge-done">Completed</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
