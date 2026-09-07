NERA — MULTI-MODULE DEVELOPMENT PLAN
Complete Task-by-Task Plan
Modules covered: LeadOS, AllianceOS, Mafiya OS, ContentOS → unified under Nera
Verified against repo on 2026-09-05.

Legend: ✅ EXISTS | 🔧 MODIFY | 🆕 NEW

---

## INDEX

| # | Module | Tasks | Phase | Status Breakdown |
|---|---|---|---|---|
| M1 | Database / Schema Foundation | 4 | P0 | 0E · 2M · 2N |
| M2 | Authentication & Tenant Identity | 6 | P0 | 0E · 4M · 2N |
| M3 | LeadOS Hardening | 5 | P0 | 0E · 4M · 1N |
| M4 | AllianceOS Hardening | 4 | P0 | 0E · 3M · 1N |
| M5 | Mafiya OS → Nera Local (`NL`) | 6 | P0/P1 | 0E · 5M · 1N |
| M6 | ContentOS → Nera Studio (`NS`) | 6 | P0/P1 | 0E · 5M · 1N |
| M7 | Commercial Catalogue & Checkout (ND/NW/NC) | 5 | P0/P1 | 0E · 1M · 4N |
| M8 | Entitlement Enforcement Layer | 3 | P0/P1 | 0E · 1M · 2N |
| M9 | Usage Metering | 4 | P1 | 0E · 0M · 4N |
| M10 | Autopilot & Lifecycle | 5 | P2 | 0E · 0M · 5N |
| M11 | Notifications & Ops Alerts | 4 | P0/P1 | 1E · 0M · 3N |
| M12 | Audit Log Integration | 2 | P0 | 0E · 0M · 2N |
| M13 | Compliance & Launch Readiness | 3 | P2 | 0E · 0M · 3N |

## Summary

| Count | |
|---|---|
| Total Modules | 13 |
| Total Tasks | 57 |
| ✅ EXISTS | 1 |
| 🔧 MODIFY | 25 |
| 🆕 NEW | 31 |

## Phase Overview

| Phase | Focus | Modules | Tasks |
|---|---|---|---|
| Phase 1 (P0) | Tenant foundation | M1, M2, M3, M4, M12 | 21 |
| Phase 2 (P0/P1) | Commercial + module hardening | M5, M6, M7, M8, M11 | 24 |
| Phase 3 (P1) | Metering | M9 | 4 |
| Phase 4 (P2) | Autopilot & compliance | M10, M13 | 8 |

**Rule:** no client goes live until Phase 1's exit test passes — applies to LeadOS, AllianceOS, `NL`, `NS` equally.

## ESTIMATED TIMELINE

| Module / Activity | Timeline |
| :--- | ---: |
| **LeadOS – SaaS hardening & improvements** | 5 Days |
| **AllianceOS – SaaS hardening & improvements** | 5 Days |
| **Mafiya OS → Nera Local** | 4 Days |
| **ContentOS → Nera Studio** | 4 Days |
| **SaaS / Subscription / Entitlement integration** | 4 Days |
| **UI Work** | 3 Days |
| **n8n Workflow** | 3 Days |
| **Integration, Testing & Bug Fixing** | 4 Days |
| **Total** | **32 Working Days** |

---

## CONFIRMED CURRENT STATE

| # | Fact | Evidence |
|---|---|---|
| 1 | `users` has no tenant/client column; role = `admin\|manager\|agent` only | `server/setup-db.js` |
| 2 | JWT has no `tenant_id` | `server/server.js:1226` |
| 3 | `DEFAULT_TENANT_ID = 1` hardcoded everywhere | `server/server.js:1106` |
| 4 | `clients` = LeadOS brand (7 ABM brands), not a SaaS tenant | `server/setup-db.js` |
| 5 | Socket.io broadcasts globally, no tenant rooms | `server/server.js` (12+ `io.emit` sites) |
| 6 | Razorpay webhook writes to lead-keyed `payments`, not subscriptions | `server/server.js:3340` |
| 7 | AllianceOS schema + background workers have no tenant scoping | 34 migration files, `alliance-*-worker.js` |
| 8 | Mafiya OS routes have zero role checks | `mafiya-plans.js`, `mafiya-usage.js` |
| 9 | ContentOS `canApprove` gate is frontend-only, hardcoded `true` | `ApprovalRoom.jsx` |

