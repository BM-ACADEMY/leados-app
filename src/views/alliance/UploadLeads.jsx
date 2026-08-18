import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import './alliance.css';

const COLUMNS = ['name', 'business_name', 'email', 'phone', 'audience', 'industry', 'location', 'source', 'channel_pref', 'consent', 'consent_source'];

const DEFAULT_AUDIENCES = [
  { code: 'college', label: 'College principals / TPOs', default_channel: 'email', fields: [] },
  { code: 'hr', label: 'Company HR / corporates', default_channel: 'email', fields: [] },
  { code: 'smb', label: 'Local clinics / shops / SMBs', default_channel: 'email', fields: [] },
  { code: 'iv', label: 'IV trip coordinators', default_channel: 'email', fields: [] },
];

export const UploadLeads = () => {
  const [audience, setAudience] = useState('college');
  const [campaign, setCampaign] = useState('');
  const [channel, setChannel] = useState('auto');
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [audiences, setAudiences] = useState(DEFAULT_AUDIENCES);
  const [showAudienceForm, setShowAudienceForm] = useState(false);
  const [editingAudienceCode, setEditingAudienceCode] = useState('');
  const [deletingAudience, setDeletingAudience] = useState(null);
  const [editingFieldKey, setEditingFieldKey] = useState('');
  const [newAudience, setNewAudience] = useState({ code: '', label: '', brand: '', default_channel: 'email', fields: [] });
  const [newField, setNewField] = useState({ field_key: '', data_type: 'auto', required: false, sample_value: '' });
  const [savingAudience, setSavingAudience] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [templatePreview, setTemplatePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const fileInputRef = useRef(null);

  const loadAudiences = async () => {
    try {
      const data = await api.getAllianceAudiences();
      if (data.audiences?.length) setAudiences(data.audiences);
    } catch (_) { /* Database readiness is displayed by upload when used. */ }
  };

  useEffect(() => { loadAudiences(); }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError('');
      try {
        const data = await api.getAllianceAudienceTemplatePreview(audience);
        if (!cancelled) setTemplatePreview(data);
      } catch (error) {
        if (!cancelled) {
          setTemplatePreview(null);
          setPreviewError(error.message || 'Failed to load template preview');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };
    loadPreview();
    return () => { cancelled = true; };
  }, [audience]);

  const downloadTemplate = async (event) => {
    event.stopPropagation();
    setDownloadingTemplate(true);
    try {
      const blob = await api.downloadAllianceAudienceTemplate(audience);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AllianceOS_${audience}_Lead_Template.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.message || 'Failed to download Excel template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const addAudience = async () => {
    setSavingAudience(true);
    try {
      const wasEditing = Boolean(editingAudienceCode);
      const data = wasEditing ? await api.updateAllianceAudience(editingAudienceCode, newAudience) : await api.createAllianceAudience(newAudience);
      await loadAudiences();
      setAudience(data.audience.code);
      setNewAudience({ code: '', label: '', brand: '', default_channel: 'email', fields: [] });
      setEditingAudienceCode('');
      setEditingFieldKey('');
      setShowAudienceForm(false);
      toast.success(wasEditing ? 'Audience and custom fields updated' : 'Audience and custom columns added');
    } catch (error) {
      toast.error(error.message || 'Failed to add audience');
    } finally {
      setSavingAudience(false);
    }
  };

  const addCustomField = () => {
    const fieldKey = newField.field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    if (!fieldKey) return toast.error('Enter a field name');
    if (!newField.sample_value.trim()) return toast.error('Enter a sample value for this field');
    if (newAudience.fields.some((field) => field.field_key === fieldKey && field.field_key !== editingFieldKey)) return toast.error('That field already exists');
    const nextField = { ...newField, field_key: fieldKey, label: fieldKey.replace(/_/g, ' ') };
    setNewAudience({
      ...newAudience,
      fields: editingFieldKey ? newAudience.fields.map((field) => field.field_key === editingFieldKey ? nextField : field) : [...newAudience.fields, nextField],
    });
    setNewField({ field_key: '', data_type: 'auto', required: false, sample_value: '' });
    setEditingFieldKey('');
  };

  const removeCustomField = (fieldKey) => {
    setNewAudience({ ...newAudience, fields: newAudience.fields.filter((field) => field.field_key !== fieldKey) });
    if (editingFieldKey === fieldKey) { setEditingFieldKey(''); setNewField({ field_key: '', data_type: 'auto', required: false, sample_value: '' }); }
  };

  const openAddAudience = () => {
    setEditingAudienceCode(''); setEditingFieldKey('');
    setNewAudience({ code: '', label: '', brand: '', default_channel: 'email', fields: [] });
    setNewField({ field_key: '', data_type: 'auto', required: false, sample_value: '' });
    setShowAudienceForm(true);
  };
  const openEditAudience = () => {
    if (!selectedAudience) return;
    setEditingAudienceCode(selectedAudience.code); setEditingFieldKey('');
    setNewAudience({ code: selectedAudience.code, label: selectedAudience.label, brand: selectedAudience.brand || '', default_channel: selectedAudience.default_channel, fields: (selectedAudience.fields || []).map((field) => ({ ...field })) });
    setNewField({ field_key: '', data_type: 'auto', required: false, sample_value: '' });
    setShowAudienceForm(true);
  };
  const editCustomField = (field) => {
    setEditingFieldKey(field.field_key);
    setNewField({ field_key: field.field_key, data_type: field.data_type, required: Boolean(field.required), sample_value: field.sample_value || '' });
  };
  const confirmDeleteAudience = async () => {
    if (!deletingAudience) return;
    setSavingAudience(true);
    try {
      const result = await api.deleteAllianceAudience(deletingAudience.code);
      toast.success(result.message);
      const remaining = audiences.filter((item) => item.code !== deletingAudience.code);
      setAudiences(remaining); setAudience(remaining[0]?.code || ''); setDeletingAudience(null);
    } catch (error) { toast.error(error.message || 'Failed to delete audience'); }
    finally { setSavingAudience(false); }
  };

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
    setResult(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('audience', audience);
      formData.append('campaign', campaign);
      formData.append('channel', channel);
      const res = await api.uploadAllianceCSV(formData);
      setResult(res);
      toast.success(res.message || `Uploaded ${res.imported || 0} prospects — sequence starting`);
    } catch (err) {
      toast.error(err.message || 'Failed to upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const selectedAudience = audiences.find((item) => item.code === audience);
  const displayedColumns = [...COLUMNS, ...(selectedAudience?.fields || []).map((field) => field.field_key)];

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
        <h3>{uploading ? 'Uploading…' : fileName ? fileName : 'Drop your CSV or Excel file here'}</h3>
        <p>{fileName ? 'File ready — or click to replace' : 'or choose a file — max 5,000 rows per upload'}</p>
        <button className="al-btn" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          {uploading ? 'Uploading…' : 'Choose file'}
        </button>
        <div className="al-fmt">
          {displayedColumns.map(c => <code key={c}>{c}</code>)}
        </div>
        <input
          type="file"
          accept=".csv,.xlsx"
          ref={fileInputRef}
          onChange={(e) => processFile(e.target.files?.[0])}
          style={{ display: 'none' }}
        />
      </div>

      <div className="al-note" style={{ marginTop: 16 }}>
        <span>i</span>
        <div>
          <b>Required:</b> business_name, audience, and the contact field needed by the selected channel.
          Email requires email. WhatsApp requires phone, consent=true, and consent_source.
          <div style={{ marginTop: 5 }}>Audience must match the selected configuration. channel_pref can be blank, email, whatsapp, or both. Both requires email plus a consented WhatsApp number.</div>
          {!!selectedAudience?.fields?.length && (
            <div style={{ marginTop: 5 }}>Custom columns: {selectedAudience.fields.map((field) => `${field.field_key}${field.required ? ' (required)' : ''}`).join(', ')}</div>
          )}
        </div>
      </div>

      {result?.report && (
        <div className="al-note success" style={{ marginTop: 18 }}>
          <span>✓</span>
          <div>
            <b>{result.campaign?.name}</b>
            <div style={{ marginTop: 5 }}>
              Imported {result.report.imported} · Duplicates {result.report.duplicates} · Suppressed {result.report.suppressed} · Invalid {result.report.invalid}
            </div>
            {result.report.errors?.length > 0 && (
              <div style={{ marginTop: 5 }}>First issue: row {result.report.errors[0].row} — {result.report.errors[0].reasons.join(', ')}</div>
            )}
          </div>
        </div>
      )}

      {/* Fields */}
      <div className="al-fields" style={{ marginTop: 20 }}>
        <div className="al-field">
          <label>Audience for this list</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)}>
            {audiences.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}><button className="al-btn ghost sm" type="button" onClick={openAddAudience}>+ Add</button><button className="al-btn ghost sm" type="button" disabled={!selectedAudience} onClick={openEditAudience}>Edit</button><button className="al-btn ghost sm" type="button" disabled={!selectedAudience} style={{ color: '#EF9A9A' }} onClick={() => setDeletingAudience(selectedAudience)}>Delete</button></div>
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

      <div style={{ background: 'var(--al-panel2)', border: '1px solid var(--al-line)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: 'var(--al-ink)', fontWeight: 600 }}>Excel template preview</div>
          <div style={{ color: 'var(--al-muted)', fontSize: 11.5, marginTop: 3 }}>{selectedAudience?.label || audience} · The downloaded workbook will match this table.</div>
        </div>
        {previewLoading ? (
          <div style={{ color: 'var(--al-muted)', padding: '18px 4px' }}>Loading preview…</div>
        ) : previewError ? (
          <div className="al-note"><span>!</span><div>{previewError}</div></div>
        ) : templatePreview ? (
          <div style={{ overflowX: 'auto', border: '1px solid var(--al-line)', borderRadius: 8 }}>
            <table className="al-table" style={{ minWidth: Math.max(900, templatePreview.columns.length * 135) }}>
              <thead><tr>{templatePreview.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>
                {templatePreview.rows.map((row, index) => (
                  <tr key={index}>{templatePreview.columns.map((column) => <td key={column}>{String(row[column] ?? '') || <span style={{ color: 'var(--al-faint)' }}>—</span>}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <button className="al-btn" type="button" disabled={downloadingTemplate || previewLoading || !templatePreview} onClick={downloadTemplate} style={{ marginTop: 14 }}>
          {downloadingTemplate ? 'Generating…' : 'Download Excel template'}
        </button>
      </div>

      {showAudienceForm && (
        <div style={{ background: 'var(--al-panel2)', border: '1px solid var(--al-line)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <div className="al-fields">
            <div className="al-field"><label>Audience code</label><input disabled={Boolean(editingAudienceCode)} value={newAudience.code} placeholder="hospital" onChange={(e) => setNewAudience({ ...newAudience, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} />{editingAudienceCode && <small style={{ color: 'var(--al-muted)' }}>Code cannot change because existing records use it.</small>}</div>
            <div className="al-field"><label>Display label</label><input value={newAudience.label} placeholder="Hospitals / administrators" onChange={(e) => setNewAudience({ ...newAudience, label: e.target.value })} /></div>
            <div className="al-field"><label>Brand</label><input value={newAudience.brand} placeholder="BM TechX" onChange={(e) => setNewAudience({ ...newAudience, brand: e.target.value })} /></div>
            <div className="al-field"><label>Default channel</label><select value={newAudience.default_channel} onChange={(e) => setNewAudience({ ...newAudience, default_channel: e.target.value })}><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></div>
          </div>
          <div className="al-field">
            <label>Additional information to collect</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1.1fr auto auto', gap: 8, alignItems: 'center' }}>
              <input value={newField.field_key} placeholder="Example: Number of beds" onChange={(e) => setNewField({ ...newField, field_key: e.target.value })} />
              <input value={newField.sample_value} placeholder="Sample: 150" onChange={(e) => setNewField({ ...newField, sample_value: e.target.value })} />
              <select value={newField.data_type} onChange={(e) => setNewField({ ...newField, data_type: e.target.value })}>
                <option value="auto">Detect automatically</option><option value="text">Text</option><option value="integer">Whole number</option><option value="number">Number / decimal</option><option value="boolean">Yes / No</option><option value="date">Date</option>
              </select>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0, textTransform: 'none', letterSpacing: 0 }}><input type="checkbox" checked={newField.required} onChange={(e) => setNewField({ ...newField, required: e.target.checked })} style={{ width: 'auto' }} /> Required</label>
              <button className="al-btn ghost sm" type="button" onClick={addCustomField}>{editingFieldKey ? 'Update field' : 'Add field'}</button>
            </div>
            {!!newAudience.fields.length && <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>{newAudience.fields.map((field) => <div key={field.field_key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', border: '1px solid var(--al-line)', borderRadius: 7 }}><code>{field.label}{field.required ? ' *' : ''} · {field.data_type === 'auto' ? 'automatic' : field.data_type}</code><span style={{ display: 'flex', gap: 6 }}><button className="al-btn ghost sm" type="button" onClick={() => editCustomField(field)}>Edit</button><button className="al-btn ghost sm" type="button" style={{ color: '#EF9A9A' }} onClick={() => removeCustomField(field.field_key)}>Remove</button></span></div>)}</div>}
            <div style={{ color: 'var(--al-muted)', fontSize: 11.5, marginTop: 8 }}>Add a sample value so the downloaded Excel file shows users the expected format. Automatic detection recognizes numbers, dates, yes/no values, and text.</div>
          </div>
          <button className="al-btn" type="button" disabled={savingAudience || !newAudience.code || !newAudience.label} onClick={addAudience} style={{ marginTop: 12 }}>
            {savingAudience ? 'Saving…' : editingAudienceCode ? 'Save changes' : 'Save audience'}
          </button>
          <button className="al-btn ghost" type="button" disabled={savingAudience} onClick={() => { setShowAudienceForm(false); setEditingAudienceCode(''); }} style={{ marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}

      {deletingAudience && <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,.72)', display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => !savingAudience && setDeletingAudience(null)}><div onClick={(event) => event.stopPropagation()} style={{ width: 'min(480px,100%)', background: 'var(--al-panel2)', border: '1px solid rgba(239,154,154,.35)', borderRadius: 14, padding: 22 }}><div className="al-page-title" style={{ fontSize: 21 }}>Delete target audience?</div><p style={{ color: 'var(--al-muted)', lineHeight: 1.6 }}><b style={{ color: 'var(--al-ink)' }}>{deletingAudience.label}</b> and its custom-field/template configuration will be removed. Deletion is blocked while prospects or campaigns still use this audience.</p><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button className="al-btn ghost" disabled={savingAudience} onClick={() => setDeletingAudience(null)}>Cancel</button><button className="al-btn" disabled={savingAudience} style={{ background: '#C62828', color: '#fff' }} onClick={confirmDeleteAudience}>{savingAudience ? 'Deleting…' : 'Delete audience'}</button></div></div></div>}

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
