import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';

export const KnowledgeBase = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
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

  return (
    <div className="alliance-mode" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="screen">
        <div className="section-header">
          <div>
            <h2 className="section-title">Knowledge Base</h2>
            <div className="section-subtitle">Train the AI with your offerings, templates, and company profiles</div>
          </div>
        </div>

        <div className="grid-1-2">
          {/* Upload Form */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-title">Add Context</div>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label className="form-label">Document Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. BM Academy Core Programs 2026"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand</label>
                <select 
                  className="form-select"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                >
                  <option value="BM Academy">BM Academy</option>
                  <option value="Core Talents">Core Talents</option>
                  <option value="BM TechX">BM TechX</option>
                  <option value="All">All Brands</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="form-select"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="profile">Company Profile & Offerings</option>
                  <option value="mou">MoU Details & Pricing</option>
                  <option value="faq">FAQs & Objections</option>
                  <option value="template">Email/Message Templates</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">File (PDF or TXT)</label>
                <input 
                  type="file" 
                  className="form-control" 
                  accept=".pdf,.txt"
                  ref={fileInputRef}
                  required
                  style={{ padding: '6px 12px' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                disabled={uploading}
              >
                {uploading ? 'Processing AI Embedding...' : 'Upload & Train AI'}
              </button>
            </form>
          </div>

          {/* Document Grid */}
          <div className="card">
            <div className="card-title">Indexed Documents ({documents.length})</div>
            
            {loading ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', padding: 20 }}>Loading documents...</div>
            ) : documents.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', padding: 20 }}>No documents uploaded yet. Add some context to improve AI accuracy.</div>
            ) : (
              <div className="kb-grid">
                {documents.map(doc => (
                  <div key={doc.id} className="kb-card" style={{ position: 'relative' }}>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      style={{ 
                        position: 'absolute', top: 12, right: 12, background: 'transparent', 
                        border: 'none', color: '#EF9A9A', cursor: 'pointer', fontSize: 16 
                      }}
                      title="Delete document"
                    >×</button>
                    
                    <div className="kb-card-brand">{doc.brand}</div>
                    <div className="kb-card-title">{doc.title}</div>
                    <div className="kb-card-meta">{doc.category.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString()}</div>
                    
                    <div className="kb-card-chars">
                      <div className="kb-bar"><div className="kb-bar-fill" style={{ width: Math.min((doc.char_count / 10000) * 100, 100) + '%' }}></div></div>
                      <span>{doc.char_count?.toLocaleString()} chars</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
