# 9. Final Handover Checklist

## Access ownership

- [ ] Repository ownership/admin transferred.
- [ ] Hosting/server access transferred.
- [ ] PostgreSQL owner and backup access transferred.
- [ ] Domain/DNS access transferred.
- [ ] Meta Business Manager, apps, WABA, pages, and phone numbers transferred.
- [ ] Zoho mailbox/domain ownership transferred.
- [ ] Google Cloud/OAuth/Drive/Analytics/GSC access transferred.
- [ ] n8n ownership and workflow credentials transferred.
- [ ] AI provider accounts transferred.
- [ ] Razorpay and other paid provider access transferred.
- [ ] Password-manager vault shared with approved successor(s).

## Credential rotation

- [ ] Database password.
- [ ] JWT and internal API secrets.
- [ ] Meta access tokens/app secrets.
- [ ] SMTP/IMAP password.
- [ ] Google OAuth secrets.
- [ ] AI API keys.
- [ ] Payment/webhook secrets.
- [ ] SEO/data-provider credentials.
- [ ] Old personal access revoked after verification.

## Infrastructure record

- [ ] Production frontend URL and host documented internally.
- [ ] Backend URL, port, host, and process manager documented.
- [ ] Database host/name and backup/restore procedure documented securely.
- [ ] DNS records and SSL renewal ownership documented.
- [ ] Log location and retention documented.
- [ ] Deployment and rollback commands tested.
- [ ] Monitoring/alert recipients updated.

## Functional acceptance

- [ ] Login and role access.
- [ ] Lead create/edit and Inbox.
- [ ] Client list and brand selection.
- [ ] Template create/edit/Meta sync.
- [ ] Alliance audience create/edit/code rename.
- [ ] Prospect import and dynamic columns.
- [ ] Internal email campaign with one follow-up.
- [ ] Consented WhatsApp test with 10-minute reminder.
- [ ] Reply stops follow-ups.
- [ ] Content approval and test publish.
- [ ] Mafiya client/GBP data loads.
- [ ] Required Thedal integrations load.

## Knowledge transfer meeting

- [ ] Walk through this documentation.
- [ ] Demonstrate production deployment and rollback.
- [ ] Demonstrate database backup and read-only diagnostics.
- [ ] Demonstrate failed email and WhatsApp troubleshooting.
- [ ] Explain which phone/domain must never be used for cold outreach.
- [ ] Review recurring provider costs and quotas.
- [ ] Identify current product owner, technical owner, and escalation contacts.

## Open risks to communicate

- Backend automated tests are incomplete.
- `server/server.js` contains significant legacy logic.
- Several third-party credentials and workflows are operational dependencies.
- Database migrations must be reviewed carefully because Alliance migration files rerun idempotently.
- Frontend bundle size should be reduced over time.
- Shared/dynamic field mappings should eventually be centralized.

## Sign-off record

| Item | Value |
|---|---|
| Handover date | |
| Outgoing owner | |
| Incoming technical owner | |
| Incoming product/operations owner | |
| Repository commit/tag | |
| Last database backup | |
| Production smoke test completed by | |
| Outstanding incidents/changes | |

Both parties should keep a signed/exported copy of this checklist in the company-controlled documentation system.