---

## MODULE 1 — DATABASE / SCHEMA FOUNDATION (shared)

### 1.1 — Add tenant_id to `users` 🔧
`server/setup-db.js` → add `tenant_id`, expand role check to `owner/admin/manager/agent`, index it.

### 1.2 — Rebuild `tenants` registry 🔧
Replace the unpopulated legacy `tenants` table with a real one: `business_name, owner_user_id, status, is_founding_client, language, currency, timezone`. Remove `DEFAULT_TENANT_ID` only after M3/M4 are migrated off it.

### 1.3 — Commercial catalogue tables 🆕
`products` (ND/NW/NC/NL/NS) · `plans` · `plan_prices` (versioned) · `plan_features`.

### 1.4 — Subscription/order/payment tables 🆕
`orders` · `subscriptions` · `module_entitlements` · `subscription_payments` · `invoices`. Kept separate from the existing lead-keyed `payments` table.

---

## MODULE 2 — AUTHENTICATION & TENANT IDENTITY (shared)

### 2.1 — Add tenant_id to JWT payload 🔧
`server/server.js:1226`

### 2.2 — Auth middleware derives tenant server-side 🔧
`server/server.js:1065-1091` — re-read tenant from DB, never trust client-supplied `tenant_id`.

### 2.3 — Replace `DEFAULT_TENANT_ID` everywhere 🔧
File-by-file, tested against M3/M4 suites after each file — the riskiest mechanical change in the plan.

### 2.4 — Public signup + verification 🆕
New `server/routes/auth-signup.js`.

### 2.5 — Invitation link + MFA 🆕
New `server/routes/invitations.js` — one-time expiring link; MFA required for owner/admin.

### 2.6 — Add Owner role tier 🔧
Audit every `role === 'admin'` check to include `owner`.

---

## MODULE 3 — LEADOS HARDENING

| Sidebar | Route | File | Backend |
|---|---|---|---|
| Dashboard | `/dashboard` | `Dashboard.jsx` | `server.js` |
| Leads | `/leads` | `LeadsView.jsx` | `server.js` |
| Sales Task | `/sales-tasks` | `SalesTasksView.jsx` | `server.js` + `salesos.js` |
| Inbox | `/inbox` | `InboxView.jsx` | `server.js` + Socket.io |
| Campaigns | `/campaigns` | `CampaignsView.jsx` | `server.js` |
| Templates | `/templates` | `TemplatesView.jsx` | `server.js` |
| AI Brain | `/brain` | `AIBrainView.jsx` | `services/aiBrain.js` |
| Reports | `/reports` | `ReportsView.jsx` | `server.js` |
| Founder Reports | `/founder-reports` | `FounderReportsView.jsx` | `server.js` |
| Clients | `/clients` | `ClientsView.jsx` | `server.js` |
| Integrations | `/integrations` | `IntegrationsView.jsx` | `integrationsController.js` |

No dedicated route file — everything lives inline in `server/server.js` (5,735 lines).

### 3.1 — Add tenant_id to LeadOS tables 🔧
`leads`, `conversations`, `templates` + others. NOT NULL only after backfill.

### 3.2 — Scope every LeadOS query by tenant_id 🔧
`server/server.js` — largest task in the plan by line count.

### 3.3 — Socket.io room scoping per tenant 🔧
Replace every `io.emit(...)` with `io.to(\`tenant:${tenant_id}\`).emit(...)`. Live leak today.

### 3.4 — Reconcile `clients` (brand) vs `tenants` (customer) 🔧
Decision needed before 3.1/3.2 proceed — see Still Needs Confirmation.

### 3.5 — Cross-tenant test suite — LeadOS 🆕
Exit test: two tenants, identical lead names, zero visibility/socket leakage, 403 on direct access.

---

## MODULE 4 — ALLIANCEOS HARDENING

