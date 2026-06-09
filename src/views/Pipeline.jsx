import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';
import './AllianceDashboard.css';

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
    <div className="alliance-dashboard" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div className="section-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="section-title" style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: 'white' }}>Pipeline Board</div>
          <div className="section-subtitle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Drag cards to update stage</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select 
            className="form-select" 
            style={{ width: 160, background: 'var(--navy3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12, outline: 'none' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="college">Colleges</option>
            <option value="company">Companies</option>
            <option value="clinic">Clinics</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading pipeline...</div>
      ) : (
        <div className="board">
          {STAGES.map((stage) => {
            const isHot = stage.id === 'negotiation';
            const isGreen = stage.id === 'closed';
            const colStyle = isHot 
              ? { border: '1px solid rgba(255,107,53,0.3)', background: 'rgba(255,107,53,0.05)' } 
              : isGreen 
                ? { border: '1px solid rgba(76,175,80,0.3)', background: 'rgba(76,175,80,0.05)' }
                : {};
            const titleStyle = isHot ? { color: 'var(--hot)' } : isGreen ? { color: '#4CAF50' } : {};
            const countStyle = isHot ? { background: 'var(--hot)', color: 'white' } : isGreen ? { background: '#4CAF50', color: 'white' } : {};

            return (
              <div 
                key={stage.id} 
                className="board-col"
                style={colStyle}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, stage.id)}
              >
                <div className="col-header">
                  <div className="col-title" style={titleStyle}>{stage.label.toUpperCase()}</div>
                  <div className="col-count" style={countStyle}>{pipeline[stage.id]?.length || 0}</div>
                </div>

                {pipeline[stage.id]?.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="board-card"
                    style={isGreen ? { borderColor: '#4CAF50' } : {}}
                    draggable
                    onDragStart={(e) => onDragStart(e, lead.id, stage.id)}
                  >
                    <div className="bc-title">{lead.name || 'Unknown Org'}</div>
                    <div className="bc-sub" style={isGreen ? { color: '#4CAF50' } : {}}>{lead.district || 'Location unknown'}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
