import React from 'react';
import './alliance.css';

const STATS = [
  { k: '642', label: 'Messages sent', trend: '↑ 18% vs last week', cls: '' },
  { k: '71', label: 'Replies', trend: '11.1% reply rate', cls: 'gold' },
  { k: '23', label: 'Interested', trend: '↑ 6 new today', cls: 'green' },
  { k: '4', label: 'MoUs sent', trend: '2 colleges · 2 HR', cls: 'blue' },
];

const FUNNEL = [
  { label: 'Prospects contacted', value: 642, pct: 100 },
  { label: 'Delivered', value: 604, pct: 94 },
  { label: 'Replied', value: 71, pct: 33 },
  { label: 'Interested', value: 23, pct: 16 },
  { label: 'Closed (in LeadOS)', value: 7, pct: 6 },
];

export const AllianceDashboard = () => {
  return (
    <div className="al-wrap">
      <div className="al-eyebrow">AllianceOS · Analytics</div>
      <div className="al-page-title">This week</div>
      <p className="al-page-desc">
        Where the pipeline is coming from and how it's converting.
      </p>

      {/* Stats row */}
      <div className="al-stats">
        {STATS.map(s => (
          <div className="al-stat" key={s.label}>
            <div className={`al-stat-k ${s.cls}`}>{s.k}</div>
            <div className="al-stat-l">{s.label}</div>
            <div className="al-stat-t">{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="al-card" style={{ marginBottom: 20 }}>
        <div className="al-card-title">Conversion funnel</div>
        <div className="al-funnel">
          {FUNNEL.map(f => (
            <div className="al-frow" key={f.label}>
              <span className="fl">{f.label}</span>
              <span className="fbar"><i style={{ width: `${f.pct}%` }} /></span>
              <span className="fv">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Channel breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
        <div className="al-card">
          <div className="al-card-title">By channel</div>
          {[
            { label: 'Email (getabm.in)', sent: 480, replied: 41, pct: 8.5 },
            { label: 'WhatsApp (pool)', sent: 162, replied: 30, pct: 18.5 },
          ].map(c => (
            <div key={c.label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--al-ink)' }}>{c.label}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: 'var(--al-gold2)' }}>{c.pct}% reply</span>
              </div>
              <div className="al-bar" style={{ height: 9 }}>
                <i className="g" style={{ width: `${c.pct * 4}%` }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--al-faint)', marginTop: 5 }}>
                {c.sent} sent · {c.replied} replied
              </div>
            </div>
          ))}
        </div>

        <div className="al-card">
          <div className="al-card-title">By audience</div>
          {[
            { label: 'College / TPO', count: 8, color: '#E4C15A' },
            { label: 'HR / Corporate', count: 7, color: '#B79BF5' },
            { label: 'SMB / Clinic', count: 5, color: '#8FB2F2' },
            { label: 'IV Coordinator', count: 3, color: '#5FD69A' },
          ].map(a => (
            <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--al-line)', fontSize: 13 }}>
              <span style={{ color: 'var(--al-muted)' }}>{a.label}</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, color: a.color }}>{a.count} interested</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
