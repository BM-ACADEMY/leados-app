import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import './alliance.css';

const COLUMNS = ['name', 'business_name', 'email', 'phone', 'audience', 'industry', 'location', 'source', 'channel_pref'];

export const UploadLeads = () => {
  const [audience, setAudience] = useState('college');
  const [campaign, setCampaign] = useState('');
  const [channel, setChannel] = useState('auto');
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Only CSV or XLSX files are supported.');
      return;
    }
    setFileName(file.name);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', audience);
      formData.append('campaign', campaign);
      formData.append('channel', channel);
      const res = await api.uploadAllianceCSV(formData);
      toast.success(res.message || `Uploaded ${res.imported || 0} prospects — sequence starting`);
    } catch (err) {
      toast.error(err.message || 'Failed to upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="al-wrap">
      <div className="al-eyebrow">AllianceOS · Screen 1</div>
      <div className="al-page-title">Upload your list</div>
      <p className="al-page-desc">
        Drop a CSV of businesses, colleges, or companies — with their emails and phone numbers — and AllianceOS takes over from here.
      </p>

      {/* Dropzone */}
      <div
        className="al-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto' }}
      >
        <div className="al-drop-ic">📄</div>
        <h3>{uploading ? 'Uploading…' : fileName ? fileName : 'Drop your CSV here'}</h3>
        <p>{fileName ? 'File ready — or click to replace' : 'or choose a file — max 5,000 rows per upload'}</p>
        <button className="al-btn" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          {uploading ? 'Uploading…' : 'Choose CSV file'}
        </button>
        <div className="al-fmt">
          {COLUMNS.map(c => <code key={c}>{c}</code>)}
        </div>
        <input
          type="file"
          accept=".csv,.xlsx"
          ref={fileInputRef}
          onChange={(e) => processFile(e.target.files?.[0])}
          style={{ display: 'none' }}
        />
      </div>

      {/* Fields */}
      <div className="al-fields" style={{ marginTop: 20 }}>
        <div className="al-field">
          <label>Audience for this list</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="college">College principals / TPOs</option>
            <option value="hr">Company HR / corporates</option>
            <option value="smb">Local clinics / shops / SMBs</option>
            <option value="iv">IV trip coordinators</option>
          </select>
        </div>
        <div className="al-field">
          <label>Campaign</label>
          <input
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="e.g. Aug — TN Colleges"
          />
        </div>
        <div className="al-field">
          <label>Channel</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="auto">Auto (by audience)</option>
            <option value="email">Email only</option>
            <option value="whatsapp">WhatsApp only</option>
          </select>
        </div>
      </div>

      {/* Steps */}
      <div className="al-steps">
        <div className="al-step"><div className="n">01</div><p>We clean the rows and fix phone/email formats</p></div>
        <div className="al-step"><div className="n">02</div><p>Remove duplicates and anyone on the do-not-contact list</p></div>
        <div className="al-step"><div className="n">03</div><p>Pick email or WhatsApp per prospect automatically</p></div>
        <div className="al-step"><div className="n">04</div><p>Schedule the first message — the sequence begins</p></div>
      </div>

      <div className="al-note">
        ⚠️
        <div>
          <b>Cold outreach goes out by email.</b> WhatsApp is used only for contacts who opted in (QR code / click-to-WhatsApp / replied first).
          Cold sending never uses our main WhatsApp or @abmgroups.org.
        </div>
      </div>
    </div>
  );
};
