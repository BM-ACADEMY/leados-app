# Nera — Development Brief

From: Mohamed Kamarudeen B, Founder
Scope: LeadOS + AllianceOS → Nera, a sellable self-running multi-tenant SaaS
Companion: Nera Pricing Specification v2.0 — that document defines every number. This one defines what to build.

Standing principle: the platform must run without me. Every phase is judged by one question — does this remove a manual step, or add one? If a process needs a human to remember it, it isn't built.

Phases are in strict order. Do not start a phase until the previous exit test passes.

## PARALLEL TRACK — Start immediately

Separate instances for the first 2–3 paying clients while the multi-tenant build proceeds.
- Scripted, repeatable deployment — not manual server setup
- Per-client config: WABA credentials, AI keys, branding
- Automated backup and tested restore per instance
- Written migration plan into the multi-tenant system without data loss

This earns revenue and produces testimonials while the real platform is built. The deployment script gets reused.

---

## PHASE 1 — Tenant Isolation
Highest priority. Nothing ships before it.

- Tenant identifier on every table, enforced by database constraint
- Tenant identity inside the auth token; server derives it from the authenticated session
- Server must never trust a client-supplied tenant ID
- Scoping applied to every query, API route, socket connection, background job, webhook, upload, export, report and analytics query
- Automated cross-tenant access tests that must fail

Exit test: Two tenants create leads with identical names. Neither can see, edit, export or receive socket events for the other's data. Direct URL or API access returns 403.

---

## PHASE 2 — Identity and Access

- Public signup with email and mobile verification
- Invitation flow: one-time expiring link, user sets own password
- Never email a plaintext reusable password
- Forgot password and reset
- MFA for owner and admin
- Roles: Owner, Admin, Manager, Agent
- Login rate limiting, account lockout, session revocation on removal
- Staff impersonation only with logged consent, fully audited

Exit test: An invited user completes signup with no admin touching the database. An expired or reused invite link is rejected.

---

## PHASE 3 — Commercial Data Model
Build to the Pricing Specification exactly.

`products` · `plans` · `plan_prices` (versioned) · `plan_features` · `orders` · `order_items` · `subscriptions` (exact IST timestamps) · `module_entitlements` · `payments` · `payment_allocations` · `invoices` · `credit_notes` · `wallet_balances` · `wallet_transactions` · `credit_packs` (with expiry dates) · `usage_counters` · `usage_events` · `audit_events`

Exit test: A subscription created today on a 12-month term shows the correct end timestamp in IST. Changing a plan price does not alter any existing subscription.

---

## PHASE 4 — Entitlement Enforcement

- Server-side authorization on every route against tenant entitlements
- Every feature flag from the Pricing Specification enforced at write time
- Limits enforced when the record is created, not just displayed
- Navigation hides unpurchased modules — cosmetic only, never the security layer

Restated from the Pricing Specification: feature access derives from plan tier only. Billing mode never unlocks or removes a feature.

Exit test: A Nera Desk client gets 403 from every broadcast API including by direct URL. A 3-user plan cannot create a fourth user. A `PLATFORM_WALLET` client on `NW-GROW` has exactly the same feature set as an `ALL_INCLUSIVE` client on `NW-GROW`.

---

## PHASE 5 — Demo Sandbox
Build this early — it's the top of the sales funnel and it must cost nothing to run.

- Shared Nera demo WABA, not per-client numbers
- Sales team uploads a prospect's price list and FAQs, creating a demo knowledge base in minutes
- Prospect chats with the demo bot from their own phone
- Hard caps: 200 AI replies total, 7-day life, no CRM writes, no broadcasts, no exports
- Must never trigger WABA provisioning, Meta verification or an onboarding case
- Auto-archive on expiry, with a conversion prompt to the sales owner

Exit test: A demo is created and live within 15 minutes of receiving a prospect's price list, with no Meta interaction of any kind.

---

## PHASE 6 — Billing and Payments

- Public pricing page and plan selection
- Razorpay checkout: one-time and recurring mandate
- Webhook signature verification, idempotency, replay protection
- Offline payment: request → proof upload → finance approval → activation, requiring two different people
- GST-compliant invoices, sequential numbering, HSN/SAC, place of supply
- Credit notes and refunds
- Customer-visible billing history
- Daily reconciliation report

Exit test: A duplicated or replayed webhook creates exactly one payment record and one activation. An offline payment cannot activate until a second authorised person approves.

---

## PHASE 7 — Provisioning and Onboarding

- Verified payment triggers tenant creation, owner invite and entitlement assignment in one transaction — all or nothing
- Onboarding case with checklist: documents, WABA setup, number verification, knowledge base, templates, team invites, contact import
- Integration secrets in an encrypted secret store, masked in UI. Never in uploads or email
- Ops dashboard of every onboarding case, with stalled-case alerts
- Welcome pack sent automatically: login URL, invoice, support contact, training link

