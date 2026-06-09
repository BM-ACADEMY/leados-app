import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';

export const KnowledgeBase = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('profile');
  const [brand, setBrand] = useState('BM Academy');
  const fileInputRef = useRef(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await api.getKnowledgeBase();
      if (res.success) {
        setDocuments(res.documents || []);
      }
    } catch (err) {
      toast.error('Failed to load knowledge base: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      return toast.error('Please select a PDF or Text file.');
    }
    if (!title.trim()) {
      return toast.error('Title is required.');
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('brand', brand);

      const res = await api.uploadKnowledgeDoc(formData);
      toast.success(res.message || 'Document uploaded');
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocs();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteKnowledgeDoc(id);
      toast.success('Deleted successfully');
      setDocuments(docs => docs.filter(d => d.id !== id));
    } catch (err) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const totalChars = documents.reduce((sum, doc) => sum + (doc.char_count || 0), 0);

  return (
    <div className="alliance-dashboard" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div className="section-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="section-title" style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: 'white' }}>AI Knowledge Base</div>
          <div className="section-subtitle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Upload ABM Groups profile PDFs here. AI reads these before scoring every lead.</div>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Upload Document</button>
        </div>
      </div>

      <div style={{ background: 'rgba(106,27,154,0.1)', border: '1px solid rgba(106,27,154,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ba68c8', boxShadow: '0 0 8px #ba68c8' }}></div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
          <span style={{ fontWeight: 700 }}>AI Brain Active</span> — {documents.length} documents loaded · {totalChars.toLocaleString()} characters of context · AI scoring with ABM-specific knowledge
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Upload New Document</div>
          <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Title</label>
              <input type="text" style={{ width: '100%', background: 'var(--navy3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12 }} placeholder="e.g. Profile 2026" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Brand</label>
              <select style={{ width: '100%', background: 'var(--navy3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12 }} value={brand} onChange={e => setBrand(e.target.value)}>
                <option value="BM Academy">BM Academy</option>
                <option value="Core Talents">Core Talents</option>
                <option value="BM TechX">BM TechX</option>
                <option value="All Brands">All Brands</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Category</label>
              <select style={{ width: '100%', background: 'var(--navy3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12 }} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="profile">Profile</option>
                <option value="mou">MoU</option>
                <option value="faq">FAQ</option>
                <option value="template">Template</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>File (PDF/TXT)</label>
              <input type="file" ref={fileInputRef} required style={{ width: '100%', fontSize: 12 }} accept=".pdf,.txt" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? '...' : 'Save'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', padding: 20, textAlign: 'center' }}>Loading documents...</div>
      ) : (
        <div className="grid-3">
          {documents.map(doc => {
            const getBrandColor = (b) => {
              if (b?.includes('Academy')) return 'var(--gold)';
              if (b?.includes('Talents')) return 'var(--gold2)';
              return 'var(--teal2)';
            };
            const brandColor = getBrandColor(doc.brand);
            const coverage = Math.min(Math.round(((doc.char_count || 0) / 10000) * 100), 100);

            return (
              <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', padding: 20 }}>
                <button onClick={() => handleDelete(doc.id)} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 16 }} title="Delete document" onMouseEnter={e => e.target.style.color = '#EF9A9A'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.2)'}>×</button>
                <div style={{ fontSize: 10, fontWeight: 700, color: brandColor, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>{doc.brand}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{doc.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Category: {doc.category} · {doc.char_count?.toLocaleString()} chars extracted</div>
                
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Coverage</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{coverage}%</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${coverage}%`, background: coverage < 40 ? 'var(--hot)' : 'var(--teal)' }}></div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Upload New Box */}
          <div onClick={() => setShowForm(true)} style={{ border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12, minHeight: 160, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
            <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>+</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Upload Document</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>PDF or TXT</div>
          </div>
        </div>
      )}
    </div>
  );
};