| Sidebar | Route | File | Backend |
|---|---|---|---|
| Analytics | `/alliance/analytics` | `AllianceDashboard.jsx` | `alliance.js` |
| Upload Leads | `/alliance/upload` | `UploadLeads.jsx` | `alliance.js` |
| Prospects | `/alliance/prospects` | `LeadList.jsx` | `alliance.js` |
| Number Health | `/alliance/number-health` | `Pipeline.jsx` | `alliance.js:2669` |
| Email Senders | `/alliance/email-setup` | `EmailSetup.jsx` | `alliance.js` |
| Email Campaigns | `/alliance/email-campaigns/new` | `EmailCampaignBuilder.jsx` | `alliance.js` + `alliance-email-worker.js` |
| WhatsApp Campaigns | `/alliance/whatsapp-campaigns/new` | `WhatsAppCampaignBuilder.jsx` | `alliance.js` + `alliance-whatsapp-campaign-worker.js` |
| Replies | `/alliance/replies` | `LeadProfile.jsx` | `alliance-email-replies.js` |
| AI Brain | `/alliance/ai-brain` | `KnowledgeBase.jsx` | `alliance-brain-context.js` |
| Prompts | `/alliance/prompts` | `PromptManager.jsx` | `alliance-prompt-rules.js` |
| Campaign Planner | `/alliance/planner` | `CampaignPlanner.jsx` | `alliance.js` |
| WhatsApp Inbox | `/alliance-inbox` | `AllianceInboxView.jsx` | `alliance-inbox-v2.js` |

Note: "Number Health" file is `Pipeline.jsx`, "Replies" file is `LeadProfile.jsx` — both correct, just misleadingly named. `alliance.js:2669` handler param is `_req` — confirms no tenant awareness.

### 4.1 — Add tenant_id across AllianceOS schema 🔧
One consolidated migration over 34 existing migration files.

### 4.2 — Scope every AllianceOS route by tenant_id 🔧
`alliance.js`, `alliance-inbox*.js`, `alliance-automation.js`.

### 4.3 — Scope AllianceOS background workers by tenant_id 🔧
`alliance-email-worker.js`, `alliance-whatsapp-campaign-worker.js`, `alliance-ai-nudge-worker.js`, `alliance-lead-scoring.js`, `alliance-email-replies.js` — no `req.user` context, must resolve tenant per row.

### 4.4 — Cross-tenant test suite — AllianceOS 🆕
Same standard as 3.5, including background-worker isolation.

---

## MODULE 5 — MAFIYA OS → NERA LOCAL (`NL`)

| Sidebar | Route | File | Backend |
|---|---|---|---|
| The Family | `/mafiya/family` | `Family.jsx` | `mafiya-clients.js` |
| GMB Clients | `/mafiya/add-client` | `AddClient.jsx` | `mafiya-clients.js` |
| Mafiya Plans | `/mafiya/plans` | `PlanManagement.jsx` | `mafiya-plans.js` |
| Turf Control | `/thedal/keyword-tracking` | *(mis-routed — Thedal OS)* | `thedal-keywordtracking.js` |
| Loyalty (Review) | `/mafiya/loyalty` | `Loyalty.jsx` | `mafiya-reviews.js` |
| Street Posts | `/mafiya/street-posts` | `StreetPosts.jsx` | `mafiya-reviews.js` |
| Rival Families | `/mafiya/rivals` | `RivalFamilies.jsx` | Google Places API directly (not `mafiya-rivals.js`) |
| GBP Insights | `/mafiya/gbp-insights` | `GbpInsights.jsx` | `mafiya-insights.js` |
| Citation | `/mafiya/citations` | `Citations.jsx` | `citation.routes.js` |
| Mafia Orders | `/mafiya/orders` | `Orders.jsx` | `mafiya-orders.js` |
| Don's Brain | `/mafiya/brain` | `GmbBrain.jsx` | `mafiya-reviews.js` |
| Usage | `/mafiya/usage` | `Usage.jsx` | `mafiya-usage.js` |

Confirmed live: "Turf Control" mis-routes to Thedal OS (`Sidebar.jsx:552-553`). Confirmed dead: `mafiya-rivals.js` runs a cron nobody calls.

### 5.1 — Add server-side role gating 🔧
`mafiya-plans.js`, `mafiya-usage.js` — currently zero role checks.

