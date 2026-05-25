import { Plus } from 'lucide-react';
import { C } from '../constants/theme.js';
import { TBadge } from '../components/ui.jsx';
import { useTemplates } from '../hooks/useTemplates.js';
import { api } from '../services/api.js';

export const TemplatesView = () => {
  const { templates: apiTemplates, loading, error } = useTemplates();
  const templates = apiTemplates || [];

  const handleTemplateSubmit = async (id) => {
    try {
      await api.submitTemplate(id);
      alert('Template submitted for Meta approval!');
      window.location.reload();
    } catch (err) {
      alert('Failed to submit template: ' + err.message);
    }
  };

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>Template Management</h1>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Create, submit and track Meta WhatsApp template approvals</p>
        </div>
        <button style={{ background: C.accent, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={12} />Create Template</button>
      </div>

      {error && (
        <div style={{ background: '#2d1010', border: '1px solid #7c2d12', borderRadius: 7, padding: 12, marginBottom: 18, color: '#ef4444', fontSize: 12 }}>
          Error loading templates: {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        {[['Approved', templates.filter((t) => t.status === 'approved').length, C.green], ['Pending', templates.filter((t) => t.status === 'pending').length, C.accent], ['Rejected', templates.filter((t) => t.status === 'rejected').length, C.red], ['Draft', templates.filter((t) => t.status === 'draft').length, C.muted]].map(([l, v, col]) => (
          <div key={l} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 11, padding: '13px 18px', flex: 1 }}>
            <p style={{ fontSize: 10, color: C.muted, marginBottom: 5 }}>{l}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: col, fontFamily: "'Syne',sans-serif" }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid ' + C.border }}>
              {['Template Name', 'Category', 'Brand', 'Status', 'Submitted', 'Approved', 'Uses', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '11px 14px', fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid ' + C.border }}>
                <td style={{ padding: '13px 14px' }}><span style={{ fontFamily: 'monospace', fontSize: 11, color: C.accent, background: C.accent + '10', padding: '2px 7px', borderRadius: 5 }}>{t.name}</span></td>
                <td style={{ padding: '13px 14px' }}><span style={{ fontSize: 10, color: C.blue, background: '#0f1e38', padding: '2px 7px', borderRadius: 10 }}>{t.category || t.cat}</span></td>
                <td style={{ padding: '13px 14px', fontSize: 11, color: C.muted }}>{t.brand_name || t.brand}</td>
                <td style={{ padding: '13px 14px' }}><TBadge status={t.status} /></td>
                <td style={{ padding: '13px 14px', fontSize: 10, color: C.dim }}>{t.submitted_at || t.sub || '—'}</td>
                <td style={{ padding: '13px 14px', fontSize: 10, color: t.approved_at ? C.green : C.dim }}>{t.approved_at || t.apv || '—'}</td>
                <td style={{ padding: '13px 14px', fontSize: 12, color: C.text, fontWeight: 600 }}>{t.uses || 0}</td>
                <td style={{ padding: '13px 14px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button style={{ background: 'transparent', border: '1px solid ' + C.border, borderRadius: 5, color: C.muted, padding: '3px 9px', fontSize: 9 }}>Preview</button>
                    {t.status === 'rejected' && <button style={{ background: 'transparent', border: '1px solid ' + C.red + '40', borderRadius: 5, color: C.red, padding: '3px 9px', fontSize: 9 }}>Resubmit</button>}
                    {t.status === 'draft' && <button onClick={() => handleTemplateSubmit(t.id)} style={{ background: C.accent + '20', border: '1px solid ' + C.accentDim, borderRadius: 5, color: C.accent, padding: '3px 9px', fontSize: 9, cursor: 'pointer' }}>Submit</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>No templates found</div>}
        {loading && <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>Loading templates...</div>}
      </div>
    </div>
  );
};