Exit test: A new paying customer reaches active status with zero direct database edits by anyone.

---

## PHASE 8 — Usage Metering

Meters: promotional messages · service messages · AI replies · AI images · emails · contacts · users · WhatsApp numbers.

- Meter at event time, never nightly batch
- Implement the non-billable exclusions from the Pricing Specification exactly
- Consumption order: included quota first, then oldest pack credit
- Pack credits carry over with expiry dates; included quota never does
- Track Meta cost, LLM cost and Business Agent token cost separately per tenant
- Abuse guards: 10 AI replies per contact per day, 3 per hour; context capped at last 10 messages plus KB summary; output capped at 200 tokens

Exit test: A tenant's monthly usage report reconciles exactly with the Meta and LLM provider invoices for that period.

---

## PHASE 9 — AUTOPILOT
This phase is the difference between a product and a job. Build it properly.

### 9.1 Renewal autopilot
- Auto-renew on the stored Razorpay mandate at term end
- Notices at 30, 15, 7 and 1 day before expiry
- Failed payment: retry day 1, 3, 5, 7 with escalating notices
- Grace → restricted → suspended → archived per the Pricing Specification, driven by scheduled jobs
- Reactivation on payment, automatically, without staff action
- Upgrades apply immediately with proration; downgrades queue to next renewal

### 9.2 Wallet and top-up autopilot
- Alert at 80% quota; low-balance alert below ₹500
- Auto-recharge debits the next pack and continues service
- Auto-recharge off: 24-hour grace, then AI pauses and conversations route to the human inbox with a visible banner
- Top-up blocked during grace, restricted and suspended — the renewal must be paid first
- Every debit produces an automatic receipt
- Pack expiry reminders at 30 days out

### 9.3 Onboarding autopilot
- Document checklist sent automatically on payment
- Reminders at day 2, 4 and 7 for missing items
- Client uploads through a secure portal — never email
- Template submission status polled from Meta and pushed to the client
- Go-live triggered automatically once every checklist item clears

### 9.4 Operations autopilot
- Weekly client report generated and sent, no human involved
- Monday founder report: new clients, churn, revenue, usage, margin per tenant, SLA breaches
- Quality-rating monitoring per WABA, alert on Yellow within 24 hours
- Messaging tier tracked per number; broadcasts exceeding the daily limit blocked at schedule time with a clear message
- Integration health checks: token expiry, webhook failure, mailbox bounce rate
- Automatic alert when any tenant drops below 35% gross margin

### 9.5 Support autopilot
- Tickets auto-assigned by `support_tier`
- SLA timer starts automatically; breach escalates to the founder
- Out-of-hours auto-response stating published support hours and next response time

Exit test: Run 30 days with zero manual staff intervention. Renewals process, failed payments retry and escalate, wallets recharge, reports send, alerts fire, and a new client onboards start to finish. Every state transition is in the audit log.

---

## PHASE 10 — Compliance and Launch Readiness

- Privacy policy, terms, DPA, consent capture with version, timestamp and IP
- DPDP Act: consent records for messaged contacts, data export and deletion on request
- Backup and tested restore
- Monitoring and alerting
- Security review including cross-tenant penetration test
- Support runbooks and rollback procedure

Exit test: No exported file, log, email, error response or analytics query leaks another tenant's data or any integration secret.

---

## PHASE 11 — Scale
Bulk onboarding via validated CSV · SSO · coupons and trials · reseller/partner model with revenue share · self-service plan changes · churn analytics.

---

## PHASE 12 — GCC Readiness (only after 30+ stable Indian clients)

- Arabic language support: interface, AI replies, templates
- Right-to-left interface layout
- Multi-currency: AED alongside INR
- UAE VAT-compliant invoicing alongside GST
- Per-country Meta rate cards in the pricing engine
- Timezone handling per tenant

Build the groundwork now, not later: language, currency and tax treatment must be tenant-level settings from Phase 3 onward. Retrofitting them into a live system is expensive and risky.

---

## Standing rules

1. No client goes live on the shared platform until Phase 1's exit test passes.
2. Every phase ships with its automated tests. No tests, not done.
3. No feature is gated by hiding a menu item alone.
4. No secret is ever stored in plaintext, logged, or emailed.
5. Every price, limit and rate comes from the Pricing Specification. Never hardcode a number in application logic.
6. Language, currency and tax are tenant-level settings from day one.
7. If a process needs a human to remember it, it isn't built.
8. Report progress against exit tests, not percentage complete.
