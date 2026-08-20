# 7. Database, API, and Worker Reference

## Frontend

- React 19 and React Router.
- Vite development/build tooling.
- Shared requests: `src/services/api.js`.
- Application routes: `src/App.jsx`.
- Navigation: `src/components/layout/Sidebar.jsx`.

## Backend

- Express 5 application in `server/server.js`.
- PostgreSQL connection pool in `server/db/connection.js`.
- Socket.IO for live UI updates.
- Feature routes split under `server/routes/`, with legacy/core endpoints also defined in `server/server.js`.

## AllianceOS core tables

| Table | Purpose |
|---|---|
| `alliance_audiences` | Dynamic audience definition |
| `alliance_audience_fields` | Custom audience columns |
| `alliance_prospects` | Imported/manual outbound prospects |
| `alliance_campaigns` | Email/import campaign header |
| `alliance_campaign_prospects` | Campaign enrollment |
| `alliance_campaign_templates` | Email touch copy frozen per campaign |
| `alliance_sequences` | Default touch cadence |
| `alliance_templates` | Default audience/channel copy |
| `alliance_touches` | Individual scheduled/sent email touches |
| `alliance_domains` | Email sender capacity/health |
| `alliance_numbers` | WhatsApp sender pool/health |
| `alliance_whatsapp_campaigns` | WhatsApp campaign configuration |
| `alliance_whatsapp_campaign_recipients` | Initial WhatsApp recipient delivery |
| `alliance_whatsapp_followup_jobs` | Persistent reminder queue |
| `alliance_replies` | Normalized replies and AI drafts |
| `alliance_email_inbound` | IMAP inbound records |
| `alliance_email_events` | Email delivery/reply/test audit events |
| `alliance_suppression` | Do-not-contact records |
| `alliance_brands`, offerings/FAQs | Alliance AI Brain catalog |
| `alliance_prompt_rules` | Prioritized AI behavior instructions |

## Important Alliance API groups

- `/api/alliance/audiences*`: audience configuration/templates.
- `/api/alliance/prospects*`: import, list, create, edit, delete.
- `/api/alliance/campaign-builder/*`: email builder options, templates, prospects, AI suggestion.
- `/api/alliance/campaigns*`: create, readiness, start/pause/stop/delete, test, detail.
- `/api/alliance/whatsapp-campaigns*`: prospects, create, test, list/detail, pause/resume/stop/delete.
- `/api/alliance/replies*`: email reply workspaces.
- `/api/alliance/inbox*`: WhatsApp inbox.
- `/api/alliance/brain*` and `/prompts*`: AI knowledge/rules.
- `/api/alliance/automation/*`: n8n/internal reminder endpoints.

## Background workers

### Email worker

File: `server/services/alliance-email-worker.js`.

- Poll interval: 30 seconds.
- Claims due email touches with row locking.
- Enforces campaign/sender/prospect eligibility and daily limits.
- Sends through configured Alliance SMTP.
- Persists sent/failed events.
- Schedules or reconstructs remaining campaign touches.
- Completes enrollments/campaigns only after expected touches finish.

### Email reply poller

File: `server/services/alliance-email-replies.js`.

- Polls IMAP and correlates messages to campaign/prospect.
- Creates normalized reply records and AI drafts.
- Stops unsent follow-ups on every reply.
- Suppresses not-interested recipients.

### WhatsApp campaign worker

File: `server/services/alliance-whatsapp-campaign-worker.js`.

- Initial recipient poll: 30 seconds.
- Reminder poll: 60 seconds.
- Sends Meta-approved templates only.
- Creates first reminder job immediately after Meta acceptance.
- Recovers missing reminder jobs.
- Uses persistent claim/status fields to avoid duplicate sends with n8n.
- Cancels for replies, suppression, consent loss, terminal status, or stop.

## Data consistency rules

- Use transactions for multi-table create/update/delete workflows.
- Preserve sent records and provider IDs.
- Use unique constraints/idempotent inserts for queue jobs.
- Do not reinterpret a successful provider acceptance as failed because a later local logging step failed.
- Dynamic audience code changes must cascade through dependent data.
- Date filters displayed to Indian operators use `Asia/Kolkata` calendar dates.

## Known technical debt

- `server/server.js` is large and contains legacy/core route logic.
- Automated backend tests are incomplete.
- Frontend bundle is large.
- Some setup/migration scripts exist outside the ordered Alliance migration folder.
- Environment configuration contains many third-party integrations and needs centralized secret management.
- Similar field-mapping lists exist in multiple template/campaign surfaces and should eventually share one server-provided schema.
