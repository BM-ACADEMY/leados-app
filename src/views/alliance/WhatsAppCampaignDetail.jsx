import React, { useCallback, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';

const STATUS_LABEL = {
  queued: 'Queued', sending: 'Sending', sent: 'Sent', delivered: 'Delivered',
  read: 'Read', failed: 'Failed', skipped: 'Skipped', cancelled: 'Cancelled',
};
const STATUS_CLASS = {
  queued: 'new', sending: 'seq', sent: 'seq', delivered: 'int',
  read: 'int', failed: 'rep', skipped: 'rep', cancelled: 'rep',
};
const PAGE_SIZE = 25;

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '—');

export const WhatsAppCampaignDetail = ({ campaignId, onClose }) => {
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { setPage(1); }, [status, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllianceWhatsAppCampaignDetail(campaignId, {
        status,
        search: debouncedSearch,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setCampaign(data.campaign);
      setRecipients(data.recipients || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error(error.message || 'Failed to load campaign detail');
    } finally {
      setLoading(false);
    }
  }, [campaignId, status, debouncedSearch, page]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="al-wa-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="al-wa-detail" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <b>{campaign?.name || 'Campaign'}</b>
            <small>
              Initial template: {campaign?.template_name || '—'} ({campaign?.template_language || 'en'}) · Scheduled {campaign ? formatDateTime(campaign.scheduled_at) : ''}
            </small>
            <small>
              Reminder template: {campaign?.followup_template_name ? `${campaign.followup_template_name} (${campaign.followup_template_language || 'en'})` : 'None configured'}
            </small>
          </div>
          <button type="button" className="al-wa-detail-close" onClick={onClose} aria-label="Close campaign detail">
            <X size={18} />
          </button>
        </header>

        {campaign && (
          <div className="al-wa-detail-stats">
            <div><b>{campaign.recipients}</b><span>Recipients</span></div>
            <div><b>{campaign.sent}</b><span>Sent</span></div>
            <div><b>{campaign.delivered}</b><span>Delivered</span></div>
            <div><b>{campaign.read}</b><span>Read</span></div>
            <button type="button" className={`al-wa-stat-filter ${status === 'failed' ? 'active' : ''}`} onClick={() => { setStatus('failed'); setPage(1); }} title="Show failed leads and their reasons"><b>{campaign.failed}</b><span>Failed</span></button>
            <div><b>{campaign.skipped}</b><span>Skipped</span></div>
            {campaign.pending > 0 && <div><b>{campaign.pending}</b><span>Pending</span></div>}
            {campaign.followup_template_id && <div><b>{campaign.reminders_sent_total || 0}</b><span>Reminders sent</span></div>}
            {campaign.followup_template_id && <div><b>{campaign.reminders_pending_total || 0}</b><span>Reminders pending</span></div>}
            {campaign.followup_template_id && <div><b>{campaign.reminders_failed_total || 0}</b><span>Reminders failed</span></div>}
            {campaign.followup_template_id && <div><b>{campaign.reminders_skipped_total || 0}</b><span>Reminders skipped</span></div>}
          </div>
        )}
        {campaign?.next_followup_at && (
          <div className="al-wa-detail-note">Next reminder due {formatDateTime(campaign.next_followup_at)}</div>
        )}
        {campaign?.latest_reminder_error && (
          <div className="al-wa-detail-note">Latest reminder issue: {campaign.latest_reminder_error}</div>
        )}
        {campaign?.followup_template_id && Number(campaign.reminder_jobs_total) === 0 && Number(campaign.sent) > 0 && (
          <div className="al-wa-detail-note">No reminder job exists for this sent campaign. Restart the backend so the reminder recovery worker can recreate it.</div>
        )}

        <div className="al-wa-detail-filters">
          <div className="al-input-icon">
            <Search size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search lead name, business, or phone" />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {Object.keys(STATUS_LABEL).map((key) => <option key={key} value={key}>{STATUS_LABEL[key]}</option>)}
          </select>
          <span>{total} lead{total === 1 ? '' : 's'}</span>
        </div>

        <div className="al-wa-detail-table-wrap">
          <table className="al-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Phone</th>
                <th>Audience</th>
                <th>Status</th>
                <th>Sent at</th>
                <th>Reminders</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="al-empty">Loading recipients…</td></tr>
              ) : recipients.map((recipient) => (
                <tr key={recipient.id}>
                  <td><b>{recipient.name || recipient.business_name}</b><small>{recipient.business_name}</small></td>
                  <td>{recipient.phone || '—'}</td>
                  <td>{recipient.audience || '—'}</td>
                  <td>
                    <span className={`al-st ${STATUS_CLASS[recipient.status] || 'new'}`}>
                      <span className="d" />{STATUS_LABEL[recipient.status] || recipient.status}
                    </span>
                  </td>
                  <td>{formatDateTime(recipient.sent_at)}</td>
                  <td>
                    {recipient.reminders_sent || 0}
                    {recipient.next_reminder_at ? ` · next ${formatDateTime(recipient.next_reminder_at)}` : ''}
                    {!recipient.next_reminder_at && recipient.reminder_status ? ` · ${recipient.reminder_status}` : ''}
                  </td>
                  <td className="al-wa-error-cell" title={recipient.reminder_error || recipient.error_message || ''}>{recipient.reminder_error || recipient.error_message || '—'}</td>
                </tr>
              ))}
              {!loading && !recipients.length && (
                <tr><td colSpan={7} className="al-empty">No leads match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="al-wa-detail-pagination">
          <span>Page {page} of {pages}</span>
          <div>
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button type="button" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </footer>
      </div>
    </div>
  );
};