### 5.2 — Remove/label fabricated data 🔧
`Family.jsx`, `GbpInsights.jsx`, `StreetPosts.jsx` — hardcoded/mock values shown as real.

### 5.3 — Delete dead `mafiya-rivals.js` 🔧

### 5.4 — Fix mis-routed "Turf Control" link 🔧
`Sidebar.jsx`

### 5.5 — Consolidate duplicated GMB OAuth refresh logic 🔧
Currently copy-pasted across 3 files.

### 5.6 — Define `NL` product/plan/meters 🆕
GBP locations, review replies, posts, citation scans, competitor tracks/month.

---

## MODULE 6 — CONTENTOS → NERA STUDIO (`NS`)

| Sidebar | Route | File | Backend |
|---|---|---|---|
| Approval Room | `/admin/content-os/approval` | `ApprovalRoom.jsx` | `contentController.js` |
| Folder Monitors | `/admin/content-os/monitors` | `FolderMonitors.jsx` | `contentController.js` |
| Scheduler | `/admin/content-os/scheduler` | `SchedulerView.jsx` | `contentController.js` |
| Caption Studio | `/admin/content-os/captions` | `CaptionStudio.jsx` | `contentController.js` |
| Thumbnail Brain | `/admin/content-os/thumbnail-brain` | `ThumbnailBrainStudio.jsx` | `thumbnailBrainController.js` |
| Social Accounts | `/admin/content-os/social-connection` | `SocialAccounts.jsx` | `contentController.js` |
| Token Health | `/admin/content-os/tokens` | `TokenHealth.jsx` | `contentController.js` |
| Publish Logs | `/admin/content-os/logs` | `PublishLogs.jsx` | `contentController.js` |
| Reach Report | `/admin/content-os/reach` | `ReachReport.jsx` | client-side estimate only |
| Failed Jobs | `/admin/content-os/failed` | `FailedJobs.jsx` | `contentController.js` |

Confirmed dead: `ABMGroups_ApprovalDashboard.jsx`, `SocialConnectionView.jsx`, `ThumbnailBrain.jsx`+`ThumbnailGenerationFlow.jsx`, and the whole `contentos.js` router (duplicates `contentController.js`).

### 6.1 — Replace hardcoded `canApprove` with real role gating 🔧
Frontend hardcode + missing server-side check in `contentController.js`.

### 6.2 — Delete dead files 🔧
4 files listed above.

### 6.3 — Rotate hardcoded Meta app secret 🔧
`contentController.js`

### 6.4 — Remove duplicate `contentos.js` router 🔧

### 6.5 — Rebuild `setup-contentos-db.js` 🔧
Missing ~15 columns vs live schema.

### 6.6 — Define `NS` product/plan/meters + AI-thumbnail scope decision 🆕
Videos processed, captions generated, connected accounts, publishes/month.

---

## MODULE 7 — COMMERCIAL CATALOGUE & CHECKOUT (`ND`/`NW`/`NC`)

### 7.1 — Plan catalogue admin CRUD 🆕
### 7.2 — Public pricing + checkout page 🆕
### 7.3 — Razorpay subscription flow → orders/subscriptions/entitlements 🔧
`server/server.js:3340` (webhook) + `:3408` — new transactional path, idempotent on `razorpay_payment_id`. Existing lead-payment webhook untouched.
### 7.4 — Offline payment approval (maker-checker) 🆕
`awaiting_verification → paid → provisioning → active`, two-person approval.
### 7.5 — Demo sandbox (`DEMO-7`) + Paid pilot (`PILOT-14`) 🆕
Shared WABA, 200-reply cap, 7-day life, never provisions a real WABA.

---

## MODULE 8 — ENTITLEMENT ENFORCEMENT LAYER

### 8.1 — Central entitlement-check middleware 🆕
Single choke point for all 5 product lines, replacing per-module duplicated checks.
### 8.2 — Enforce limits at write time 🆕
Not just UI display.
### 8.3 — Sidebar hides unpurchased modules 🔧
Cosmetic only — never the actual security layer.

---

## MODULE 9 — USAGE METERING

