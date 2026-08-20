# 4. AllianceOS Guide

## Operating rules

- Email is the default cold-outreach channel.
- WhatsApp requires explicit consent and a consent source.
- Never use the primary inbound LeadOS number for cold sending.
- Stop follow-ups on replies, suppression, unsubscribe, terminal status, or manual stop.
- Respect sender daily limits and bulk-send limits.
- Human review is required for AI-generated copy and replies.

## Analytics

`/alliance/analytics` shows campaign and channel performance. Use campaign Details for recipient-level evidence.

## Audiences and Upload Leads

`/alliance/upload` manages dynamic audiences and spreadsheet imports.

An audience includes:

- Display label and generated/editable code.
- Brand selected dynamically from Clients.
- Default channel: email, WhatsApp, or both.
- Enabled/renamed system columns.
- Custom columns with type, required flag, and sample.

Renaming an audience code updates dependent Alliance records through migration-backed cascading logic. Apply migration `028` before using code rename in an environment.

Import procedure:

1. Select audience, campaign name, and channel.
2. Download the audience-specific workbook.
3. Preserve headers and replace sample rows.
4. For WhatsApp/both, provide phone, `consent=true`, and `consent_source`.
5. Upload and review imported/duplicate/suppressed/invalid totals.

## Prospects

`/alliance/prospects` reads live `alliance_prospects` data. It supports search, audience, campaign-name, status, and India-local date filters. The table includes Source and dynamic audience custom-field columns.

## Number Health

`/alliance/number-health` is the pre-send phone-quality workspace. Use it to review validation results and exclude invalid or unsafe numbers before selecting WhatsApp recipients. Number health does not replace consent: a valid number still requires `consent=true` and a recorded consent source.

## Email senders

`/alliance/email-setup` manages sender inboxes and verification. The backend also checks configured allowed sender addresses before sending through Zoho SMTP.

## Email campaigns

`/alliance/email-campaigns/new` creates campaign-specific touch copy.

1. Select sender and campaign details.
2. Select eligible audience prospects.
3. Review every touch subject/body.
4. Configure strictly increasing send days; Touch 1 must be Day 0.
5. Review and start now or schedule.

The system supports up to 10 touches. Campaign templates are copied to `alliance_campaign_templates`. The email worker runs every 30 seconds, sends due touches, reconstructs missing follow-ups, stops on every reply, and completes only after expected touches finish.

Use `/alliance/planner` to view readiness, start/pause/stop/delete, send internal tests, retry failures, and open full Details.

## Campaign Planner

`/alliance/planner` is the operational control plane for email campaigns. Confirm readiness before starting, then use the campaign row to inspect status and counts. The Details view provides recipient-level touch history and errors. Pause preserves the campaign for later continuation; Stop is terminal unless the implementation explicitly provides a restart action.

## WhatsApp campaigns

`/alliance/whatsapp-campaigns/new` requires approved Alliance/shared templates and consented prospects.

1. Select an approved initial template.
2. Map numbered variables to prospect fields.
3. Optionally select an approved reminder template.
4. Choose the first reminder delay (10 minutes is testing only).
5. Select consented recipients and send/schedule.

The initial worker runs every 30 seconds. Reminder processing runs every minute. Reminder jobs are persisted immediately after Meta accepts the initial message. Recovery recreates a missing first reminder for already-sent/read recipients. Campaign status remains Running while reminders are pending.

Recipient replies, suppression, terminal statuses, or manual stop cancel reminders. Details shows recipient delivery/read/failure state, reminder totals, next reminder, and errors.

## Replies and inbox

- `/alliance/replies`: email reply timeline and AI draft workflow.
- `/alliance-inbox`: WhatsApp conversation workspace.

Email reply polling uses IMAP. Every correlated reply stops unsent email follow-ups. “Not interested” additionally suppresses the prospect. AI drafts remain subject to human approval.

## AI Brain and Prompts

- `/alliance/ai-brain`: brand/offering/FAQ knowledge.
- `/alliance/prompts`: priority-based campaign, follow-up, classification, and reply instructions.

Prefer factual Brain data for business facts and Prompt Rules for behavioral instructions.

## Key safety verification

- Attempting WhatsApp without consent is rejected.
- Suppressed recipients are excluded.
- Reply stops future touches/reminders.
- Daily cap prevents excess sends.
- Failed sends expose an error in campaign Details.
- A 10-minute reminder creates a pending job and sends on the worker cycle after its due time.
