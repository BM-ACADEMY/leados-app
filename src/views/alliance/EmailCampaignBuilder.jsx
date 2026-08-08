import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Bot, CalendarClock, Check, ChevronLeft, ChevronRight, FileText, Filter, Info, Mail, Search, Send, Sparkles, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import './alliance.css';

const EMPTY_FILTERS = { search: '', audience: '', industry: '', status: '', source: '', location: '' };
const normalizeLineBreaks = (value = '') => String(value).replace(/\\r\\n|\\n|\\r/g, '\n');
const STEPS = [
  { id: 1, label: 'Campaign details', icon: FileText },
  { id: 2, label: 'Audience', icon: Users },
  { id: 3, label: 'Email content', icon: Mail },
  { id: 4, label: 'Schedule', icon: CalendarClock },
  { id: 5, label: 'Review', icon: Check },
];

export const EmailCampaignBuilder = () => {
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState({ audiences: [], industries: [], statuses: [], sources: [], locations: [], senders: [] });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [prospects, setProspects] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [activeTouch, setActiveTouch] = useState(0);
  const [brand, setBrand] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);
  const [form, setForm] = useState({ name: '', objective: '', sender_domain_id: '' });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const limit = 10;

  useEffect(() => {
    api.getAllianceCampaignBuilderOptions().then((data) => {
      setOptions(data);
      if (data.senders?.length === 1) setForm((current) => ({ ...current, sender_domain_id: String(data.senders[0].id) }));
    }).catch((error) => toast.error(error.message));
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadActiveCampaigns = async () => {
      try {
        const data = await api.getAllianceCampaigns();
        if (mounted) setActiveCampaigns((data.campaigns || []).filter((campaign) => ['running', 'paused'].includes(campaign.status)));
      } catch {
        // Campaign creation remains available if the monitoring request fails.
      }
    };
    loadActiveCampaigns();
    const interval = window.setInterval(loadActiveCampaigns, 10000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  const loadProspects = useCallback(async () => {
    if (!filters.audience) { setProspects([]); setTotal(0); return; }
    setLoading(true);
    try {
      const data = await api.getAllianceCampaignProspects({ ...filters, limit, offset: (page - 1) * limit });
      setProspects(data.prospects || []);
      setTotal(data.total || 0);
    } catch (error) { toast.error(error.message || 'Failed to load leads'); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { loadProspects(); }, [loadProspects]);
  useEffect(() => {
    if (!filters.audience) { setTemplates([]); setBrand(''); return; }
    api.getAllianceCampaignTemplates(filters.audience).then((data) => {
      setTemplates((data.templates || []).map((template) => ({ ...template, body: normalizeLineBreaks(template.body) })));
      setBrand(data.audience?.brand || '');
      setAiGenerated(false);
      setActiveTouch(0);
    }).catch((error) => toast.error(error.message));
  }, [filters.audience]);

  const selected = useMemo(() => new Set(Object.keys(selectedLeads)), [selectedLeads]);
  const sender = options.senders?.find((item) => String(item.id) === String(form.sender_domain_id));
  const audience = options.audiences?.find((item) => item.code === filters.audience);
  const previewLead = Object.values(selectedLeads)[0] || prospects[0] || { name: 'Dr. Charles', business_name: 'Example Organisation', location: 'Pondicherry' };
  const pages = Math.max(1, Math.ceil(total / limit));
  const allPageSelected = prospects.length > 0 && prospects.every((lead) => selected.has(String(lead.id)));
  const dailyCapacity = Math.max(1, Number(sender?.daily_cap || 20) - Number(sender?.sent_today || 0));
  const deliveryDays = selected.size ? Math.ceil(selected.size / dailyCapacity) : 0;
  const lastTouchDay = templates.length ? Math.max(...templates.map((item) => Number(item.delay_days || 0))) : 0;

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    if (key === 'audience') setSelectedLeads({});
  };
  const toggleOne = (lead) => setSelectedLeads((current) => {
    const next = { ...current };
    const leadId = String(lead.id);
    if (next[leadId]) delete next[leadId]; else next[leadId] = lead;
    return next;
  });
  const togglePage = () => setSelectedLeads((current) => {
    const next = { ...current };
    prospects.forEach((lead) => {
      const leadId = String(lead.id);
      if (allPageSelected) delete next[leadId]; else next[leadId] = lead;
    });
    return next;
  });
  const selectAllMatching = async () => {
    setBusy('select');
    try {
      const data = await api.getAllianceCampaignProspects({ ...filters, limit: 5000, offset: 0 });
      setSelectedLeads(Object.fromEntries((data.prospects || []).map((lead) => [lead.id, lead])));
      if (data.total > 5000) toast(`Selected the first 5,000 of ${data.total} matching leads.`);
    } catch (error) { toast.error(error.message); }
    finally { setBusy(''); }
  };
  const suggestWithAI = async () => {
    const requestedTouchIndex = activeTouch;
    setBusy('ai');
    try {
      const data = await api.suggestAllianceCampaignTemplates({ audience: filters.audience, objective: form.objective });
      const generatedTemplates = data.templates || [];
      const currentTouchNo = templates[requestedTouchIndex]?.touch_no;
      const generatedTouch = generatedTemplates.find((template) => String(template.touch_no) === String(currentTouchNo))
        || generatedTemplates[requestedTouchIndex];
      if (!generatedTouch) throw new Error(`AI did not return content for Touch ${requestedTouchIndex + 1}.`);
      setTemplates((current) => current.map((template, index) => index === requestedTouchIndex
        ? { ...template, ...generatedTouch, body: normalizeLineBreaks(generatedTouch.body) }
        : template));
      setAiGenerated(Boolean(data.ai_generated));
      data.warning ? toast(data.warning) : toast.success(`AI content applied to Touch ${requestedTouchIndex + 1}`);
    } catch (error) { toast.error(error.message || 'AI suggestion failed'); }
    finally { setBusy(''); }
  };
  const updateTemplate = (index, key, value) => setTemplates((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const insertVariable = (variable) => {
    const textarea = editorRef.current;
    const body = templates[activeTouch]?.body || '';
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
    updateTemplate(activeTouch, 'body', `${body.slice(0, start)}${variable}${body.slice(end)}`);
    requestAnimationFrame(() => { textarea?.focus(); textarea?.setSelectionRange(start + variable.length, start + variable.length); });
  };
  const personalize = (value = '') => value
    .replaceAll('{{name}}', previewLead.name || 'there')
    .replaceAll('{{org}}', previewLead.business_name || 'your organisation')
    .replaceAll('{{location}}', previewLead.location || 'your city');

  const validateStep = (targetStep) => {
    if (targetStep > 1 && !form.name.trim()) return 'Enter a campaign name.';
    if (targetStep > 1 && !form.sender_domain_id) return 'Select an active Zoho sender.';
    if (targetStep > 2 && !filters.audience) return 'Select an audience.';
    if (targetStep > 2 && !selected.size) return 'Select at least one recipient.';
    if (targetStep > 3 && (templates.length !== 4 || templates.some((item) => !item.subject?.trim() || !item.body?.trim()))) return 'Complete all four email touches.';
    if (targetStep > 4 && Number(templates[0]?.delay_days || 0) !== 0) return 'The first email must be scheduled for day 0.';
    if (targetStep > 4 && templates.some((item, index) => index > 0 && Number(item.delay_days) <= Number(templates[index - 1].delay_days))) return 'Each follow-up must be scheduled after the previous email.';
    return '';
  };
  const goTo = (target) => {
    if (target > step) { const error = validateStep(target); if (error) return toast.error(error); }
    setStep(target); window.requestAnimationFrame(() => document.querySelector('.al-wrap')?.scrollTo({ top: 0, behavior: 'smooth' }));
  };
  const createCampaign = async () => {
    const error = validateStep(5); if (error) return toast.error(error);
    setBusy('create');
    try {
      const result = await api.createAllianceEmailCampaign({ ...form, audience: filters.audience, sender_domain_id: Number(form.sender_domain_id), prospect_ids: Object.values(selectedLeads).map((lead) => lead.id), templates, ai_generated: aiGenerated });
      toast.success(result.message);
      navigate('/alliance/planner');
    } catch (requestError) { toast.error(requestError.message || 'Failed to create campaign'); }
    finally { setBusy(''); }
  };

  const activeTemplate = templates[activeTouch] || {};
  return (
    <div className="al-wrap al-campaign-builder">
      <div className="al-cb-header">
        <div><div className="al-eyebrow">AllianceOS · Campaign studio</div><div className="al-page-title">Create email campaign</div><p className="al-page-desc">Build a targeted, personalized sequence and review every detail before launch.</p></div>
        <button className="al-btn ghost" onClick={() => navigate('/alliance/planner')}><ArrowLeft size={16} /> View Campaign Planner</button>
      </div>

      <section className="al-cb-active-campaigns" aria-label="Active campaigns">
        <div className="al-cb-active-head"><div><b>Active campaigns</b><span>Live campaign activity refreshes every 10 seconds.</span></div><button className="al-link" onClick={() => navigate('/alliance/planner')}>View full details</button></div>
        {activeCampaigns.length ? <div className="al-cb-active-list">{activeCampaigns.map((campaign) => (
          <button key={campaign.id} type="button" onClick={() => navigate('/alliance/planner')}>
            <span><b>{campaign.name}</b><small>{campaign.audience} · {campaign.status}</small></span>
            <span><small>Recipients</small><b>{campaign.prospects || 0}</b></span>
            <span><small>Sent</small><b>{campaign.sent || 0}</b></span>
            <span><small>Replies</small><b>{campaign.replied || 0}</b></span>
            <ArrowRight size={16} />
          </button>
        ))}</div> : <div className="al-cb-active-empty">No running or paused campaigns.</div>}
      </section>

      <nav className="al-cb-steps" aria-label="Campaign creation progress">
        {STEPS.map((item) => { const Icon = item.icon; const done = step > item.id; return <button key={item.id} className={`al-cb-step ${step === item.id ? 'active' : ''} ${done ? 'done' : ''}`} onClick={() => item.id <= step && goTo(item.id)}><span>{done ? <Check size={16} /> : <Icon size={16} />}</span><div><small>Step {item.id}</small><b>{item.label}</b></div></button>; })}
      </nav>

      <div className="al-cb-layout">
        <main className="al-cb-main">
          {step === 1 && <section className="al-cb-card">
            <div className="al-cb-section-head"><span className="al-cb-icon"><FileText size={20} /></span><div><h2>Campaign details</h2><p>Give your campaign a clear internal identity and purpose.</p></div></div>
            <div className="al-cb-grid two"><div className="al-field"><label>Campaign name <b>*</b></label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="August college partnerships" maxLength={255} /><small className="al-help">Visible internally in Campaign Planner.</small></div><div className="al-field"><label>Zoho sender <b>*</b> <Info size={12} title="The authenticated mailbox used to send this campaign." /></label><select value={form.sender_domain_id} onChange={(e) => setForm({ ...form, sender_domain_id: e.target.value })}><option value="">Select active sender</option>{options.senders?.map((item) => <option key={item.id} value={item.id}>{item.inbox_email} · {item.sent_today}/{item.daily_cap} today</option>)}</select><small className="al-help">Credentials remain securely on the server.</small></div></div>
            <div className="al-field"><label>Campaign objective <span>Optional</span></label><textarea className="al-cb-objective" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Example: Start conversations with college placement officers about training partnerships." /><small className="al-help">Used by AI to recommend relevant messaging and calls to action.</small></div>
          </section>}

          {step === 2 && <section className="al-cb-card">
            <div className="al-cb-section-head"><span className="al-cb-icon"><Users size={20} /></span><div><h2>Select your audience</h2><p>Filter existing Alliance leads, then choose exactly who should receive this campaign.</p></div></div>
            <div className="al-cb-grid three"><div className="al-field"><label>Audience <b>*</b></label><select value={filters.audience} onChange={(e) => updateFilter('audience', e.target.value)}><option value="">Select audience</option>{options.audiences?.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></div><div className="al-field"><label>Brand</label><input value={brand} readOnly placeholder="Assigned automatically" /></div><div className="al-field"><label>Search leads</label><div className="al-input-icon"><Search size={15} /><input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Name, company, or email" /></div></div></div>
            <div className="al-cb-filterbar"><Filter size={16} /><select value={filters.industry} onChange={(e) => updateFilter('industry', e.target.value)}><option value="">All industries</option>{options.industries?.map((v) => <option key={v}>{v}</option>)}</select><select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}><option value="">All statuses</option>{options.statuses?.map((v) => <option key={v}>{v}</option>)}</select><select value={filters.source} onChange={(e) => updateFilter('source', e.target.value)}><option value="">All sources</option>{options.sources?.map((v) => <option key={v}>{v}</option>)}</select><select value={filters.location} onChange={(e) => updateFilter('location', e.target.value)}><option value="">All locations</option>{options.locations?.map((v) => <option key={v}>{v}</option>)}</select></div>
            <div className="al-cb-selection"><b>{selected.size} selected</b><span>{total} matching eligible leads</span><button className="al-btn ghost sm" disabled={!filters.audience || busy === 'select'} onClick={selectAllMatching}>Select all matching</button><button className="al-link" disabled={!selected.size} onClick={() => setSelectedLeads({})}>Clear selection</button></div>
            <div className="al-cb-table"><table className="al-table"><thead><tr><th><input type="checkbox" checked={allPageSelected} onChange={togglePage} /></th><th>Contact</th><th>Email</th><th>Industry / location</th><th>Status</th></tr></thead><tbody>{loading ? <tr><td colSpan="5" className="al-empty">Loading leads…</td></tr> : prospects.map((lead) => <tr key={lead.id} className={selected.has(String(lead.id)) ? 'selected' : ''}><td><input type="checkbox" checked={selected.has(String(lead.id))} onChange={() => toggleOne(lead)} /></td><td><b>{lead.business_name}</b><small>{lead.name || 'No contact name'}</small></td><td>{lead.email}</td><td>{lead.industry || '—'}<small>{lead.location || '—'}</small></td><td><span className="al-cb-status">{lead.status}</span></td></tr>)}{!loading && !prospects.length && <tr><td colSpan="5" className="al-empty">{filters.audience ? 'No eligible leads match these filters.' : 'Select an audience to load leads.'}</td></tr>}</tbody></table></div>
            <div className="al-cb-pagination"><span>Page {page} of {pages}</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button><button disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></div>
          </section>}

          {step === 3 && <section className="al-cb-card">
            <div className="al-cb-section-head"><span className="al-cb-icon"><Mail size={20} /></span><div><h2>Email content</h2><p>Review each touch and see exactly how it will look for a selected recipient.</p></div><button className="al-btn ai" disabled={!filters.audience || busy === 'ai'} onClick={suggestWithAI}><Sparkles size={16} />{busy === 'ai' ? 'Generating…' : 'Suggest with AI'}</button></div>
            <div className="al-cb-touch-tabs">{templates.map((item, index) => <button key={item.touch_no || index} className={activeTouch === index ? 'active' : ''} onClick={() => setActiveTouch(index)}><span>{index + 1}</span><div><b>Touch {index + 1}</b><small>Day {item.delay_days || 0}</small></div>{item.subject?.trim() && item.body?.trim() && <Check size={14} />}</button>)}</div>
            {!templates.length ? <div className="al-empty">Select an audience to load its approved email sequence.</div> : <div className="al-cb-editor-grid"><div className="al-cb-editor"><div className="al-field"><label>Subject <b>*</b></label><input value={activeTemplate.subject || ''} onChange={(e) => updateTemplate(activeTouch, 'subject', e.target.value)} /><small className="al-help">{(activeTemplate.subject || '').length}/120 characters</small></div><div className="al-field"><label>Email body <b>*</b></label><div className="al-editor-toolbar"><span>Personalize:</span>{['{{name}}', '{{org}}', '{{location}}'].map((token) => <button key={token} title={`Insert ${token}`} onClick={() => insertVariable(token)}>{token.replace(/[{}]/g, '')}</button>)}</div><textarea ref={editorRef} className="al-cb-editor-area" value={activeTemplate.body || ''} onChange={(e) => updateTemplate(activeTouch, 'body', e.target.value)} /><div className="al-editor-foot"><span>{(activeTemplate.body || '').trim().split(/\s+/).filter(Boolean).length} words</span><span>{aiGenerated && <><Bot size={13} /> AI generated—review required</>}</span></div></div></div><div className="al-email-preview"><div className="al-preview-top"><div><span>AB</span><div><b>{brand || 'Alliance OS'}</b><small>{sender?.inbox_email || 'sender@example.com'}</small></div></div><span>Live preview</span></div><div className="al-preview-subject">{personalize(activeTemplate.subject) || 'Your email subject'}</div><div className="al-preview-to">To: {previewLead.name || previewLead.business_name} &lt;{previewLead.email || 'recipient@example.com'}&gt;</div><div className="al-preview-body">{personalize(activeTemplate.body) || 'Start writing to preview your email here.'}</div></div></div>}
          </section>}

          {step === 4 && <section className="al-cb-card">
            <div className="al-cb-section-head"><span className="al-cb-icon"><CalendarClock size={20} /></span><div><h2>Sequence schedule</h2><p>Control when each follow-up becomes eligible to send after campaign launch.</p></div></div>
            <div className="al-cb-timeline">{templates.map((item, index) => <div className="al-cb-time" key={item.touch_no || index}><div className="al-time-line"><span>{index + 1}</span>{index < templates.length - 1 && <i />}</div><div><b>Touch {index + 1}</b><p>{item.purpose || item.subject}</p></div><div className="al-field"><label>Send on day</label><input type="number" min="0" max="30" value={item.delay_days ?? 0} onChange={(e) => updateTemplate(index, 'delay_days', Number(e.target.value))} /></div></div>)}</div>
            <div className="al-note success"><Info size={18} /><div><b>Safe scheduling:</b> Campaign creation produces a draft only. Use Campaign Planner to send a test email, run readiness checks, and start delivery. Replies, unsubscribe requests, and closed lead statuses stop future touches automatically.</div></div>
          </section>}

          {step === 5 && <section className="al-cb-card">
            <div className="al-cb-section-head"><span className="al-cb-icon"><Check size={20} /></span><div><h2>Review campaign</h2><p>Confirm the audience, content, and delivery plan before creating the draft.</p></div></div>
            <div className="al-review-list"><div><FileText size={17} /><span><small>Campaign</small><b>{form.name}</b></span><button onClick={() => goTo(1)}>Edit</button></div><div><Users size={17} /><span><small>Audience</small><b>{audience?.label} · {selected.size} recipients</b></span><button onClick={() => goTo(2)}>Edit</button></div><div><Mail size={17} /><span><small>Content</small><b>4-touch {aiGenerated ? 'AI-assisted' : 'approved template'} sequence</b></span><button onClick={() => goTo(3)}>Edit</button></div><div><CalendarClock size={17} /><span><small>Timeline</small><b>Day 0 through day {lastTouchDay}</b></span><button onClick={() => goTo(4)}>Edit</button></div></div>
            <div className="al-launch-note"><Send size={20} /><div><b>Next: test and launch safely</b><p>After creating this draft, Campaign Planner lets you send a test to your own address, verify readiness, and then start the real campaign.</p></div></div>
          </section>}

          <footer className="al-cb-actions"><button className="al-btn ghost" disabled={step === 1} onClick={() => goTo(step - 1)}><ArrowLeft size={16} /> Back</button><span>Step {step} of {STEPS.length}</span>{step < 5 ? <button className="al-btn" onClick={() => goTo(step + 1)}>Continue <ArrowRight size={16} /></button> : <button className="al-btn" disabled={busy === 'create'} onClick={createCampaign}><Check size={16} />{busy === 'create' ? 'Creating…' : 'Create draft & continue'}</button>}</footer>
        </main>

        <aside className="al-cb-summary">
          <div className="al-cb-summary-head"><Sparkles size={17} /><b>Campaign summary</b></div>
          <div className="al-cb-metric"><span>Recipients</span><b>{selected.size.toLocaleString()}</b></div><div className="al-cb-metric"><span>Audience</span><b>{audience?.label || 'Not selected'}</b></div><div className="al-cb-metric"><span>Sender</span><b>{sender?.inbox_email || 'Not selected'}</b></div><div className="al-cb-metric"><span>Sequence</span><b>{templates.length || 0} emails · {lastTouchDay} days</b></div>
          <div className="al-cb-estimate"><CalendarClock size={18} /><div><small>Estimated first-touch delivery</small><b>{selected.size ? `${deliveryDays} day${deliveryDays === 1 ? '' : 's'}` : '—'}</b><p>Based on {dailyCapacity} remaining sends/day.</p></div></div>
          <div className="al-cb-checks"><b>Readiness</b><p className={form.name ? 'ok' : ''}><span>{form.name ? '✓' : '·'}</span> Campaign details</p><p className={selected.size ? 'ok' : ''}><span>{selected.size ? '✓' : '·'}</span> Recipients selected</p><p className={templates.length === 4 && templates.every((t) => t.subject && t.body) ? 'ok' : ''}><span>{templates.length === 4 && templates.every((t) => t.subject && t.body) ? '✓' : '·'}</span> Email content reviewed</p><p className={form.sender_domain_id ? 'ok' : ''}><span>{form.sender_domain_id ? '✓' : '·'}</span> Active sender</p></div>
        </aside>
      </div>
    </div>
  );
};
