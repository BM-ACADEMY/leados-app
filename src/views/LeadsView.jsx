import { useState, useEffect, useRef } from 'react';
import { Search, Upload, Download, Plus, Eye, Phone, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import { C } from '../constants/theme.js';
import { Badge, ScoreBar } from '../components/ui.jsx';
import { useLeads } from '../hooks/useLeads.js';
import { api } from '../services/api.js';

export const LeadsView = ({ onLeadClick, refreshTrigger }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { leads: apiLeads, loading, error, refetch } = useLeads({ status: filter !== 'all' ? filter : undefined, search });

  useEffect(() => {
    if (refetch) refetch();
  }, [refreshTrigger]);

  const tabs = ['all', 'new', 'hot', 'warm', 'cold', 'converted'];
  const leads = apiLeads || [];
  const filtered = leads.filter((l) => (filter === 'all' || l.status === filter) && (l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)));

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedLeads = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    if (!filtered || filtered.length === 0) return toast.error('No leads to export.');
    const headers = ['Name', 'Phone', 'Source', 'Brand', 'Status', 'Score', 'Assigned', 'Interest', 'Last Contact'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(l => [
        `"${l.name || ''}"`,
        `="${l.phone || ''}"`,
        `"${l.source || ''}"`,
        `"${l.brand_name || ''}"`,
        `"${l.status || ''}"`,
        `${l.score || 0}`,
        `"${l.assigned_name || ''}"`,
        `"${(l.interest || '').replace(/"/g, '""')}"`,
        `"${l.last_contact ? new Date(l.last_contact).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.importLeads(formData);
      toast.success(`Successfully imported ${res.imported} leads!`);
      if (refetch) refetch();
    } catch (err) {
      toast.error('Error importing leads: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div>
        <p style={{ fontSize: 13, color: C.text, marginBottom: 10, fontWeight: 500 }}>Are you sure you want to delete this lead?</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => toast.dismiss(t.id)} style={{ background: C.card, border: '1px solid ' + C.border, color: C.muted, padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            try {
              await api.deleteLead(id);
              toast.success('Lead deleted successfully');
              if (refetch) refetch();
            } catch (err) {
              toast.error('Error deleting lead: ' + err.message);
            }
          }} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
        </div>
      </div>
    ), { duration: 5000, style: { background: C.surface, border: '1px solid ' + C.border } });
  };

  return (
    <div className="p-mobile" style={{ padding: 26, overflowY: 'auto', height: '100%' }}>
      <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 800, color: C.text }}>Lead Management</h1>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{leads.length} total leads {loading && '(loading...)'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={importing} style={{ background: C.card, border: '1px solid ' + C.border, color: C.muted, padding: '7px 12px', borderRadius: 7, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: importing ? 0.6 : 1 }}><Upload size={12} />{importing ? 'Importing...' : 'Import CSV'}</button>
          <button onClick={handleExport} style={{ background: C.card, border: '1px solid ' + C.border, color: C.muted, padding: '7px 12px', borderRadius: 7, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}><Download size={12} />Export</button>
          <button style={{ background: C.accent, border: 'none', color: '#fff', padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={12} />Add Lead</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#2d1010', border: '1px solid #7c2d12', borderRadius: 7, padding: 12, marginBottom: 18, color: '#ef4444', fontSize: 12 }}>
          Error loading leads: {error}
        </div>
      )}

      <div className="flex-col-mobile" style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'flex-start' }}>
        <div className="w-full-mobile table-responsive" style={{ display: 'flex', background: C.card, border: '1px solid ' + C.border, borderRadius: 9, overflow: 'hidden' }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: '7px 13px', fontSize: 11, fontWeight: 600, border: 'none', background: filter === t ? C.accent : 'transparent', color: filter === t ? '#fff' : C.muted, textTransform: 'capitalize' }}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="w-full-mobile" style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.card, border: '1px solid ' + C.border, borderRadius: 9, padding: '0 12px', height: 36 }}>
          <Search size={12} color={C.muted} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone..." style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 12, outline: 'none', width: '100%' }} />
        </div>
      </div>

      <div className="table-responsive" style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid ' + C.border }}>
              {['Lead', 'Phone', 'Source', 'Brand', 'Status', 'Score', 'Assigned', 'Last Contact', ''].map((h) => (
                <th key={h} style={{ padding: '11px 14px', fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map((l, i) => (
              <tr key={l.id} onClick={() => onLeadClick(l)} style={{ borderBottom: '1px solid ' + C.border, cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td style={{ padding: '13px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{l.name[0]}</div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{l.name}</p>
                      <p style={{ fontSize: 10, color: C.muted }}>{l.interest || 'N/A'}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '13px 14px', fontSize: 11, color: C.muted }}>{l.phone}</td>
                <td style={{ padding: '13px 14px' }}><span style={{ fontSize: 10, color: C.blue, background: '#0f1e38', padding: '2px 7px', borderRadius: 10 }}>{l.source || 'Manual'}</span></td>
                <td style={{ padding: '13px 14px', fontSize: 11, color: C.muted }}>{l.brand_name || 'N/A'}</td>
                <td style={{ padding: '13px 14px' }}><Badge status={l.status} /></td>
                <td style={{ padding: '13px 14px' }}><ScoreBar score={l.score || 0} /></td>
                <td style={{ padding: '13px 14px', fontSize: 11, color: C.muted }}>{l.assigned_name || 'Unassigned'}</td>
                <td style={{ padding: '13px 14px', fontSize: 10, color: C.dim }}>{l.last_contact || 'N/A'}</td>
                <td style={{ padding: '13px 14px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); onLeadClick(l); }}><Eye size={11} color={C.muted} /></button>
                    <button style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); window.open(`tel:${l.phone}`, '_self'); }}><Phone size={11} color={C.muted} /></button>
                    <button style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); handleDelete(l.id); }}><Trash size={11} color="#ef4444" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>No leads match this filter</div>}
        {loading && <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>Loading leads...</div>}
        {filtered.length > 0 && (
          <div style={{ padding: '12px 14px', borderTop: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.muted }}>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ background: 'transparent', border: '1px solid ' + C.border, color: currentPage === 1 ? C.dim : C.text, padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', fontSize: 11, fontWeight: 600, color: C.text }}>
                Page {currentPage} of {totalPages > 0 ? totalPages : 1}
              </div>
              <button 
                disabled={currentPage === totalPages || totalPages === 0} 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{ background: 'transparent', border: '1px solid ' + C.border, color: currentPage === totalPages || totalPages === 0 ? C.dim : C.text, padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
