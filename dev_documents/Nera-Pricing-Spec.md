# Nera — Official Pricing Specification

Version 2.0 | 24 August 2026 | Approved by: Mohamed Kamarudeen B
For: development implementation
Status: single source of truth. Any price in any other document is superseded by this one.

## 1. Product structure

| Code | Line | Includes |
| :--- | :--- | :--- |
| `ND` | Nera Desk | Inbound AI + CRM. **No broadcasts.** |
| `NW` | Nera WhatsApp | Nera Desk + broadcasts + campaigns |
| `NC` | Nera Complete | Nera WhatsApp + email outreach |

## 2. Plan catalogue

### Nera Desk (`ND`)

| Field | `ND-LITE` | `ND-PRO` | `ND-MAX` |
| :--- | :--- | :--- | :--- |
| Display name | Lite | Pro | Max |
| Monthly price (₹) | 3999 | 9999 | 22999 |
| Onboarding fee (₹) | 4999 | 4999 | 9999 |
| `max_users` | 3 | 10 | -1 (unlimited) |
| `max_wa_numbers` | 1 | 2 | 5 |
| `max_contacts` | 2500 | 25000 | 100000 |
| `included_ai_replies` | 1000 | 4000 | 10000 |
| `included_service_msgs` | 2000 | 10000 | 25000 |
| `included_promo_msgs` | **0** | **0** | **0** |
| `included_ai_images` | 0 | 0 | 0 |
| `max_knowledge_bases` | 1 | 3 | -1 |
| `feature_broadcasts` | false | false | false |
| `feature_followup_automation` | false | true | true |
| `feature_lead_scoring` | false | true | true |
| `feature_api_access` | false | false | true |
| `feature_white_label` | false | false | false |
| `max_sub_accounts` | 0 | 0 | 0 |
| `support_tier` | standard | priority | premium |

### Nera WhatsApp (`NW`)

| Field | `NW-START` | `NW-GROW` | `NW-AGENCY` |
| :--- | :--- | :--- | :--- |
| Display name | Starter | Growth | Agency |
| Monthly price (₹) | 5999 | 12999 | 29999 |
| Onboarding fee (₹) | 9999 | 9999 | 19999 |
| Inherits from | `ND-LITE` | `ND-PRO` | `ND-MAX` |
| `included_promo_msgs` | 1000 | **2000** | **3000** |
| `included_ai_images` | 20 | 100 | 300 |
| `max_workflows` | 3 | -1 | -1 |
| `feature_broadcasts` | true | true | true |
| `feature_segmentation` | basic | advanced | advanced |
| `feature_ctwa_leads` | true | true | true |
| `feature_white_label` | false | false | true |
| `max_sub_accounts` | 0 | 0 | 5 |

**Hard rule:** `included_promo_msgs` must never exceed 3000 on any all-inclusive plan.

### Nera Complete (`NC`)

| Field | `NC-ENTRY` | `NC-GROW` | `NC-AGENCY` |
| :--- | :--- | :--- | :--- |
| Display name | Entry | Growth | Agency |
| Monthly price (₹) | 9999 | 24999 | 59999 |
| Onboarding fee (₹) | 19999 | 19999 | 34999 |
| Inherits from | `NW-START` | `NW-GROW` | `NW-AGENCY` |
| `max_mailboxes` | 3 | 12 | 30 |
| `max_domains` | 1 | 3 | 6 |
| `included_emails` | 6000 | 50000 | 150000 |
| `max_prospects` | 2500 | 25000 | 100000 |
| `feature_email_module` | true | true | true |
| `feature_mailbox_warmup` | true | true | true |

## 3. Billing modes

**The billing mode NEVER changes feature entitlements.**

**Mode A — `ALL_INCLUSIVE` (default)**
Monthly price includes Section 2 volumes. Overage from prepaid wallet at Section 6 rates.

**Mode B — `PLATFORM_WALLET`**

| Plan | Monthly fee (₹) |
| :--- | :--- |
| `ND-PRO` | 5499 |
| `ND-MAX` | 9999 |
| `NW-GROW` | 6999 |
| `NW-AGENCY` | 16999 |
| `NC-GROW` | 13999 |
| `NC-AGENCY` | 32999 |

**Wallet rates:** promo ₹1.05 · service ₹0.15 · AI reply ₹1.10 · email ₹0.08

