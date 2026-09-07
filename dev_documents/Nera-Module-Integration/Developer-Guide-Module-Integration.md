# Nera — Module Integration Developer Guide

**Status:** Proposal — pending founder approval on Section 7 before implementation starts
**Scope:** How LeadOS, AllianceOS, Mafiya OS and ContentOS map into the Nera product, and which phase of the Nera Dev Brief each piece of work belongs to.
**Depends on:** `Nera-Dev-Brief.md` (12-phase roadmap), `Nera-Pricing-Spec.md` v2.0 (source of truth for ND/NW/NC), `Leados-AllianceOS-Subscription-Onboarding-Plan-and-Gap-Analysis.md` (code audit), `Mafiya-ContentOS-Module-Analysis.md` (code audit)

---

## 1. Why this document exists

The original Nera Dev Brief and Pricing Spec scope only covers LeadOS + AllianceOS, repackaged as three product lines: `ND` (Nera Desk), `NW` (Nera WhatsApp), `NC` (Nera Complete). Mafiya OS and ContentOS were explicitly **excluded** from that scope in the earlier subscription-planning documents.

Nera is now expanding to include all four modules. This document defines:
1. What each module becomes inside Nera.
2. What must change in each module's code before it can be sold as a tenant-isolated SaaS product line.
3. Which existing Dev Brief phase each change belongs to (no new top-level phase numbering where an existing one already fits).

---

## 2. Module → Nera product line mapping

| Current module | Nera product line | Status of the mapping |
| :--- | :--- | :--- |
| LeadOS | `ND` Nera Desk / `NW` Nera WhatsApp | **Already defined** in Pricing Spec v2.0 — no new product code needed. |
| AllianceOS | `NC` Nera Complete (the "+ email outreach" layer on top of `NW`) | **Already defined** in Pricing Spec v2.0 — AllianceOS is the engine behind NC's outreach/prospecting features. |
| Mafiya OS | `NL` — Nera Local *(proposed new code)* | **New.** Not in Pricing Spec. Needs founder approval — see Section 7. |
| ContentOS | `NS` — Nera Studio *(proposed new code)* | **New.** Not in Pricing Spec. Needs founder approval — see Section 7. |

### Why Mafiya OS and ContentOS need their own product lines, not a feature bolted onto ND/NW/NC

- **Different buyer / value proposition.** A client wanting WhatsApp lead response doesn't necessarily want Google Business Profile management or social content automation, and vice versa. Forcing them into one bundle hurts conversion (the existing docs already recommend against overselling with bundles the client doesn't need).
- **Different metering units.** Pricing Spec Section 9 meters AI replies, messages, emails — it has no unit for GBP posts, review replies, citation scans, videos processed, or social publishes. These need their own `plan_features` and `usage_counters` entries.
- **Different cost lines.** Margin tracking (Pricing Spec rule: "no plan may be sold below 35% gross margin") requires per-provider cost visibility. Mafiya OS costs come from Google Places/Business Profile + ValueSERP/Serper; ContentOS costs come from Groq/Gemini/OpenRouter + Meta/YouTube/LinkedIn Graph API quotas. Neither maps onto the existing Meta-message / LLM-token cost tracking built for ND/NW/NC.

---

## 3. Per-module remediation checklist

### 3.1 LeadOS + AllianceOS (existing scope — restated for completeness)

Already fully specified by Dev Brief Phases 1–8 and the Gap Analysis P0/P1 checklist. No new work items added here; this document does not change that plan. Key blocking item: **tenant isolation is currently missing** (server hardcodes tenant ID 1, JWT omits tenant_id) — nothing below for Mafiya OS/ContentOS can go live to external customers until this is fixed, since all four modules will share the same tenant/auth layer.

### 3.2 Mafiya OS → `NL` Nera Local

| # | Item | Why it blocks sale as a Nera product |
| :-- | :--- | :--- |
| 1 | Add server-side role/permission gating | Currently **none exists** — any authenticated user can reach `PlanManagement.jsx` (pricing) and `Usage.jsx` (API-cost data). This is worse than LeadOS's partial gating, not equal to it. |
| 2 | Remove or clearly label fabricated data | `Family.jsx` hardcodes `newReviews`/`directionRequests` to 0; `GbpInsights.jsx` falls back to a mock array and a fixed 58/20/16/6% device split with no "estimated" label; `StreetPosts.jsx` fabricates 365 days of fake per-post analytics. None of this can ship to a paying customer unlabeled. |
| 3 | Delete dead code | `mafiya-rivals.js` is an entire unused parallel backend generating random data — remove it before it misleads a future developer. |
| 4 | Fix mis-routed navigation | Sidebar's "Turf Control" link under Mafiya OS points to `/thedal/keyword-tracking`, a different module. |
| 5 | Unify token-refresh logic | GMB OAuth token-refresh-on-401 is copy-pasted across three files — consolidate before multiplying across tenants. |
| 6 | Define `NL` plan tiers and meters | No pricing tiers exist yet for this module. Needs a Pricing Spec addendum (GBP locations, review replies/month, posts/month, citation scans/month, competitor tracks). |
| 7 | Migrate `PlanManagement.jsx`'s limit checks into the shared Nera entitlement layer | Currently a standalone feature-limit system; once Phase 4 (Entitlement Enforcement) exists, this should not be a second parallel implementation. |

### 3.3 ContentOS → `NS` Nera Studio

