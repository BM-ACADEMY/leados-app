import React, { useState, useCallback } from 'react';
import './alliance.css';

const TIERS = [
  { value: 250, label: '250', sub: 'unverified' },
  { value: 1000, label: '1,000', sub: 'verified' },
  { value: 10000, label: '10,000', sub: 'scaled' },
  { value: 100000, label: '100K', sub: 'high' },
];

const TYPES = [
  { rate: 1.09, label: 'Marketing', sub: '₹1.09/msg' },
  { rate: 0.145, label: 'Utility', sub: '₹0.145/msg' },
];

function inr(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export const CampaignPlanner = () => {
  const [contacts, setContacts] = useState(5000);
  const [tier, setTier] = useState(1000);
  const [rate, setRate] = useState(1.09);

  const n = Math.max(0, contacts || 0);
  const perDay = Math.min(n, tier);
  const days = tier > 0 ? Math.ceil(n / tier) : 0;
  const totalCost = n * rate;
  const dailyCost = perDay * rate;

  return (
    <div className="al-wrap">
      <div className="al-eyebrow">AllianceOS · Screen 8 · Live Calculator</div>
      <div className="al-page-title">Bulk WhatsApp campaign planner</div>
      <p className="al-page-desc">
        Before you upload a list, see what it costs and how long it takes at your current tier. Change the numbers — it updates live.
      </p>

      <div className="al-calc">
        {/* ── Inputs ── */}
        <div className="al-calc-in">
          <div className="fl">How many contacts?</div>
          <input
            className="al-numin"
            type="number"
            value={contacts}
            min={0}
            onChange={(e) => setContacts(parseInt(e.target.value, 10) || 0)}
          />

          <div className="fl">Your messaging tier (per 24h)</div>
          <div className="al-segrow">
            {TIERS.map(t => (
              <div
                key={t.value}
                className={`al-seg${tier === t.value ? ' on' : ''}`}
                onClick={() => setTier(t.value)}
              >
                {t.label}
                <small>{t.sub}</small>
              </div>
            ))}
          </div>

          <div className="fl">Message type</div>
          <div className="al-segrow">
            {TYPES.map(t => (
              <div
                key={t.rate}
                className={`al-seg${rate === t.rate ? ' on' : ''}`}
                onClick={() => setRate(t.rate)}
              >
                {t.label}
                <small>{t.sub}</small>
              </div>
            ))}
          </div>
        </div>

        {/* ── Outputs ── */}
        <div className="al-calc-out">
          <div className="al-ocard">
            <div className="ol">First-touch cost</div>
            <div className="ov">{inr(totalCost)}</div>
            <div className="osub">{n.toLocaleString('en-IN')} contacts × ₹{rate}</div>
          </div>
          <div className="al-ocard blue">
            <div className="ol">Days to finish the list</div>
            <div className="ov">{days} <small>{days === 1 ? 'day' : 'days'}</small></div>
            <div className="osub">at {tier.toLocaleString('en-IN')}/day — sends spread automatically</div>
          </div>
          <div className="al-ocard green">
            <div className="ol">Cost per day</div>
            <div className="ov">{inr(dailyCost)}</div>
            <div className="osub">{perDay.toLocaleString('en-IN')} sends/day × ₹{rate}</div>
          </div>
        </div>

        {/* ── Note ── */}
        <div className="al-calcnote" style={{ gridColumn: '1 / -1' }}>
          💡 <b>Replies are free.</b> Once someone replies, a 24-hour window opens and every message inside it costs nothing —
          you only pay for the first template touch. Follow-ups to non-repliers are new template sends, so budget those separately.
        </div>
      </div>

      {/* Tier explanation */}
      <div style={{ marginTop: 24, background: 'var(--al-panel2)', border: '1px solid var(--al-line)', borderRadius: 12, padding: 20 }}>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--al-ink)', marginBottom: 14 }}>
          Tier &amp; limits — 2026 rules
        </p>
        {[
          { label: 'Daily reach', value: '250 unverified → 1,000 verified → 10K → 100K → unlimited, gated by quality' },
          { label: 'Shared number pool', value: 'Since Oct 2025 all numbers in one Business Portfolio share the daily limit. Extra numbers add safety, not volume.' },
          { label: 'Frequency cap', value: 'A user can receive ~2 marketing messages/day across all brands. Over that, your message is silently blocked (error 131049).' },
          { label: 'Cost (India)', value: 'Marketing ₹1.09/msg · Utility ₹0.145/msg · Service replies = free.' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '9px 0', borderTop: i > 0 ? '1px solid var(--al-line)' : 'none', fontSize: 12.5 }}>
            <span style={{ minWidth: 150, color: 'var(--al-gold2)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>{row.label}</span>
            <span style={{ color: 'var(--al-muted)' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
