import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../services/api.js";
import "./alliance.css";

export const WhatsAppCampaignBuilder = () => {
  const [templates, setTemplates] = useState([]);
  const [audiences, setAudiences] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({
    name: "",
    template_id: "",
    audience: "",
    search: "",
    delivery_mode: "now",
    scheduled_at: "",
    test_phone: "",
    followup_template_id: "",
    followup_delay_minutes: 5760,
    followup_repeat_days: 4,
    max_followups: 0,
  });
  const [mapping, setMapping] = useState([]);
  const [followupMapping, setFollowupMapping] = useState([]);
  const [selected, setSelected] = useState({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState("");
  const [deletingCampaign, setDeletingCampaign] = useState(null);
  const limit = 10;
  useEffect(() => {
    Promise.all([
      api.getTemplates(),
      api.getAllianceCampaignBuilderOptions(),
      api.getAllianceWhatsAppCampaigns(),
    ])
      .then(([templateData, options, campaignData]) => {
        setTemplates(
          (templateData.templates || []).filter(
            (item) => String(item.status).toLowerCase() === "approved",
          ),
        );
        setAudiences(options.audiences || []);
        setCampaigns(campaignData.campaigns || []);
      })
      .catch((error) => toast.error(error.message));
  }, []);
  const loadProspects = useCallback(async () => {
    try {
      const data = await api.getAllianceWhatsAppProspects({
        audience: form.audience,
        search: form.search,
        limit,
        offset: (page - 1) * limit,
      });
      setProspects(data.prospects || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error(error.message);
    }
  }, [form.audience, form.search, page]);
  useEffect(() => {
    const timer = setTimeout(loadProspects, 200);
    return () => clearTimeout(timer);
  }, [loadProspects]);
  const template = templates.find(
    (item) => String(item.id) === String(form.template_id),
  );
  const variableCount = useMemo(
    () =>
      Math.max(
        0,
        ...[...String(template?.body || "").matchAll(/\{\{(\d+)\}\}/g)].map(
          (match) => Number(match[1]),
        ),
      ),
    [template],
  );
  const followupTemplate = templates.find(
    (item) => String(item.id) === String(form.followup_template_id),
  );
  const followupVariableCount = useMemo(
    () =>
      Math.max(
        0,
        ...[
          ...String(followupTemplate?.body || "").matchAll(/\{\{(\d+)\}\}/g),
        ].map((match) => Number(match[1])),
      ),
    [followupTemplate],
  );
  useEffect(() => {
    setMapping(
      Array.from(
        { length: variableCount },
        (_, index) => ["name", "business_name", "location"][index] || "name",
      ),
    );
  }, [variableCount]);
  useEffect(() => {
    setFollowupMapping(
      Array.from(
        { length: followupVariableCount },
        (_, index) => ["name", "business_name", "location"][index] || "name",
      ),
    );
  }, [followupVariableCount]);
  const selectedIds = Object.keys(selected).map(Number);
  const previewLead = Object.values(selected)[0] ||
    prospects[0] || {
    name: "Sample Contact",
    business_name: "Example Organisation",
    location: "Pondicherry",
  };
  const valueFor = (field) => previewLead[field] || "—";
  const preview = mapping.reduce(
    (body, field, index) =>
      body.replaceAll(`{{${index + 1}}}`, valueFor(field)),
    template?.body || "Select an approved template to preview it.",
  );
  const toggle = (lead) =>
    setSelected((current) => {
      const next = { ...current };
      if (next[lead.id]) delete next[lead.id];
      else next[lead.id] = lead;
      return next;
    });
  const selectAll = async () => {
    setBusy("select");
    try {
      const data = await api.getAllianceWhatsAppProspects({
        audience: form.audience,
        search: form.search,
        limit: 5000,
        offset: 0,
      });
      setSelected(
        Object.fromEntries(
          (data.prospects || []).map((lead) => [lead.id, lead]),
        ),
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };
  const test = async () => {
    if (!template || !form.test_phone)
      return toast.error(
        "Select a template and enter your test WhatsApp number",
      );
    setBusy("test");
    try {
      const result = await api.testAllianceWhatsAppCampaign({
        template_id: template.id,
        phone: form.test_phone,
        sample_values: mapping.map(valueFor),
      });
      toast.success(result.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };
  const create = async () => {
    if (!form.name.trim() || !template || !selectedIds.length)
      return toast.error(
        "Enter a name, choose an approved template, and select leads",
      );
    if (form.delivery_mode === "schedule" && !form.scheduled_at)
      return toast.error("Choose the date and time for the scheduled campaign");
    if (form.delivery_mode === "schedule" && new Date(form.scheduled_at).getTime() <= Date.now())
      return toast.error("Scheduled time must be in the future");
    setBusy("create");
    try {
      const result = await api.createAllianceWhatsAppCampaign({
        name: form.name,
        audience: form.audience,
        template_id: template.id,
        prospect_ids: selectedIds,
        parameter_mapping: mapping,
        followup_template_id: followupTemplate?.id || null,
        followup_parameter_mapping: followupMapping,
        followup_delay_minutes: Number(form.followup_delay_minutes),
        followup_repeat_days: Number(form.followup_repeat_days),
        max_followups: 0,
        scheduled_at: form.delivery_mode === "schedule" && form.scheduled_at
          ? new Date(form.scheduled_at).toISOString()
          : null,
      });
      toast.success(result.message);
      const data = await api.getAllianceWhatsAppCampaigns();
      setCampaigns(data.campaigns || []);
      setSelected({});
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };
  const pages = Math.max(1, Math.ceil(total / limit));
  const deleteCampaign = async () => {
    if (!deletingCampaign) return;
    setBusy(`delete-${deletingCampaign.id}`);
    try {
      const result = await api.deleteAllianceWhatsAppCampaign(deletingCampaign.id);
      setCampaigns((current) => current.filter((item) => item.id !== deletingCampaign.id));
      setDeletingCampaign(null);
      toast.success(result.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="al-wrap al-wa-builder">
      <div className="al-eyebrow">AllianceOS · WhatsApp bulk messaging</div>
      <div className="al-page-title">WhatsApp campaign builder</div>
      <p className="al-page-desc">
        Send Meta-approved templates only to Alliance prospects with recorded
        WhatsApp consent.
      </p>
      <div className="al-wa-safety">
        <ShieldCheck size={20} />
        <div>
          <b>Consent-safe sending</b>
          <span>
            Only leads with consent=true and a consent source are available.
            Replies, STOP, suppression, and closed lead statuses prevent
            sending.
          </span>
        </div>
      </div>
      <div className="al-wa-layout">
        <main>
          <section className="al-cb-card">
            <div className="al-cb-section-head">
              <span className="al-cb-icon">
                <MessageCircle size={20} />
              </span>
              <div>
                <h2 className="text-white">Campaign and registered template</h2>
                <p>
                  Templates below come directly from the same GET /api/templates
                  source used by the Templates page.
                </p>
              </div>
            </div>
            <div className="al-cb-grid two">
              <div className="al-field">
                <label>
                  Campaign name <b>*</b>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="August opted-in colleges"
                />
              </div>
              <div className="al-field">
                <label>
                  Approved WhatsApp template <b>*</b>
                </label>
                <select
                  value={form.template_id}
                  onChange={(e) =>
                    setForm({ ...form, template_id: e.target.value })
                  }
                >
                  <option value="">Select registered template</option>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.language} · {item.category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!templates.length && (
              <div className="al-note">
                <span>!</span>
                <div>
                  No approved templates are available. Sync or approve templates
                  from <b>/templates</b>.
                </div>
              </div>
            )}
            {template && (
              <div className="al-wa-template">
                <header>
                  <b>{template.name}</b>
                  <span>
                    {template.category} · {template.language} · approved
                  </span>
                </header>
                <div>{template.body}</div>
                {template.footer && <small>{template.footer}</small>}
              </div>
            )}
            {variableCount > 0 && (
              <div className="al-wa-map">
                <b>Template variable mapping</b>
                {mapping.map((field, index) => (
                  <label key={index}>
                    <span>{`{{${index + 1}}}`}</span>
                    <select
                      value={field}
                      onChange={(e) =>
                        setMapping((current) =>
                          current.map((value, i) =>
                            i === index ? e.target.value : value,
                          ),
                        )
                      }
                    >
                      <option value="name">Lead name</option>
                      <option value="business_name">Business name</option>
                      <option value="location">Location</option>
                    </select>
                    <em>{valueFor(field)}</em>
                  </label>
                ))}
              </div>
            )}
            <div className="al-wa-followup-config">
              <div>
                <b>n8n automated reminder</b>
                <small>Optional. Uses another approved template from the same Templates API.</small>
              </div>
              <div className="al-cb-grid two">
                <div className="al-field">
                  <label>Follow-up template</label>
                  <select value={form.followup_template_id} onChange={(e) => setForm({ ...form, followup_template_id: e.target.value })}>
                    <option value="">No automated reminder</option>
                    {templates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.language}</option>)}
                  </select>
                </div>
                <div className="al-field">
                  <label>First reminder after</label>
                  <select value={form.followup_delay_minutes} onChange={(e) => setForm({ ...form, followup_delay_minutes: e.target.value })} disabled={!followupTemplate}>
                    <option value="10">10 minutes (testing only)</option>
                    <option value="1440">1 day</option>
                    <option value="2880">2 days</option>
                    <option value="4320">3 days</option>
                    <option value="5760">4 days (recommended)</option>
                    <option value="7200">5 days</option>
                    <option value="10080">7 days</option>
                  </select>
                </div>
                <div className="al-field">
                  <label>Repeat while inactive</label>
                  <select value={form.followup_repeat_days} onChange={(e) => setForm({ ...form, followup_repeat_days: e.target.value })} disabled={!followupTemplate}>
                    <option value="1">Every 1 day</option>
                    <option value="2">Every 2 days</option>
                    <option value="3">Every 3 days</option>
                    <option value="4">Every 4 days (recommended)</option>
                    <option value="5">Every 5 days</option>
                    <option value="7">Every 7 days</option>
                  </select>
                </div>
              </div>
              {followupTemplate && <>
                <div className="al-wa-template"><header><b>{followupTemplate.name}</b><span>n8n reminder · approved</span></header><div>{followupTemplate.body}</div></div>
                {followupVariableCount > 0 && <div className="al-wa-map"><b>Follow-up variable mapping</b>{followupMapping.map((field, index) => <label key={index}><span>{`{{${index + 1}}}`}</span><select value={field} onChange={(e) => setFollowupMapping((current) => current.map((value, i) => i === index ? e.target.value : value))}><option value="name">Lead name</option><option value="business_name">Business name</option><option value="location">Location</option></select><em>{valueFor(field)}</em></label>)}</div>}
                <small className="al-help">The approved reminder repeats only while the lead is inactive. It stops automatically for Not Interested, Closed, Converted, Completed, Unsubscribed, or suppressed leads. A recipient reply pauses reminders; a later admin/AI reply starts a fresh inactivity timer.</small>
              </>}
            </div>
          </section>
          <section className="al-cb-card">
            <div className="al-cb-section-head">
              <span className="al-cb-icon">
                <Users size={20} />
              </span>
              <div>
                <h2 className="text-white">Select opted-in leads</h2>
                <p>Non-consented phone numbers are excluded by the server.</p>
              </div>
            </div>
            <div className="al-cb-grid two">
              <div className="al-field">
                <label>Audience</label>
                <select
                  value={form.audience}
                  onChange={(e) => {
                    setForm({ ...form, audience: e.target.value });
                    setPage(1);
                    setSelected({});
                  }}
                >
                  <option value="">All audiences</option>
                  {audiences.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="al-field">
                <label>Search</label>
                <div className="al-input-icon">
                  <Search size={15} />
                  <input
                    value={form.search}
                    onChange={(e) => {
                      setForm({ ...form, search: e.target.value });
                      setPage(1);
                    }}
                    placeholder="Name, business, or phone"
                  />
                </div>
              </div>
            </div>
            <div className="al-cb-selection">
              <b>{selectedIds.length} selected</b>
              <span>{total} WhatsApp-eligible leads</span>
              <button
                className="al-btn ghost sm"
                disabled={!total || busy === "select"}
                onClick={selectAll}
              >
                Select all eligible
              </button>
              <button className="al-link" onClick={() => setSelected({})}>
                Clear
              </button>
            </div>
            <div className="al-cb-table">
              <table className="al-table">
                <thead>
                  <tr>
                    <th />
                    <th>Lead</th>
                    <th>Phone</th>
                    <th>Audience</th>
                    <th>Consent source</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((lead) => (
                    <tr
                      key={lead.id}
                      className={selected[lead.id] ? "selected" : ""}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[lead.id])}
                          onChange={() => toggle(lead)}
                        />
                      </td>
                      <td>
                        <b>{lead.name || lead.business_name}</b>
                        <small>{lead.business_name}</small>
                      </td>
                      <td>{lead.phone}</td>
                      <td>{lead.audience}</td>
                      <td>{lead.consent_source}</td>
                    </tr>
                  ))}
                  {!prospects.length && (
                    <tr>
                      <td colSpan="5" className="al-empty">
                        No opted-in WhatsApp leads match this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="al-cb-pagination">
              <span>
                Page {page} of {pages}
              </span>
              <div>
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </main>
        <aside>
          <section className="al-wa-preview">
            <header>
              <MessageCircle size={17} />
              <b>Message preview</b>
            </header>
            <div className="al-wa-phone">
              <div className="al-wa-bubble">
                {preview}
                <small>
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ✓
                </small>
              </div>
            </div>
          </section>
          <section className="al-cb-summary">
            <div className="al-cb-summary-head">
              <CalendarClock size={17} />
              <b>Schedule and review</b>
            </div>
            <div className="al-field">
              <label>Delivery option</label>
              <div className="al-wa-delivery-options">
                <button
                  type="button"
                  className={form.delivery_mode === "now" ? "active" : ""}
                  onClick={() => setForm({ ...form, delivery_mode: "now", scheduled_at: "" })}
                >
                  <Send size={15} /> Send immediately
                </button>
                <button
                  type="button"
                  className={form.delivery_mode === "schedule" ? "active" : ""}
                  onClick={() => setForm({ ...form, delivery_mode: "schedule" })}
                >
                  <CalendarClock size={15} /> Schedule for later
                </button>
              </div>
              {form.delivery_mode === "schedule" && (
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              )}
              <small className="al-help">
                {form.delivery_mode === "now"
                  ? "Messages enter the rate-safe sending queue immediately."
                  : "Messages remain queued until the selected date and time."}
              </small>
            </div>
            <div className="al-cb-metric">
              <span>Recipients</span>
              <b>{selectedIds.length}</b>
            </div>
            <div className="al-cb-metric">
              <span>Template</span>
              <b>{template?.name || "Not selected"}</b>
            </div>
            <div className="al-field al-wa-test">
              <label>Test WhatsApp number</label>
              <input
                value={form.test_phone}
                onChange={(e) =>
                  setForm({ ...form, test_phone: e.target.value })
                }
                placeholder="919876543210"
              />
              <button
                className="al-btn ghost sm"
                disabled={busy === "test"}
                onClick={test}
              >
                <Send size={14} />
                {busy === "test" ? "Sending…" : "Send test"}
              </button>
            </div>
            <button
              className="al-btn al-wa-create"
              disabled={busy === "create"}
              onClick={create}
            >
              <Check size={16} />
              {busy === "create"
                ? form.delivery_mode === "now" ? "Starting…" : "Scheduling…"
                : form.delivery_mode === "now" ? "Review & send now" : "Review & schedule"}
            </button>
          </section>
        </aside>
      </div>
      {campaigns.length > 0 && (
        <section className="al-wa-recent">
          <h2 className="text-white" >Recent WhatsApp campaigns</h2>
          {campaigns.slice(0, 5).map((item) => (
            <div key={item.id}>
              <span>
                <b>{item.name}</b>
                <small>
                  {item.template_name} ·{" "}
                  {new Date(item.scheduled_at).toLocaleString()}
                </small>
              </span>
              <em>{item.status}</em>
              <span>
                {item.sent}/{item.recipients} sent
                <small>
                  {item.delivered || 0} delivered · {item.read || 0} read · {item.failed || 0} failed · {item.skipped || 0} skipped
                </small>
                {item.latest_error && <small className="al-wa-campaign-error">{item.latest_error}</small>}
              </span>
              <button
                type="button"
                className="al-wa-delete"
                title="Delete campaign"
                aria-label={`Delete ${item.name}`}
                onClick={() => setDeletingCampaign(item)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </section>
      )}
      {deletingCampaign && (
        <div className="al-wa-modal-backdrop" role="presentation" onMouseDown={() => setDeletingCampaign(null)}>
          <div className="al-wa-modal" role="dialog" aria-modal="true" aria-labelledby="delete-wa-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="al-wa-modal-icon"><Trash2 size={20} /></div>
            <h2 id="delete-wa-title">Delete WhatsApp campaign?</h2>
            <p><b>{deletingCampaign.name}</b> and its campaign recipient/follow-up records will be removed. Messages already stored in the Alliance Inbox will remain available.</p>
            <footer>
              <button className="al-btn ghost" onClick={() => setDeletingCampaign(null)}>Cancel</button>
              <button className="al-btn al-wa-confirm-delete" disabled={busy === `delete-${deletingCampaign.id}`} onClick={deleteCampaign}>
                {busy === `delete-${deletingCampaign.id}` ? "Deleting…" : "Delete campaign"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