| # | Item | Why it blocks sale as a Nera product |
| :-- | :--- | :--- |
| 1 | Add role/permission gating | `canApprove` is hardcoded `true` for any authenticated user; the Sidebar shows the full section to everyone. |
| 2 | Delete dead files | `ABMGroups_ApprovalDashboard.jsx`, `SocialConnectionView.jsx`, `ThumbnailBrain.jsx` + `ThumbnailGenerationFlow.jsx` (pure UI mockup with a fake progress bar and `alert()` calls) — none are imported anywhere live. |
| 3 | Rotate hardcoded secret | A hardcoded Meta app secret/app-ID fallback exists in `contentController.js` — rotate regardless of fallback-only usage. |
| 4 | Remove duplicate routing | `contentos.js` re-implements approve/reject logic already in `contentController.js` with inconsistent status casing and appears unused by the frontend — confirm and delete. |
| 5 | Fix schema bootstrap | `setup-contentos-db.js` is missing ~15 columns/status values the live controller depends on; a fresh environment cannot bootstrap from it today. |
| 6 | Decide scope of AI thumbnail generation | Backend fully supports it (`generatePoster`), but `ApprovalRoom.jsx` only allows manual upload and the dedicated service layer is never imported. Either wire it in or explicitly descope it for v1 — don't ship a half-connected feature silently. |
| 7 | Label or replace estimated analytics | Reach Report is a disclosed client-side estimate — keep the disclosure consistent everywhere it's shown, including any exports. |
| 8 | Fix inaccurate copy | TokenHealth claims "auto-alerts every 6h" (no matching cron exists); SchedulerView labels the cron "every 5m" when it actually runs every 1m. |
| 9 | Define `NS` plan tiers and meters | No pricing tiers exist yet. Needs a Pricing Spec addendum (videos processed/month, AI captions generated, connected social accounts, publishes/month). |

---

## 4. Phase mapping

The Dev Brief's 12 phases are architecture-level, not per-module — so Mafiya OS and ContentOS slot into the **same phases** as new product entries, plus one new sub-phase for module-specific hardening that has no equivalent severity in the original LeadOS/AllianceOS scope.

| Dev Brief Phase | LeadOS / AllianceOS (existing) | Mafiya OS → `NL` (new) | ContentOS → `NS` (new) |
| :--- | :--- | :--- | :--- |
| **Phase 1 — Tenant Isolation** | Add tenant_id everywhere; currently missing/critical | Reuses the same infra once Phase 1 lands — no separate tenant model needed | Reuses the same infra once Phase 1 lands |
| **Phase 1B — Module Hardening** *(new sub-phase, proposed)* | — | Items 1–5 in Section 3.2: gating, fake-data removal, dead code, routing fix | Items 1–5 in Section 3.3: gating, dead code, secret rotation, dedupe routing, schema fix |
| **Phase 3 — Commercial Data Model** | `products`/`plans` for ND/NW/NC (already specified) | Add `NL` product + `plan_features` for GBP-specific meters | Add `NS` product + `plan_features` for content-specific meters |
| **Phase 4 — Entitlement Enforcement** | Feature flags per Pricing Spec | Migrate `PlanManagement.jsx` limit checks into the shared entitlement layer | Migrate `canApprove`/publish gating into the shared entitlement layer |
| **Phase 6 — Billing and Payments** | Razorpay, wallet, GST invoices | Add Google Places/Business Profile + ValueSERP/Serper cost tracking per tenant | Add Groq/Gemini/OpenRouter + Meta/YouTube/LinkedIn cost tracking per tenant |
| **Phase 8 — Usage Metering** | Messages, AI replies, emails, contacts | GBP posts, review replies, citation scans, competitor checks | Videos processed, captions generated, publishes, connected accounts |
| **Phase 9 — Autopilot** | Renewal, wallet, onboarding, ops, support autopilot | Quality/response-SLA monitoring equivalent to WABA quality-rating alerts | Wire existing failed-publish retries and token-expiry checks into the weekly ops report |

**Standing rule carried over from the Dev Brief:** *"No client goes live on the shared platform until Phase 1's exit test passes."* This document extends that rule — **no external customer gets `NL` or `NS` access until Phase 1 AND Phase 1B both pass their exit tests**, regardless of how complete the module's own features are.

---

## 5. New exit tests to add

- **Phase 1B exit test:** An authenticated non-admin user cannot reach `PlanManagement.jsx`, `Usage.jsx`, or any pricing/cost screen in Mafiya OS or ContentOS. Direct API calls to those routes return 403.
- **Fake-data exit test:** No UI panel in Mafiya OS or ContentOS displays a fabricated number without an "estimated" label, or the fabricated fallback has been removed entirely.
- **Schema exit test:** A fresh environment can bootstrap the ContentOS database from a single, current migration path with no manual column patching.
- **Dead-code exit test:** Zero-importer search finds no orphaned files still present in the shipped build.

---

## 6. What this document does NOT decide

This is an engineering mapping document, not a commercial one. It does not set prices, tier limits, or bundling rules for `NL`/`NS` — those require a Pricing Spec addendum following the same format as `Nera-Pricing-Spec.md` Section 2, and founder sign-off the same way the existing spec was approved.

---

## 7. Open decisions for founder approval

| Decision | Options | Approved / fill in |
| :--- | :--- | :--- |
| Product code naming | `NL` (Nera Local) / `NS` (Nera Studio) / other names | ________________ |
| Bundling | Sold standalone / only as add-ons to existing tiers / included in a new "Full Suite" bundle | ________________ |
| Pricing tiers for `NL` and `NS` | None exist yet — requires Pricing Spec v2.1 addendum | ________________ |
| Go-live sequencing | Wait for full Phase 1–4 platform completion / ship an isolated interim tenant-isolation patch sooner (mirrors the SOP's "parallel track" for early LeadOS/AllianceOS clients) | ________________ |
| Ownership of Phase 1B work | Same team as Phase 1, or a dedicated cleanup pass before Phase 1B starts | ________________ |

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
