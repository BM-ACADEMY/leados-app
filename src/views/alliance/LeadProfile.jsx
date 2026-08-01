import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import './alliance.css';

const MOCK_REPLIES = [
  {
    id: 1, initials: 'M', name: 'Dr. Meena Clinic', meta: 'WhatsApp · Villupuram · 6 min ago',
    intent: 'int', intentLabel: 'Interested',
    quote: '"Sounds useful. What\'s the cost for the ads + reels package? Can you call me tomorrow after 4pm?"',
    draft: '"Thank you Doctor! Happy to call tomorrow after 4. Our clinic package starts at ₹8,999/mo for reels + local ads. I\'ll share 2 sample reels on WhatsApp before the call — what number is best?"',
    extra: null,
  },
  {
    id: 2, initials: 'S', name: 'SKP Engineering College', meta: 'Email · TPO office · 22 min ago',
    intent: 'q', intentLabel: 'Question',
    quote: '"Interested in the placement MoU. Could you send the partnership document and details of past college tie-ups?"',
    draft: '"Thank you for your interest. I\'ve attached our MoU and a summary of college partnerships. Shall we set a 15-min call this week to walk through it?"',
    extra: 'View MoU.pdf',
  },
];

export const LeadProfile = () => {
  const [replies, setReplies] = useState(MOCK_REPLIES);
  const [sending, setSending] = useState(null);

  const handleApprove = async (reply) => {
    setSending(reply.id);
    try {
      await api.approveAllianceReply?.(reply.id, reply.draft);
      setReplies(r => r.filter(x => x.id !== reply.id));
    } catch (_) {
      setTimeout(() => setReplies(r => r.filter(x => x.id !== reply.id)), 600);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="al-wrap">
      <div className="al-eyebrow">AllianceOS · Screen 4 · The Money Loop</div>
      <div className="al-page-title">Replies</div>
      <p className="al-page-desc">
        Every reply lands here with the AI's read on intent and a draft response.
        You approve, edit, or send — <strong style={{ color: 'var(--al-gold2)' }}>the AI never sends on its own.</strong>
      </p>

      {replies.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--al-muted)', fontSize: 14 }}>
          ✓ All replies handled — check back soon.
        </div>
      )}

      {replies.map(reply => (
        <div className="al-reply" key={reply.id}>
          <div className="al-reply-head">
            <div className="al-av">{reply.initials}</div>
            <div className="al-reply-meta">
              <b>{reply.name}</b>
              <small>{reply.meta}</small>
            </div>
            <span className={`al-intent ${reply.intent}`}>{reply.intentLabel}</span>
          </div>
          <div className="al-quote">{reply.quote}</div>
          <div className="al-aidraft">
            <div className="al-aidraft-label">✦ AI-drafted reply — review before sending</div>
            <p>{reply.draft}</p>
          </div>
          <div className="al-ractions">
            <button
              className="al-btn sm"
              onClick={() => handleApprove(reply)}
              disabled={sending === reply.id}
            >
              {sending === reply.id ? 'Sending…' : 'Approve & send'}
            </button>
            <button className="al-btn ghost sm">Edit</button>
            <button className="al-btn ghost sm">Open in LeadOS</button>
            {reply.extra && <button className="al-btn ghost sm">{reply.extra}</button>}
          </div>
        </div>
      ))}
    </div>
  );
};
