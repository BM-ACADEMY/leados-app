# 8. Operations and Troubleshooting

## First response procedure

1. Record exact page, campaign/lead ID, time, user, and visible error.
2. Check browser Network response and backend logs.
3. Confirm frontend and backend are pointing to the expected environment.
4. Verify database connectivity.
5. Check worker/process uptime.
6. Inspect provider status and credentials without exposing secrets.
7. Query the smallest relevant record set before changing data.
8. Back up before manual database correction.

## “UI change is not visible”

- Hard refresh the browser.
- Confirm Vite dev server or deployed `dist/` contains the new bundle.
- Check the frontend URL/API URL.
- Restart backend when routes/workers/migrations changed.

## Alliance audience fields missing

- Confirm the audience saved successfully.
- Check `/api/alliance/audiences` returns `column_config` and `fields`.
- Check the target screen selected the correct audience.
- Custom values live in `alliance_prospects.custom_fields`.

## Email follow-up missing

- Campaign must be Running.
- Touch 1 must be Sent.
- Campaign templates must contain later touches.
- Enrollment must be `in_sequence` and prospect must not have replied/suppressed/terminated.
- Inspect `alliance_touches` for scheduled/failed/cancelled records and `alliance_email_events` for errors.
- Confirm the email worker is cycling every 30 seconds.

## WhatsApp reminder missing

- Campaign must have `followup_template_id` and approved template data.
- Recipient initial status should be sent/delivered/read.
- Inspect `alliance_whatsapp_followup_jobs` status, scheduled time, and error.
- Confirm consent and consent source still exist.
- Check for inbound reply after the reminder activity cutoff.
- Confirm the reminder worker/n8n endpoint cycles every minute.
- Meta rejections appear as failed job errors.

## Campaign immediately shows Completed

- Older code completed after initial sends without considering reminder jobs.
- Current WhatsApp worker restores Running when pending reminders exist.
- Current email worker completes only after configured touches finish.
- Restart the updated backend and inspect the persistent queue before manually changing status.

## SMTP issues

- Verify sender is Active and allowed by backend configuration.
- Check SMTP host/port/TLS/user/password.
- Confirm From address matches authenticated/allowed mailbox.
- Check daily cap and provider response.
- SMTP acceptance is not proof of inbox placement.

## IMAP reply issues

- Verify IMAP credentials and mailbox access.
- Run the project diagnostic/sync scripts only in the intended environment.
- Check `alliance_email_sync_state`, `alliance_email_inbound`, and correlation headers.

## Meta/WhatsApp issues

- Check token validity, phone-number ID, WABA/account permissions, template name/language/status, recipient format, and consent.
- Read the exact Graph API error before retrying.
- Do not repeatedly retry an unknown acceptance state; first check provider/message IDs.

## Safe database diagnostics

Use read-only queries first. Never run broad deletes, resets, or ad-hoc migration bundles against a shared database without explicit approval and backup. Record every manual correction in the handover/change log.

## Logs to preserve

- Backend process logs.
- HTTP response/error payload (redacted).
- Campaign/recipient/touch/job IDs.
- Provider message ID.
- Relevant status timestamps.
- Deployment commit/hash and migration list.