### 9.1 — `usage_events`/`usage_counters` tables 🆕
### 9.2 — Meter ND/NW/NC units 🆕
Exclude failed/undelivered, retries, deleted drafts, handover message, inbound, template submissions.
### 9.3 — Meter NL + NS units 🆕
Depends on 5.6/6.6 meter definitions first.
### 9.4 — Abuse guards 🆕
10/day, 3/hr per contact; context capped at 10 messages; output capped at 200 tokens.

---

## MODULE 10 — AUTOPILOT & LIFECYCLE

### 10.1 — Renewal + failed-payment retry 🆕
### 10.2 — Grace → restricted → suspended → archived state machine 🆕
Days 1-7 / 8-21 / 22 / 90.
### 10.3 — Wallet/top-up autopilot 🆕
80% alert, <₹500 low-balance, AI never silently stops replying.
### 10.4 — Weekly client + Monday founder report 🆕
### 10.5 — Quality-rating / SLA breach alerting 🆕
Yellow within 24h; margin <35% alert.

---

## MODULE 11 — NOTIFICATIONS & OPS ALERTS

### 11.1 — Onboarding checklist auto-send + stalled-case alerts 🆕
### 11.2 — Admin payment/activation alerts, all 4 modules 🆕
### 11.3 — Quota/wallet threshold alerts 🆕
### 11.4 — Notification delivery infrastructure ✅ (minor extension)
Socket.io real-time transport already exists — reuse once 3.3's room scoping lands.

---

## MODULE 12 — AUDIT LOG INTEGRATION

### 12.1 — `audit_events` table + writer utility 🆕
Append-only — no UPDATE/DELETE ever.
### 12.2 — Instrument key events across all 4 modules 🆕
`TENANT_CREATED`, `USER_INVITED`, `SUBSCRIPTION_ACTIVATED`, `PAYMENT_VERIFIED`, `ENTITLEMENT_CHANGED`, `CROSS_TENANT_ACCESS_DENIED`, `PLAN_UPGRADED/DOWNGRADED`, `CAMPAIGN/CONTENT_APPROVED`.

---

## MODULE 13 — COMPLIANCE & LAUNCH READINESS

### 13.1 — Consent capture (terms/privacy/DPA) 🆕
### 13.2 — Backup + tested restore 🆕
### 13.3 — Cross-tenant penetration test 🆕
Only after M3/M4 automated suites are green.

---

## PHASE PLAN

| Phase | Modules | Tasks |
|---|---|---|
| Phase 1 (P0) | M1 (1.1–1.4), M2 (2.1–2.6), M3 (3.1–3.5), M4 (4.1–4.4), M12 (12.1–12.2) | 21 |
| Phase 2 (P0/P1) | M5 (5.1–5.6), M6 (6.1–6.6), M7 (7.1–7.5), M8 (8.1–8.3), M11 (11.1–11.4) | 24 |
| Phase 3 (P1) | M9 (9.1–9.4) | 4 |
| Phase 4 (P2) | M10 (10.1–10.5), M13 (13.1–13.3) | 8 |

## COMPLETE TASK COUNT

| Status | Count |
|---|---|
| ✅ EXISTS | 1 |
| 🔧 MODIFY | 25 |
| 🆕 NEW | 31 |
| **Total** | **57** |

## STILL NEEDS CONFIRMATION

| Question | Blocks |
|---|---|
| Approve product codes `NL`/`NS`, or choose different names | 1.3, 5.6, 6.6 |
| Pricing tiers/limits for `NL`/`NS` — no spec exists yet | 5.6, 6.6, 9.3 |
| `clients` (brand) map 1:1 to `tenants`, or retire `client_id` entirely? | 3.4 |
| Mafiya OS/ContentOS: wait for full Phase 1, or interim patch sooner? | 5.1, 6.1 |
| AI thumbnail generation — ship in `NS` v1 or descope? | 6.6 |
| Who owns LeadOS vs AllianceOS scoping pass — one engineer or split? | 3.2, 4.2 |
| Bundling: standalone, add-on, or Full Suite bundle? | 7.1, 7.2 |

---

Prepared: 2026-09-05 · Grounded against live repository state.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
