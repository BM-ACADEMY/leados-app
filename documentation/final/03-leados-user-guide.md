# 3. LeadOS Core User Guide

## Dashboard

Use Dashboard for high-level lead, conversion, client, sales, and campaign indicators. Treat it as a summary; investigate source pages for record-level truth.

## Leads

- Add/edit leads with a valid client/brand.
- Keep status, owner, source, and contact details current.
- Avoid duplicate phone/email records.
- Use the selected lead to open the Inbox when conversation context is required.

## Sales Task

This page is the working queue for follow-ups and overdue activity. The sidebar badge represents unread tasks. Complete or update tasks only after the real-world action is performed.

## Inbox

- Handles inbound and outbound conversations.
- Supports text/media and message-level operations implemented in the inbox components and backend.
- Check the mapped client/phone number before sending.
- Do not send bulk outreach from an inbound/support number.

## Campaigns

The core Campaigns screen is distinct from AllianceOS campaign builders. Verify the intended workspace before creating or starting a campaign.

## Templates

The template library is shared by LeadOS and AllianceOS.

### Created For

- LeadOS: variables map to lead fields.
- AllianceOS: choose an AllianceOS audience; mappings load its current system/custom prospect fields.
- Shared: mapping is chosen when sending.

### Meta lifecycle

1. Create a draft using lowercase letters, numbers, and underscores in the template name.
2. Add numbered variables such as `{{1}}`.
3. Give every variable a meaning, source, and realistic Meta review sample.
4. Submit to Meta.
5. Sync until status becomes approved/rejected.
6. Only approved templates can be selected for live WhatsApp campaigns.

Changing an approved template generally requires a new Meta review/version.

## AI Brain

Knowledge must be factual, current, brand-specific, and approved. Do not place credentials, private escalation contacts, or unsupported marketing claims into AI-visible knowledge.

## Clients

`/clients` is the dynamic source for brand choices elsewhere, including Alliance audience configuration and template brand selectors. Renaming/deactivating clients can affect selection lists across the portal.

## Integrations

Use Integrations to confirm external connections. A saved connection is not proof it is healthy; perform the relevant verify/sync operation and check logs.
