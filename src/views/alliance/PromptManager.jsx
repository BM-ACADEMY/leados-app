import React from 'react';
import './alliance.css';

const PROMPTS = [
  {
    job: 'JOB 1', title: 'Personalise message · WhatsApp',
    body: <>You write B2B WhatsApp outreach for ABM Groups. Tone: <span className="hl">warm Tanglish</span> for local SMBs. Max <span className="hl">45 words</span>. One clear CTA. No hype. Use <span className="hl">only</span> facts from the Knowledge Base.</>,
  },
  {
    job: 'JOB 1', title: 'Personalise message · Email',
    body: <>You write B2B cold email outreach for ABM Groups. Tone: <span className="hl">formal, respectful</span> for college principals / HR managers. Max <span className="hl">60 words</span>. One clear CTA. No hype. Use <span className="hl">only</span> facts from the Knowledge Base.</>,
  },
  {
    job: 'JOB 2', title: 'Classify reply intent',
    body: <>Classify the reply into exactly one: <span className="hl">interested · question · objection · not_interested · ooo · other</span>. Return only a JSON object with key "intent".</>,
  },
  {
    job: 'JOB 3', title: 'Draft reply for approval',
    body: <>Draft a short reply for <span className="hl">human approval — never auto-send</span>. Max 50 words. If the reply matches an objection, use the <span className="hl">approved answer</span> from the Knowledge Base. Move toward a call.</>,
  },
  {
    job: 'JOB 4', title: 'Score lead warmth',
    body: <>Given the full conversation thread and prospect data, return a warmth score <span className="hl">0–100</span> as JSON: {"{"} "score": number, "reason": string {"}"}. 80+ = hot, 50-79 = warm, below 50 = cold.</>,
  },
];

export const PromptManager = () => {
  return (
    <div className="al-wrap">
      <div className="al-eyebrow">AllianceOS · Screen 6</div>
      <div className="al-page-title">Prompts</div>
      <p className="al-page-desc">
        The tone and rules for each AI job — editable here, no code needed.
        Change how the AI sounds without touching a workflow.
      </p>

      {PROMPTS.map((p, i) => (
        <div className="al-promptcard" key={i}>
          <div className="al-promptcard-head">
            <span className="al-jobtag">{p.job}</span>
            <b>{p.title}</b>
            <span className="ed">Edit</span>
          </div>
          <div className="al-promptbox">{p.body}</div>
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        <button className="al-btn ghost sm">+ Add custom prompt</button>
      </div>

      <div className="al-note" style={{ marginTop: 24 }}>
        ⚠️
        <div>
          <b>Golden rule:</b> The AI never auto-sends a reply. It only drafts.
          Every reply is approved (or edited) by a human in the LeadOS inbox before it goes out.
          This protects tone and keeps us compliant.
        </div>
      </div>
    </div>
  );
};
