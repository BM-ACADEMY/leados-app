import React from 'react';
import './alliance.css';

const NUMBERS = [
  { id: 'WA-1', sub: '+91 90xxx · WhatsApp', quality: 'g', label: 'Green', sent: 34, cap: 50, warmup: 'Week 3 · cap 50', warmLabel: 'Warm-up', barClass: 'g' },
  { id: 'WA-2', sub: '+91 91xxx · WhatsApp', quality: 'y', label: 'Yellow', sent: 9, cap: 15, warmup: 'cap cut 50%', warmLabel: 'Throttled · paused 41h', barClass: 'y' },
  { id: 'WA-3', sub: '+91 63xxx · WhatsApp', quality: 'g', label: 'Green', sent: 12, cap: 30, warmup: 'Week 2 · cap 30', warmLabel: 'Warm-up', barClass: 'g' },
  { id: 'getabm.in', sub: 'Email · 3 inboxes', quality: 'g', label: 'Good', sent: 88, cap: 150, warmup: '0.8% · healthy', warmLabel: 'Bounce rate', barClass: 'gold' },
];

export const Pipeline = () => {
  return (
    <div className="al-wrap">
      <div className="al-eyebrow">AllianceOS · Screen 3 · Safety Panel</div>
      <div className="al-page-title">Number &amp; domain health</div>
      <p className="al-page-desc">
        The most important screen. The email domain carries cold outreach; WhatsApp numbers handle campaigns &amp; opted-in chats.
        Numbers share one daily limit — the pool is for failover, not extra volume.
        <strong style={{ color: 'var(--al-yellow)' }}> Yellow auto-throttles, red auto-stops.</strong>
      </p>

      <div className="al-pool">
        {NUMBERS.map(n => {
          const pct = Math.round((n.sent / n.cap) * 100);
          return (
            <div className="al-ncard" key={n.id}>
              <div className="al-ncard-top">
                <div className="al-ncard-name">
                  {n.id}
                  <span>{n.sub}</span>
                </div>
                <span className={`al-lamp ${n.quality}`}>
                  <span className="d" />
                  {n.label}
                </span>
              </div>
              <div className="al-meter">
                <div className="al-meter-lab">
                  Today's sends
                  <b>{n.sent} / {n.cap}</b>
                </div>
                <div className="al-bar">
                  <i className={n.barClass} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="al-warm">
                <span>{n.warmLabel}</span>
                <b>{n.warmup}</b>
              </div>
            </div>
          );
        })}
      </div>

      <div className="al-note success" style={{ marginTop: 20 }}>
        ✓
        <div>
          <b>Guard is active.</b> WA-2 dipped to yellow at 11:40 and was auto-throttled + paused for 48h.
          Kamar was alerted on WhatsApp. No action needed.
        </div>
      </div>

      {/* Safety rules reminder */}
      <div style={{ marginTop: 24, background: 'var(--al-panel2)', border: '1px solid var(--al-line)', borderRadius: 12, padding: 20 }}>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--al-ink)', marginBottom: 14 }}>Safety rules — non-negotiable</p>
        {[
          'LeadOS number 99445 09441 is sacred — inbound only. AllianceOS NEVER cold-sends from it.',
          'AllianceOS WhatsApp uses its own number(s), separate from LeadOS.',
          'Cold email NEVER sends from @abmgroups.org — use a separate domain (getabm.in).',
          'Every number/inbox warms up slowly. No number sends 100/day.',
          'Stop on reply. Stop on suppression. Never exceed 4 touches.',
          'The quality monitor auto-pauses any number before it gets banned.',
        ].map((rule, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: i > 0 ? '1px solid var(--al-line)' : 'none', fontSize: 12.5, color: 'var(--al-muted)' }}>
            <span style={{ color: 'var(--al-gold)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, flexShrink: 0, marginTop: 1 }}>{String(i + 1).padStart(2, '0')}</span>
            {rule}
          </div>
        ))}
      </div>
    </div>
  );
};