**Hard validations:**
- Unavailable on `ND-LITE`, `NW-START`, `NC-ENTRY`. Reject at checkout.
- Minimum wallet recharge ₹5,000/month. Block activation below this.
- Minimum term 6 months. Reject `M1` and `M3`.
- All `included_*` values are **0** in this mode.
- **All feature flags remain exactly as the tier defines.**

## 4. Trial and pilot

### Free Demo — `DEMO-7`

| Field | Value |
| :--- | :--- |
| Price | ₹0 |
| Duration | 7 days |
| Runs on | **Nera's shared demo WABA — not the client's number** |
| Setup required | None. Knowledge base only |
| Entitlements | Demo sandbox: AI replies capped at 200 total, no CRM writes, no broadcasts, no exports |
| Client provides | Price list and FAQ content |
| On expiry | Sandbox archived. No data migration |

**Implementation note:** the demo must never trigger WABA provisioning, Meta verification or any onboarding case. It is a sales tool, not a tenant.

### Paid Pilot — `PILOT-14`

| Field | Value |
| :--- | :--- |
| Price | ₹2,999 |
| Duration | 14 days |
| Runs on | **Client's own number** — full WABA setup |
| Entitlements | `ND-LITE` |
| Conversion | Full ₹2,999 credited against first invoice |
| Auto-convert | **No.** Requires explicit customer action |
| On expiry without conversion | Read-only 30 days, then archive |

## 5. Term and discounts

| Term code | Multiplier | Discount |
| :--- | :--- | :--- |
| `M1` | × 1 | 0% |
| `M3` | × 3 | 5% |
| `M6` | × 6 | 10% |
| `M12` | × 12 | 15% |

`M12` additionally applies **50% off the onboarding fee**.

Round to the nearest rupee. Store the computed contract value on the subscription — never recompute from current prices later.

## 6. Overage rates (`ALL_INCLUSIVE` only)

| Meter | Rate (₹) |
| :--- | :--- |
| `promo_message` | 1.20 |
| `service_message` | 0.20 |
| `ai_reply` | 1.50 |
| `ai_image` | 10.00 |
| `email_sent` | 0.10 |

### Top-up packs

| Code | Units | Price (₹) | Validity |
| :--- | :--- | :--- | :--- |
| `PACK-AI-1K` | 1,000 AI replies | 1299 | 12 months |
| `PACK-AI-5K` | 5,000 AI replies | 5499 | 12 months |

### Recurring add-ons

| Code | Item | ₹/month |
| :--- | :--- | :--- |
| `ADD-USER` | Extra team user | 599 |
| `ADD-WANUM` | Extra WhatsApp number | 1999 |
| `ADD-MAILBOX` | Extra email mailbox | 599 |
| `ADD-EMAIL10K` | Extra 10,000 emails | 499 |
| `ADD-WHITELABEL` | White-label (non-Agency tiers) | 4999 |
| `ADD-KB` | Additional knowledge base | 1499 |

## 7. Quota, top-up and expiry rules

**Implement exactly. These rules protect subscription revenue.**

| Rule | Behaviour |
| :--- | :--- |
| Included quota | Resets on the billing date. **Never rolls over** |
| Purchased pack credits | **Roll over. Valid 12 months from purchase** |
| Consumption order | Included quota first, then oldest pack credit |
| Top-up while subscription active | Allowed, credited instantly |
| Top-up during grace period (days 1–7 after expiry) | **Blocked until renewal is paid** |
| Top-up while restricted or suspended | **Blocked** |
| Unused pack credits at renewal | Carry forward |
| Unused pack credits at cancellation | Forfeited. State this in the agreement |

**Critical:** a client must never be able to buy top-ups in place of renewing. Top-up extends quota, never the subscription term.

## 8. Wallet behaviour

| Trigger | Action |
| :--- | :--- |
| 80% of included quota | Alert on WhatsApp + email |
| 100% of quota | 24-hour grace credit begins |
| Grace + auto-recharge ON | Debit next pack, continue, notify |
| Grace + auto-recharge OFF | **AI pauses. All conversations route to human inbox** with a visible banner |
| Wallet balance below ₹500 | Low-balance alert |

**Absolute rule:** the AI must never silently stop replying.

## 9. Metering rules
Meter at event time, never nightly batch.

