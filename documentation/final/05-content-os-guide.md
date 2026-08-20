# 5. Content OS Guide

Content OS routes are under `/admin/content-os/*`; primary backend logic is in `server/routes/content*.js`, `server/controllers/contentController.js`, integrations services, and content setup/migration scripts.

## Approval Room

Review generated/imported content before publishing. Confirm brand, copy, media, destination platforms, schedule, and compliance. Approve only final assets.

## Folder Monitors

Monitors watch configured Drive/folder sources. A healthy monitor requires valid Google access, correct folder permissions, and a recent successful check. Avoid pointing multiple monitors at the same source unless duplicate handling is confirmed.

## Scheduler

Schedules approved content. Always verify timezone, brand, social account, and platform-specific asset restrictions.

## Caption Studio

Generates or edits caption variants. AI output must be checked for accuracy, prohibited claims, phone numbers, offer dates, and brand tone.

## Thumbnail Brain

Stores/uses thumbnail guidance and generation logic. Check text rendering, safe margins, spelling, and platform dimensions before approval.

## Social Accounts

Manages OAuth/platform connections. Never paste tokens into documentation or support messages. Record account ownership and expiry/renewal procedures in the company password manager.

## Token Health

Investigate expiring, invalid, or missing tokens before scheduled publish windows. A token may be valid but lack page/account permissions.

## Publish Logs and Failed Jobs

- Publish Logs: audit successful/partial publication and platform IDs.
- Failed Jobs: inspect the provider error, correct the root cause, and retry only when idempotency/duplicate risk is understood.

Common failures include expired tokens, missing permissions, unsupported media, transcoding failure, platform processing failure, invalid caption length, and unavailable source files.

## Reach Report

Reach depends on connected platform analytics and may lag. Confirm account and reporting interval before comparing results.

## Operational checklist

- Folder/source readable.
- Social token and permissions healthy.
- Correct account mapped to brand.
- Media processed successfully.
- Content approved.
- Schedule/timezone correct.
- Publish log checked after due time.
- Partial failures handled per platform without duplicating successful posts.
