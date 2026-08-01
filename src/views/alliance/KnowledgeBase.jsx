import React, { useState } from 'react';
import './alliance.css';

const KB_CARDS = [
  {
    chipCls: 'ac', chipLabel: 'A', brand: 'BM Academy', audience: 'Audience: College',
    facts: ['1400+ trained, 150+ placed, 4.8★ Google', 'Training + placement MoU for colleges', '20% fee refund if not placed (Tier 2)'],
    synced: 'Synced from LeadOS AI Brain · 6:00 AM',
  },
  {
    chipCls: 'tx', chipLabel: 'T', brand: 'BM TechX', audience: 'Audience: SMB',
    facts: ['750+ businesses served', 'Reels + local ads from ₹8,999/mo', 'Meta ads + WhatsApp lead systems'],
    synced: 'Synced from LeadOS AI Brain · 6:00 AM',
  },
  {
    chipCls: 'ct', chipLabel: 'C', brand: 'CoreTalents', audience: 'Audience: HR',
    facts: ['Pay-on-join placement model', 'Trained, screened candidates ready', 'Tamil Nadu & Pondicherry supply'],
    synced: 'Synced from LeadOS AI Brain · 6:00 AM',
  },
];

const OBJECTIONS = [
  {
    q: 'Too costly, we don\'t have budget right now.',
    a: '"Understood — that\'s why we start with one project at ₹8,999/mo, no long lock-in. You see the leads first, then decide on scaling."',
    meta: 'Audience: SMB · used 14 times · approved by Kamar',
  },
  {
    q: 'We already have a placement/training partner.',
    a: '"Great — many colleges run us alongside their existing partner for the digital-skills tracks specifically. Shall I share what we cover that\'s different?"',
    meta: 'Audience: College · used 8 times · approved by Kamar',
  },
];

export const KnowledgeBase = () => {
  const [tab, setTab] = useState('facts');

  return (
    <div className="al-wrap">
      <div className="al-eyebrow">AllianceOS · Screen 5 · The Brain</div>
      <div className="al-page-title">AI Brain</div>
      <p className="al-page-desc">
        The facts and answers the AI is allowed to use. Change a price or proof point here once — every message and reply updates.
        <strong style={{ color: 'var(--al-gold2)' }}> Nothing is hardcoded.</strong>
      </p>

      <div className="al-kbtabs">
        {[['facts', 'Brand facts'], ['objections', 'Objection answers'], ['proof', 'Proof & testimonials']].map(([k, l]) => (
          <span key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</span>
        ))}
      </div>

      {tab === 'facts' && (
        <div className="al-kbcards">
          {KB_CARDS.map(c => (
            <div className="al-kbcard" key={c.brand}>
              <div className="al-kbcard-head">
                <div className={`al-brandchip ${c.chipCls}`}>{c.chipLabel}</div>
                <div>
                  <b>{c.brand}</b>
                  <small>{c.audience}</small>
                </div>
              </div>
              {c.facts.map((f, i) => (
                <div className="al-fact" key={i}>
                  <span className="ck">✓</span>
                  {f}
                </div>
              ))}
              <div className="al-synced">
                <span className="dg" />
                {c.synced}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'objections' && (
        <>
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--al-ink)', margin: '4px 0 14px' }}>
            Objection → approved answer
          </p>
          {OBJECTIONS.map((o, i) => (
            <div className="al-obj" key={i}>
              <div className="al-obj-q"><span className="qm">"</span>{o.q}</div>
              <div className="al-obj-a">{o.a}</div>
              <div className="al-obj-meta">{o.meta}</div>
            </div>
          ))}
          <button className="al-btn" style={{ marginTop: 8 }}>+ Add objection answer</button>
        </>
      )}

      {tab === 'proof' && (
        <div style={{ color: 'var(--al-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
          Proof &amp; testimonials — coming soon
        </div>
      )}
    </div>
  );
};
