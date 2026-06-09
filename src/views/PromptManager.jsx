import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './AllianceDashboard.css';

export const PromptManager = () => {
  const [activeTab, setActiveTab] = useState('Analyzer Prompts');
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form / Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(null); // null if creating a new one
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPromptText, setFormPromptText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Selected prompt for testing output
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [testOutput, setTestOutput] = useState(null);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const data = await api.getPrompts();
      if (data.success) {
        setPrompts(data.prompts);
      } else {
        setError(data.message || 'Failed to fetch prompts');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromptClick = () => {
    setEditPrompt(null);
    setFormTitle('');
    setFormDescription('');
    setFormPromptText('');
    setIsEditing(true);
  };

  const handleEditClick = (prompt) => {
    setEditPrompt(prompt);
    setFormTitle(prompt.name);
    setFormDescription(prompt.purpose || '');
    setFormPromptText(prompt.prompt_text);
    setIsEditing(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) {
      return;
    }
    try {
      const response = await api.deletePrompt(id);
      if (response.success) {
        setPrompts(prompts.filter(p => p.id !== id));
        if (selectedPrompt?.id === id) {
          setSelectedPrompt(null);
          setTestOutput(null);
        }
      } else {
        alert(response.message || 'Failed to delete prompt');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete prompt');
    }
  };

  const handleSavePrompt = async (e) => {
    e.preventDefault();
    const promptData = {
      name: formTitle,
      purpose: formDescription,
      prompt_text: formPromptText,
      active: true
    };

    setIsSaving(true);
    try {
      if (editPrompt) {
        // Update
        const response = await api.updatePrompt(editPrompt.id, promptData);
        if (response.success) {
          setPrompts(prompts.map(p => p.id === editPrompt.id ? response.prompt : p));
          setIsEditing(false);
        } else {
          alert(response.message || 'Failed to update prompt');
        }
      } else {
        // Create
        const response = await api.createPrompt(promptData);
        if (response.success) {
          setPrompts([...prompts, response.prompt]);
          setIsEditing(false);
        } else {
          alert(response.message || 'Failed to create prompt');
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    // Render appropriate mock test output depending on the prompt type
    if (prompt.name.includes('college')) {
      setTestOutput(JSON.stringify({
        "offer_recommended": "Training + Employability MoU — Free Model",
        "reason": "4200 students, CSE dominant. Only 12% placed in tech roles.",
        "bm_course_match": "Full Stack Dev Tier 2 + AI Tools Mastery",
        "core_talents_offer": "Free MoU → Placement support from batch 1",
        "training_potential": "high",
        "placement_potential": "high",
        "personalisation_hook": `Their 2024 annual report shows only 12% CSE students placed in tech roles at ${prompt.name || 'this college'}.`
      }, null, 2));
    } else {
      setTestOutput(JSON.stringify({
        "offer_recommended": "Growth Tier Partner MoU",
        "reason": "Expanding engineering team, active jobs matching Node.js/React stack.",
        "skills_match": "MERN Stack Development, Prompt Engineering",
        "hiring_potential": "high",
        "personalisation_hook": `Observed recent hiring expansion on LinkedIn for tech divisions in ${prompt.name || 'this company'}.`
      }, null, 2));
    }
  };

  return (
    <div className="alliance-dashboard" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="section-title" style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: 'white' }}>Prompt Manager</div>
          <div className="section-subtitle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Edit AI prompts without touching code. Changes apply immediately.</div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleCreatePromptClick}
          style={{ background: 'var(--gold)', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 16, fontWeight: 800 }}>+</span> Create Analyze Prompt
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <div className={`tab ${activeTab === 'Analyzer Prompts' ? 'active' : ''}`} onClick={() => setActiveTab('Analyzer Prompts')}>Analyzer Prompts</div>
        <div className={`tab ${activeTab === 'Outreach Prompts' ? 'active' : ''}`} onClick={() => setActiveTab('Outreach Prompts')}>Outreach Prompts</div>
        <div className={`tab ${activeTab === 'Follow-up Prompts' ? 'active' : ''}`} onClick={() => setActiveTab('Follow-up Prompts')}>Follow-up Prompts</div>
      </div>

      {error && (
        <div className="alert-strip" style={{ marginBottom: 20 }}>
          <div className="dot"></div>
          <span style={{ color: 'var(--hot)' }}>{error}</span>
        </div>
      )}

      <div className="grid-2-1">
        {/* Left Column: Prompt List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              Loading prompt templates...
            </div>
          ) : prompts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'var(--navy2)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
              No prompts found. Click "Create Analyze Prompt" to get started.
            </div>
          ) : (
            prompts.map((p) => (
              <div className="card" key={p.id}>
                <div style={{ fontFamily: "'DM Mono', monospace", color: 'var(--gold)', fontWeight: 500, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>{p.purpose || 'No description provided'}</div>
                
                <div className="code-block" style={{ position: 'relative', maxHeight: '120px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                  {p.prompt_text}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, var(--navy2))', borderRadius: '0 0 8px 8px' }}></div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ background: 'var(--gold)', color: 'var(--navy)' }} onClick={() => handleEditClick(p)}>Edit</button>
                    <button className="btn btn-secondary" onClick={() => handleDeleteClick(p.id)} style={{ background: 'rgba(198,40,40,0.15)', color: '#FF8A80', border: '1px solid rgba(198,40,40,0.3)' }}>Delete</button>
                    <button className="btn btn-secondary" onClick={() => handleTestPrompt(p)}>Test with Lead</button>
                  </div>
                  <span className={`badge ${p.active ? 'badge-done' : 'badge-cool'}`} style={{ background: p.active ? 'rgba(76,175,80,0.1)' : 'rgba(255,255,255,0.05)' }}>
                    {p.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Testing Output */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="section-title" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            {selectedPrompt ? `PROMPT TEST OUTPUT (${selectedPrompt.name})` : 'PROMPT TEST OUTPUT'}
          </div>
          
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            {selectedPrompt ? 'Mock output based on current prompt structure:' : 'Select a prompt and click "Test with Lead" to see actual AI output'}
          </div>

          <div className="code-block" style={{ color: '#A0C4FF', flex: 1, minHeight: 200, whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {testOutput || `{
  "offer_recommended": "Training + Employability MoU — Free Model",
  "reason": "4200 students, CSE dominant. Only 12% placed in tech roles.",
  "bm_course_match": "Full Stack Dev Tier 2 + AI Tools Mastery",
  "core_talents_offer": "Free MoU → Placement support from batch 1",
  "training_potential": "high",
  "placement_potential": "high",
  "personalisation_hook": "Their 2024 annual report shows only 12% CSE students placed in tech roles."
}`}
          </div>

          <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24 }}>
            <div className="section-title" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>PROMPT VARIABLES AVAILABLE</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
              <span style={{ color: 'var(--teal2)' }}>{`{{org_name}}`}</span> — Organisation name<br/>
              <span style={{ color: 'var(--teal2)' }}>{`{{district}}`}</span> — District / location<br/>
              <span style={{ color: 'var(--teal2)' }}>{`{{website_text}}`}</span> — Scraped website content<br/>
              <span style={{ color: 'var(--teal2)' }}>{`{{kb_context}}`}</span> — Knowledge base docs (auto-injected)
            </div>
          </div>
        </div>
      </div>

      {/* Edit/Create Modal Overlay */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(13, 27, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', background: 'var(--navy2)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: '18px', fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
              <span>{editPrompt ? 'Edit Analyze Prompt' : 'Create Analyze Prompt'}</span>
              <button 
                onClick={() => setIsEditing(false)} 
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '24px', cursor: 'pointer', outline: 'none' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePrompt} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', fontWeight: 600 }}>Title (Name / Identifier)</label>
                <input 
                  type="text" 
                  required 
                  value={formTitle} 
                  onChange={(e) => setFormTitle(e.target.value)} 
                  placeholder="e.g. college_analyzer"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--navy3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', fontWeight: 600 }}>Description (Purpose)</label>
                <input 
                  type="text" 
                  required 
                  value={formDescription} 
                  onChange={(e) => setFormDescription(e.target.value)} 
                  placeholder="e.g. Analyzes a college and recommends ABM Groups offer"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--navy3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', fontWeight: 600 }}>Prompt Box (Prompt Text)</label>
                <textarea 
                  required 
                  rows={10}
                  value={formPromptText} 
                  onChange={(e) => setFormPromptText(e.target.value)} 
                  placeholder="You are an AI analyst for..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--navy3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--gold)', color: 'var(--navy)' }} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
