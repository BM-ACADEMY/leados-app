import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';

const STAGES = [
  { id: 'new', label: 'New Leads' },
  { id: 'analysed', label: 'AI Analysed' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'meeting', label: 'Meeting Fixed' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'closed', label: 'Closed / MoU' }
];

export const Pipeline = () => {
  const [pipeline, setPipeline] = useState({
    new: [], analysed: [], contacted: [], meeting: [], negotiation: [], closed: []
  });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('college');

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const res = await api.getPipeline(typeFilter);
      if (res.success && res.pipeline) {
        setPipeline({
          new: res.pipeline.new || [],
          analysed: res.pipeline.analysed || [],
          contacted: res.pipeline.contacted || [],
          meeting: res.pipeline.meeting || [],
          negotiation: res.pipeline.negotiation || [],
          closed: res.pipeline.closed || [],
        });
      }
    } catch (err) {
      toast.error('Failed to load pipeline: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, [typeFilter]);

  const onDragStart = (e, orgId, sourceStage) => {
    e.dataTransfer.setData('orgId', orgId);
    e.dataTransfer.setData('sourceStage', sourceStage);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = async (e, targetStage) => {
    e.preventDefault();
    const orgId = e.dataTransfer.getData('orgId');
    const sourceStage = e.dataTransfer.getData('sourceStage');

    if (!orgId || sourceStage === targetStage) return;

    // Optimistic UI update
    const movedItem = pipeline[sourceStage].find(i => i.id.toString() === orgId);
    if (!movedItem) return;

    setPipeline(prev => ({
      ...prev,
      [sourceStage]: prev[sourceStage].filter(i => i.id.toString() !== orgId),
      [targetStage]: [movedItem, ...prev[targetStage]]
    }));

    try {
      // In a real app, you would have an endpoint like api.updatePipelineStage(orgId, targetStage)
      const token = localStorage.getItem('leados_token');
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/pipeline/${orgId}/stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStage })
      });
      toast.success(`Moved to ${targetStage}`);
    } catch (err) {
      toast.error('Failed to update stage');
      fetchPipeline(); // revert
    }
  };

  return (
    <div className="alliance-mode" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="screen">
        <div className="section-header">
          <div>
            <h2 className="section-title">Sales Pipeline</h2>
            <div className="section-subtitle">Drag and drop leads to update stages</div>
          </div>
          <div className="tabs" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
            <button 
              className={`tab ${typeFilter === 'college' ? 'active' : ''}`}
              onClick={() => setTypeFilter('college')}
            >Colleges</button>
            <button 
              className={`tab ${typeFilter === 'company' ? 'active' : ''}`}
              onClick={() => setTypeFilter('company')}
            >Companies</button>
            <button 
              className={`tab ${typeFilter === 'clinic' ? 'active' : ''}`}
              onClick={() => setTypeFilter('clinic')}
            >Clinics</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading pipeline...</div>
        ) : (
          <div className="kanban">
            {STAGES.map((stage) => (
              <div 
                key={stage.id} 
                className="kanban-col"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, stage.id)}
              >
                <div className="kanban-header">
                  <span>{stage.label}</span>
                  <span className="kanban-count">{pipeline[stage.id]?.length || 0}</span>
                </div>

                {pipeline[stage.id]?.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => onDragStart(e, lead.id, stage.id)}
                  >
                    <div className="kanban-card-name">{lead.name}</div>
                    <div className="kanban-card-meta">{lead.district || 'Location unknown'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <span className={`badge ${lead.score >= 80 ? 'badge-hot' : lead.score >= 50 ? 'badge-warm' : 'badge-new'}`}>
                        {lead.score || 0}/100
                      </span>
                      {lead.status === 'contacted' && <span className="n8n-pill n8n-send">Sent</span>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
