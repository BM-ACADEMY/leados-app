import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import './alliance.css';

const MOCK = [
  { id: 1, name: 'Dr. Meena Clinic', location: 'Villupuram · Healthcare', audience: 'smb', channel: 'wa', status: 'int', touch: '2 of 4', score: 88, scoreColor: '#5FD69A' },
  { id: 2, name: 'SKP Engineering College', location: 'Tiruvannamalai · Education', audience: 'college', channel: 'email', status: 'rep', touch: '3 of 4', score: 71, scoreColor: '#E4C15A' },
  { id: 3, name: 'Zenta Softwares Pvt Ltd', location: 'Chennai · IT / HR', audience: 'hr', channel: 'email', status: 'seq', touch: '2 of 4', score: 54, scoreColor: '#93B4F5' },
  { id: 4, name: 'Green Leaf Dental', location: 'Pondicherry · Healthcare', audience: 'smb', channel: 'wa', status: 'seq', touch: '1 of 4', score: null, scoreColor: null },
  { id: 5, name: 'Arunai Arts & Science', location: 'Tiruvannamalai · Education', audience: 'college', channel: 'email', status: 'new', touch: '—', score: null, scoreColor: null },
];

const audienceLabels = { smb: 'SMB', college: 'College', hr: 'HR', iv: 'IV' };
const statusMap = {
  int: { label: 'Interested', cls: 'int' },
  rep: { label: 'Replied', cls: 'rep' },
  seq: { label: 'In sequence', cls: 'seq' },
  new: { label: 'New', cls: 'new' },
};

export const LeadList = () => {
  const [prospects, setProspects] = useState(MOCK);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getAllianceProspects?.();
        if (data?.prospects?.length) setProspects(data.prospects);
      } catch (_) { /* use mock */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = filter === 'all' ? prospects : prospects.filter(p => p.status === filter || p.audience === filter);

  return (
    <div className="al-wrap">
      <div className="al-eyebrow">AllianceOS · Screen 2</div>
      <div className="al-page-title">Prospects</div>
      <p className="al-page-desc">
        Everyone in the system, their channel, where they are in the sequence, and their AI warmth score.
      </p>

      {/* Filter tabs */}
      <div className="al-kbtabs" style={{ marginBottom: 16 }}>
        {['all', 'new', 'seq', 'rep', 'int'].map(f => (
          <span key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'seq' ? 'In Sequence' : f === 'rep' ? 'Replied' : f === 'int' ? 'Interested' : 'New'}
          </span>
        ))}
      </div>

      <div style={{ background: 'var(--al-panel2)', border: '1px solid var(--al-line)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--al-muted)', fontSize: 13 }}>Loading prospects…</p>
        ) : (
          <table className="al-table">
            <thead>
              <tr>
                <th>Prospect</th>
                <th>Audience</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Touch</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="al-who">
                      {p.name}
                      <small>{p.location}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`al-tag ${p.audience}`}>{audienceLabels[p.audience] || p.audience}</span>
                  </td>
                  <td>
                    <span className={`al-tag ${p.channel === 'wa' ? 'wa' : 'email'}`}>
                      {p.channel === 'wa' ? 'WhatsApp' : 'Email'}
                    </span>
                  </td>
                  <td>
                    <span className={`al-st ${statusMap[p.status]?.cls || 'new'}`}>
                      <span className="d" />
                      {statusMap[p.status]?.label || p.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: 'var(--al-muted)' }}>
                    {p.touch}
                  </td>
                  <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, color: p.scoreColor || 'var(--al-muted)' }}>
                    {p.score ?? '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--al-muted)', padding: 28 }}>No prospects found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
