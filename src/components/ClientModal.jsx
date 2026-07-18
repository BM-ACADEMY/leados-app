import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Building, Smartphone, Key, Shield, AlertCircle, Trash2 } from 'lucide-react';
import { C } from '../constants/theme.js';
import { api } from '../services/api.js';
import toast from 'react-hot-toast';

export const ClientModal = ({ client, onClose, onUpdate }) => {
  const isEditing = !!client;
  
  const [formData, setFormData] = useState({
    name: client?.name || '',
    type: client?.type || '',
    plan: client?.plan || 'Starter',
    whatsapp_number: client?.whatsapp_number || '',
    phone_number_id: client?.phone_number_id || '',
    wa_business_id: client?.wa_business_id || '',
    wa_access_token: client?.wa_access_token || '',
    wa_category: client?.wa_category || 'OTHER',
    wa_description: client?.wa_description || '',
    wa_address: client?.wa_address || '',
    wa_email: client?.wa_email || '',
    wa_website: client?.wa_website || '',
    status: client?.status || 'active',
    brand_tag: client?.brand_tag || '',
    brand_voice: client?.brand_voice || '',
    industry: client?.industry || '',
    target_audience: client?.target_audience || ''
  });
  
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Client name is required');
    
    setLoading(true);
    try {
      if (isEditing) {
        await api.updateClient(client.id, formData);
        toast.success('Client updated successfully');
      } else {
        await api.createClient(formData);
        toast.success('Client onboarded successfully');
      }
      onUpdate();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
      setLoading(false);
    }
  };

  const handleSetupWhatsApp = async () => {
    if (!client?.id) return;
    const tId = toast.loading('Setting up Meta Business Profile and Verifying Number...');
    try {
      await api.setupClientWhatsApp(client.id);
      toast.success('WhatsApp Meta Setup completed! Dummy message sent.', { id: tId });
    } catch (err) {
      toast.error(err.message || 'Setup Failed', { id: tId });
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
  };

  const confirmDelete = async () => {
    if (deleteConfirmText !== 'delete-account') return;
    setLoading(true);
    try {
      await api.deleteClient(client.id);
      toast.success('Client deleted successfully');
      onUpdate();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete client');
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: C.bg,
    border: '1px solid ' + C.border,
    borderRadius: 9,
    padding: '11px 14px',
    color: C.text,
    fontSize: 13,
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif"
  };

  const labelStyle = {
    display: 'block',
    fontSize: 9,
    color: C.muted,
    marginBottom: 6,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase'
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid ' + C.border, background: C.surface, borderRadius: '16px 16px 0 0', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>
              {isEditing ? 'Manage Client' : 'Onboard New Client'}
            </h2>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{isEditing ? client.name : 'Setup a new workspace'}</p>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: '1px solid ' + C.border, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 24 }}>
          <form onSubmit={handleSubmit}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }} className="grid-responsive">
            
            {/* Left Column: General Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: C.accent }}>
                <Building size={16} />
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Business Details</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Business Name <span style={{color: C.red}}>*</span></label>
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} placeholder="e.g. MetaCorp Inc." required />
                </div>

                {isEditing && (
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={inputStyle}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: WhatsApp Config */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: C.green }}>
                <Smartphone size={16} />
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>WhatsApp API</h3>
              </div>
              
              <div style={{ background: C.bg, border: '1px solid ' + C.border, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, color: C.muted, fontSize: 11, lineHeight: 1.5 }}>
                  <AlertCircle size={18} color={C.blue} style={{ flexShrink: 0 }} />
                  <p>Meta Developer Portal &gt; WhatsApp &gt; API Setup.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>WhatsApp Number</label>
                  <input value={formData.whatsapp_number} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} style={inputStyle} placeholder="919876543210 (with country code)" />
                </div>
                <div>
                  <label style={labelStyle}>Phone Number ID</label>
                  <input value={formData.phone_number_id} onChange={e => setFormData({...formData, phone_number_id: e.target.value})} style={inputStyle} placeholder="15-digit ID from Meta" />
                </div>
                <div>
                  <label style={labelStyle}>Business Account ID</label>
                  <input value={formData.wa_business_id} onChange={e => setFormData({...formData, wa_business_id: e.target.value})} style={inputStyle} placeholder="15-digit ID from Meta" />
                </div>
                <div>
                  <label style={labelStyle}>System User Token</label>
                  <div style={{ position: 'relative' }}>
                    <Shield size={14} color={C.muted} style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input type="password" value={formData.wa_access_token} onChange={e => setFormData({...formData, wa_access_token: e.target.value})} style={{...inputStyle, paddingLeft: 34}} placeholder="EAAG..." />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={formData.wa_category} onChange={e => setFormData({...formData, wa_category: e.target.value})} style={inputStyle}>
                    {['Food and groceries', 'Alcoholic drinks', 'Government', 'Hotel and lodging', 'Medical and health', 'Over-the-counter medicine', 'Charity', 'Professional services', 'Shopping and retail', 'Travel and transportation', 'Restaurant', 'OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Description (Optional)</label>
                  <textarea value={formData.wa_description} onChange={e => setFormData({...formData, wa_description: e.target.value})} style={{...inputStyle, minHeight: 60}} maxLength={512} />
                </div>
                <div>
                  <label style={labelStyle}>Address (Optional)</label>
                  <input value={formData.wa_address} onChange={e => setFormData({...formData, wa_address: e.target.value})} style={inputStyle} maxLength={256} />
                </div>
                <div>
                  <label style={labelStyle}>Email (Optional)</label>
                  <input value={formData.wa_email} onChange={e => setFormData({...formData, wa_email: e.target.value})} style={inputStyle} maxLength={128} />
                </div>
                <div>
                  <label style={labelStyle}>Website (Optional)</label>
                  <input value={formData.wa_website} onChange={e => setFormData({...formData, wa_website: e.target.value})} style={inputStyle} maxLength={256} />
                </div>
              </div>
            </div>
          </div>

          {/* Brand Voice */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid ' + C.border }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: C.purple }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Brand Voice (AI Content)</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="grid-responsive">
              <div>
                <label style={labelStyle}>Brand Tag</label>
                <input value={formData.brand_tag} onChange={e => setFormData({...formData, brand_tag: e.target.value})} style={inputStyle} placeholder="e.g. Learn with Kamar" />
              </div>
              <div>
                <label style={labelStyle}>Industry</label>
                <input value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} style={inputStyle} placeholder="e.g. EdTech & Education" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="grid-responsive">
              <div>
                <label style={labelStyle}>Target Audience</label>
                <textarea value={formData.target_audience} onChange={e => setFormData({...formData, target_audience: e.target.value})} style={{...inputStyle, minHeight: 72, resize: 'vertical'}} placeholder="Who this brand targets..." />
              </div>
              <div>
                <label style={labelStyle}>Brand Voice Guide</label>
                <textarea value={formData.brand_voice} onChange={e => setFormData({...formData, brand_voice: e.target.value})} style={{...inputStyle, minHeight: 72, resize: 'vertical'}} placeholder="Tone, CTA, audience, restrictions..." />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
            <div>
              {isEditing && formData.phone_number_id && formData.wa_access_token && (
                <button type="button" onClick={handleSetupWhatsApp} style={{ background: '#25D36620', border: '1px solid #25D36640', color: '#25D366', padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Smartphone size={16} />
                  Verify Number & Set Profile in Meta
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {isEditing && (
                <button type="button" onClick={handleDeleteClick} disabled={loading} style={{ background: '#ff444420', border: '1px solid #ff4444', color: '#ff4444', padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trash2 size={16} />
                  Delete
                </button>
              )}
              <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid ' + C.border, color: C.muted, padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={loading} style={{ background: C.accent, border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                <Save size={16} />
                {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Onboard Client')}
              </button>
            </div>
          </div>

        </form>
        </div>

        {showDeleteConfirm && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
            <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, textAlign: 'center' }}>
              <AlertCircle size={48} color={C.red} style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>Delete Client?</h3>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                This action cannot be undone. Please type <strong style={{ color: C.text }}>delete-account</strong> to confirm.
              </p>
              <input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                style={{ ...inputStyle, textAlign: 'center', marginBottom: 16, border: '1px solid ' + C.red }}
                placeholder="delete-account"
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, background: 'transparent', border: '1px solid ' + C.border, color: C.muted, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="button" onClick={confirmDelete} disabled={deleteConfirmText !== 'delete-account' || loading} style={{ flex: 1, background: C.red, border: 'none', color: '#fff', padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: deleteConfirmText !== 'delete-account' || loading ? 'not-allowed' : 'pointer', opacity: deleteConfirmText !== 'delete-account' || loading ? 0.5 : 1 }}>
                  {loading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