**Billable:** delivered promotional message · delivered service/utility message · AI-generated outbound message · AI image generated · delivered email

**NOT billable — explicit exclusions:**
- Failed or undelivered messages
- System retries
- AI drafts deleted before sending
- The AI's handover-to-human message
- Inbound customer messages
- Template approval submissions

**Billable AI unit:** one AI-generated outbound message, regardless of length. Not per token, not per conversation.

**Internal cost tracking (not billed):** record Meta message cost, LLM token cost and Meta Business Agent token cost separately per tenant, so gross margin per client is visible on the admin dashboard.

**Abuse guards:** 10 AI replies per contact per day · 3 per contact per hour · AI context capped at last 10 messages plus knowledge-base summary · AI output capped at 200 tokens.

## 10. Founding client flag

| Field | Value |
| :--- | :--- |
| Cap | 10 tenants |
| Effect | Section 2 prices locked 12 months from activation |
| Post-cap standard prices | Section 2 × 1.6, rounded to nearest ₹999 |
| Implementation | `is_founding_client` boolean; price snapshot stored on subscription |

Block the flag automatically once 10 tenants carry it.

## 11. Tax and display
- Prices stored and displayed **exclusive of GST**
- 18% GST added at invoice
- Label everywhere: "+ 18% GST"
- GST-compliant invoice: sequential numbering, HSN/SAC code, place of supply

## 12. Lifecycle policy

| State | Rule |
| :--- | :--- |
| Grace | Days 1–7 after expiry — full access, top-ups blocked |
| Restricted | Days 8–21 — read and export only, no sends |
| Suspended | Day 22 — no login, data retained |
| Archived | Day 90 — data exported and archived |
| Deleted | Day 180, or immediately on written request |

**Cancellation:** 30 days' notice. Unused prepaid months refunded pro-rata. Onboarding fee not refunded. Unused pack credits forfeited.

**Upgrade:** immediate, prorated. Unused included volumes carry to the new tier.
**Downgrade:** effective at next renewal only. Never mid-term.

## 13. Account-risk policy (must appear in the agreement)

| Event | Responsibility | Action |
| :--- | :--- | :--- |
| Template rejected | Nera | Rewrite and resubmit free, unlimited |
| Quality rating drops to Yellow | Nera | Alert client within 24 hours, advise |
| Number restricted — non-consented contacts | Client | We assist with appeal; no refund |
| Number restricted — client-insisted content | Client | We assist with appeal; no refund |
| Number permanently banned | Shared | Replacement within 48 hours; client pays Meta costs only |
| Platform outage or Nera error | Nera | Service credit for affected days |

**Messaging tier limits must be visible in the UI.** New accounts start at 1,000 business-initiated messages per 24 hours. Show current tier and remaining daily quota on the campaign screen. Block scheduling a broadcast that exceeds it, with a clear explanation.

## 14. Support SLA (published)

Hours: 10:00–19:00 IST, Monday to Saturday. Outside hours: critical outages only.

| `support_tier` | Plans | Channel | First response |
| :--- | :--- | :--- | :--- |
| `standard` | Lite, Starter, Entry | WhatsApp + email | Next working day |
| `priority` | Pro, Growth | WhatsApp, named person | Same working day |
| `premium` | Max, Agency | Priority WhatsApp + phone | 4 working hours |

Log every ticket against the tenant. Surface SLA breaches on the admin dashboard.

## 15. Rules enforced in code

1. Feature access derives from **plan tier only**. Billing mode never unlocks a feature.
2. `included_promo_msgs` ≤ 3000 on any `ALL_INCLUSIVE` plan.
3. No plan may be sold below **35% gross margin**. Admin dashboard flags any tenant below it.
4. Never display or promise "unlimited" for any metered resource.
5. Price changes create a new `plan_price` version. Existing subscriptions keep their version until renewal.
6. Top-ups are blocked during grace, restricted and suspended states.
7. The free demo never provisions a WABA or creates an onboarding case.
8. Every agreement carries the rate-change clause: included volumes revisable on 30 days' notice if Meta or any upstream provider changes rates.

## 16. Market scope (Phase 1)
Sales and onboarding limited to **Tamil Nadu and Puducherry**. Interface and AI must support Tamil and English. Build language as a tenant-level setting from the start — Arabic will be needed for the GCC phase, and retrofitting it later is expensive.
