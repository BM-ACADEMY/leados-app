# ABM Groups — Master Knowledge Base
**For: KAI (LeadOS internal) · WhatsApp Auto-Responder (shared number, all brands) · AllianceOS AI Brain**
**Supersedes:** `BM_Academy_Master_Knowledge_Base.md` (BM Academy content is now Module 2 below, unchanged, re-tagged)
Last updated: [update when edited] · Owner: Karthika (content) · Kamar (approval)

> **Critical architecture note:** The WhatsApp number this AI Brain runs on (WABA 919944509441) is shared across **all 8 ABM Groups brands** — not BM Academy-exclusive. Every inbound message must pass through **brand detection FIRST**, before program/service detection. Answering a CoreTalents recruiter with BM Academy course pricing is a worse outcome than no automation. See `BRAND_ROUTER` below — this is the mandatory first chunk retrieved on every conversation.

> **Format note for dev:** Each `##` section is a self-contained RAG chunk. Every chunk now carries a `brand:` tag in addition to existing tags — filter on `brand:` first, then narrow by other tags.

---

## BRAND_ROUTER
tags: internal, brand-detection, ai-brain-only, mandatory-first-step

**Purpose:** identify which of the 8 ABM Groups brands an inbound message is about, BEFORE retrieving any program/service content.

| Brand | Signals to detect | Audience | Primary owner (routing) |
|---|---|---|---|
| **BM Academy** | course, training, program, placement, job, learn, student, admission | Students/job seekers | Kamar (closes ~80% direct) / counselor |
| **BM TechX** | agency, marketing services, ads for my business, website for my shop, SEO, social media management | Local business owners | Babila (SMM/Ads) / Imran (content) / delivery leads |
| **CoreTalents** | hiring, recruitment, placement fee, need staff, TPO, campus drive | Employers, colleges | Kamar / recruitment delivery lead |
| **Namma Pondy Properties (NPP)** | plot, property, land, villa, sq.ft, real estate, site visit | Buyers, investors, NRIs | Kamar / NPP delivery lead |
| **TravellersNeed** | trip, tour, package, IV trip, industrial visit, Pondicherry package | Students/colleges, families | Karthika (ops) / delivery lead |
| **Dada's Kitchen** | catering, food order, event food, wedding catering | Families, event planners | [confirm owner with Kamar] |
| **EduConsultants** | study abroad, visa, university admission, IELTS | Students wanting abroad study | [confirm owner with Kamar] |
| **BM Foundation** | CSR, donation, NGO, social work, sponsorship | CSR partners, community | [confirm owner with Kamar] |

**If brand is ambiguous** (e.g., "hi, I want to know more" with no other signal): AI Brain should ask ONE clarifying question — "Neenga edha pathi ketkareenga — course, agency services, jobs, property, illa trip?" — rather than guessing. Do not default to BM Academy just because it's the most common inbound topic; a wrong-brand answer damages trust across the whole ABM Groups relationship, not just one brand.

**Escalation default:** if a HOT lead's brand is unclear or spans multiple brands (e.g., a business owner asking about BM TechX services AND hiring via CoreTalents), route to Kamar directly — cross-brand opportunities are exactly the flywheel leads worth a human touch immediately.

---

## ABM_GROUPS_PROFILE
tags: company, brand, identity, all-brands

**ABM Groups** — multi-brand business ecosystem based in Kottakuppam, Pondicherry, Tamil Nadu. Founder & CEO: Kamarudeen BM (Kamar). Co-founder: Kamar's brother (opens ABM Groups Anniversary Week each Sept 5).

**Eight brands:**
1. BM Academy — digital skills training (see Module 2)
2. BM TechX — digital marketing agency (see Module 3)
3. CoreTalents — recruitment & placement (see Module 4)
4. Namma Pondy Properties (NPP) — real estate (see Module 5)
5. TravellersNeed — travel & college IV trips (see Module 6)
6. Dada's Kitchen — catering (see Module 7 — stub)
7. EduConsultants — study abroad (see Module 8 — stub)
8. BM Foundation — CSR (see Module 9 — stub)

**Team structure (for routing):**
- Kamar — strategy, sales closing, partnerships, high-score lead conversion (Friday audits)
- Karthika — admin/ops/SEO/WhatsApp coordination
- Babila — SMM and Meta Ads (BM TechX)
- Imran — video/design/creator delivery
- Role-based delivery leads — per technical program/service

**Shared contact:** WhatsApp 919944509441 (shared across all brands) · 94038 92971 (BM Academy admissions specific) · 99442 88271 (general/partnerships)

**Cross-brand flywheel** (mention when relevant to a cross-sell conversation): BM Academy trains → Velaivaaipu/CoreTalents place → BM TechX serves the employers those graduates work with. A BM TechX client could also be a BM Academy training prospect for their staff, etc.

---

## MODULE 2 — BM ACADEMY
tags: brand:bm-academy, module-header

*(All chunks below carry `brand:bm-academy` in addition to their existing tags. This is the most complete module in this KB — built first, most heavily used.)*

> **Editor's note on refund types:** BM Academy now runs two distinct refund mechanisms — don't conflate them in a response:
> 1. **Placement refund** (`POLICY_PLACEMENT_REFUND`) — 20% of fee back if not placed within 6–9 months, applies only to placement-tier (T2) programs.
> 2. **Enrollment/withdrawal refund** — a Week 1 / Week 2 sliding schedule (e.g., 60% before end of Week 1, 30% before end of Week 2, none after) that applies to withdrawing early from a program, listed per-program below.
> A student asking "can I get my money back" could mean either — clarify which before answering, or state both if genuinely unsure which applies.

### FLAGSHIP PLACEMENT PROGRAMS

### PROGRAM_DIGITAL_MARKETING_PRO
tags: brand:bm-academy, program, dm-pro, placement, student-facing

**Digital Marketing Pro** — flagship placement program.
- Duration: 3–5 months · Mode: Hybrid
- Tier 1 (Skill only): ₹14,999 — full curriculum, live campaign practice, career assistance. No placement guarantee, no refund.
- Tier 2 (Placement): ₹19,999 — everything in Tier 1 + placement support + **20% refund if not placed in 6–9 months** + 2 mock interviews + priority drives.
- EMI available on both tiers.
- Curriculum: Meta + Google Ads (live campaigns), SEO, AI tools for marketing.
- Ideal for: arts/commerce freshers, non-engineers, anyone wanting a fast (3-month) path to a digital job.
- Common fear: "I'm non-technical, will I get a decent job?" → most placed students are arts/commerce background; skill + portfolio matter more than degree.

> **Flag to Kamar:** `PROGRAM_FULL_STACK_DM_BUNDLE` below covers a very similar end-to-end scope (SEO+Ads+SMM+Content+Email+AI+Analytics) at ₹21,999/4 months. Confirm whether DM Pro and the Full Stack DM Bundle are meant to coexist as separate offers or whether one supersedes the other — answering a lead with both without this clarified risks looking inconsistent.

### PROGRAM_DATA_ANALYTICS
tags: brand:bm-academy, program, data-analytics, placement, student-facing

**Data Analytics** — salary-led placement program.
- Duration: 3 months · Mode: Hybrid
- Tier 1: ₹14,999 — Excel, SQL, Power BI, Python; real dashboard projects; career assistance.
  - Syllabus: https://drive.google.com/file/d/1hLTKlWAo8AfjoKbzxAuvuEmgfAMOBPI1/view
- Tier 2: ₹19,999 — + placement support + **20% refund if not placed in 6–9 months** + 2 mock interviews + portfolio review.
  - Syllabus: https://drive.google.com/file/d/1K_bKym9aLwGudUTlvbSpedKQ_yuXWFzC/view
- EMI available.
- Salary context: entry analyst roles typically ₹3–6 LPA; high demand; WFH/hybrid common.
- Common fear: "I'm weak in maths, too technical?" → start point is just Excel; tools taught step-by-step.

### PROGRAM_DATA_ANALYTICS_BOOTCAMP
tags: brand:bm-academy, program, data-analytics, bootcamp, skill-only, entry-level, student-facing

**Data Analytics Bootcamp** — short entry-level primer, feeds into the full Data Analytics Tier 1/Tier 2 program above.
- Duration: 10 days · Mode: [confirm — likely Hybrid, matching bootcamp pattern elsewhere in KB]
- Amount: ₹3,999 · EMI: [confirm]
- Refund: not specified — escalate refund questions to a human
- Salary context: none (bootcamp, not placement-tracked)
- Syllabus: https://drive.google.com/file/d/1Vh0qCEqQVRLdHsyrwiHH78WKfKiGrfLk/view
- Common fear: "Is this enough to actually get a job?" → No — this is a starter/primer; the full placement outcome is via Tier 1/Tier 2 Data Analytics above.

### PROGRAM_FULL_STACK_DEVELOPER
tags: brand:bm-academy, program, full-stack, placement, student-facing, premium

**Full Stack Developer** — premium placement program.
- Duration: 6 months · Mode: Hybrid
- Tier 1: ₹24,999 — full curriculum, all projects, GitHub portfolio, career assistance.
  - Syllabus: https://drive.google.com/file/d/189jAkS2YBhp9XILlepsDyy8gy_Vo5b-Z/view
- Tier 2: ₹34,999 — + placement support + **20% refund if not placed in 6–9 months** + 2 mock interviews + priority drives.
  - Syllabus: https://drive.google.com/file/d/1IxoK1896Zptl1Sjplkk4Hz2znmGNy5Z9/view
- EMI available.
- Curriculum: HTML/CSS/JS → React → Node/Express → MongoDB/APIs → capstone → interview prep.
- Common fear: "Not technical, market saturated?" → many top performers are non-CS; saturation is in fake-portfolio juniors; 20% refund removes financial risk.

### PROGRAM_UIUX_DESIGN
tags: brand:bm-academy, program, uiux, placement, student-facing

**UI/UX Design Professional**
- Bootcamp: ₹2,999 · Tier 1: ₹14,999 · Tier 2: ₹19,999 (placement + 20% refund guarantee)
- [Curriculum detail to be expanded — flag to Karthika]

### PROGRAM_AGENCY_ACCELERATOR
tags: brand:bm-academy, program, agency-accelerator, flagship, business-owner, student-facing, high-ticket

**Agency Accelerator** — "Build Your Own AI Marketing Agency in 90 Days"
- Standard: ₹29,999 · Limited-batch offer: ₹24,999 · EMI from ₹5,000/month.
- Duration: 12 weeks · Mode: Hybrid.
- Positioning: NOT a job program — building your own agency/business. "Learn. Get Clients. Earn. Be Your Own Boss."
- 12 modules: Foundations → AI Tools → SMM → Meta Ads → Google Ads/GMB → SEO → Content/Reels → Canva Design → Websites → WhatsApp Marketing → **Client Acquisition & Sales (most important)** → Pricing/Proposals/Scaling.
- Bonuses: 50+ proposal templates, sales scripts, AI prompt library, 100+ Canva templates, lifetime mentorship, certification.
- Key differentiator: **mentorship till your first client** (Module 11) — not "figure it out alone."
- **Never use the term "partner" or "BM TechX Partner Program"** — confuses students into thinking it's employment. Frame as the student owning their own independent agency.
- Overhead reframe: old-school agency burns ₹85,000/month (rent+staff+tools) before profit; solo AI-powered agency costs ~₹2-3k/month tools, profit from client #1 (~₹16k). "Employees illa, payroll tension illa. AI unga team."
- Income math: 3 clients × ₹18,999/mo = ₹56,997/month recurring (vs ₹25k/month job ceiling).
- Common fear: "Where will I get clients?" → Module 11 + ongoing mentorship covers this directly.

### DIGITAL MARKETING TRACK (starter → advanced)

### PROGRAM_DIGITAL_MARKETING_STARTER
tags: brand:bm-academy, program, dm-starter, student-facing

**Digital Marketing Starter Program**
- Audience: College students, job seekers & freshers, career switchers, entrepreneurs & business owners, freelancers, school/12th pass students, homemakers
- Duration: 45 days · Mode: Hybrid
- Amount: ₹7,999 · EMI available
- Refund: 70% before end of Week 1 · 30% before end of Week 2 · No refund after Week 2. Batch change allowed once with 7 days' advance notice.
- Salary context: ₹15,000–₹30,000/month (freshers) · ₹35,000–₹60,000+/month (1–3 yrs experience)
- Ideal for: Anyone starting a digital marketing career in 45 days.
- Common fear: "I have no marketing experience. Can I still learn and get a job?" → Yes — starts from basics, builds employer-relevant skills via practical projects + certification.
- Syllabus: https://drive.google.com/file/d/1uV0Wa5Gk5_N2ppXxiUlfGS66YhoDDG73/view

### PROGRAM_AI_POWERED_DM_PROFESSIONAL
tags: brand:bm-academy, program, ai-dm-professional, placement-adjacent, student-facing

**AI-Powered Digital Marketing Professional**
- Audience: College students, job seekers & freshers, career switchers, entrepreneurs & business owners, freelancers, school/12th pass students, homemakers
- Duration: 3 months · Mode: Offline / Online / Hybrid
- Amount: ₹14,999 · EMI available
- Refund: 60% before end of Week 1 · 30% before end of Week 2 · No refund after Week 2. **EMI students: instalments remain payable on withdrawal after Week 2.** Batch change allowed once with 7 days' notice. **Certificate issued only after full fee clearance.**
- Salary context: ₹25,000–₹45,000/month (freshers) · ₹50,000–₹80,000+/month (experienced)
- Ideal for: Anyone wanting to master AI-powered digital marketing and be job-ready in 3 months.
- Common fear: "AI is replacing digital marketers. Is it still a good career?" → Yes — professionals who know how to use AI tools are in higher demand; course teaches both AI and practical marketing skills.
- Syllabus: https://drive.google.com/file/d/16kR4qgzvhQCcvjGVGZRBCdR-d9bPzc_o/view

### PROGRAM_PERFORMANCE_MARKETING_ACCELERATOR
tags: brand:bm-academy, program, performance-marketing, agency-work, premium, student-facing

**Performance Marketing Accelerator**
- Audience: College students, job seekers & freshers, career switchers, entrepreneurs & business owners, freelancers, school/12th pass students, homemakers
- Duration: 4–5 months · Mode: Offline + Live Agency Work
- Amount: ₹24,999+ · EMI available
- Refund: 50% before Month 1/Week 2 · No refund after Week 2. **ISA students: ₹2,999 registration fee is non-refundable.** Batch change allowed once with 7 days' notice.
- Salary context: ₹30,000–₹50,000/month (freshers) · ₹60,000–₹1,20,000+/month (experienced/agency)
- Ideal for: Anyone starting a digital marketing career with hands-on live agency work.
- Common fear: "Ads are too complicated. Can I learn Meta & Google Ads without prior experience?" → Yes — starts from basics with hands-on campaigns and real-world practice.
- Syllabus: https://drive.google.com/file/d/1090r8JUeOlQ02GQ2e4NHk0f3KI_V_Qxh/view

### PROGRAM_FULL_STACK_DM_BUNDLE
tags: brand:bm-academy, program, full-stack-dm, bundle, student-facing

**Full Stack Digital Marketing Bundle**
- Audience: Students unsure between skills, Creator Program graduates wanting more, business owners/entrepreneurs, freelancers wanting higher-value clients
- Duration: 4 months · Mode: Hybrid
- Amount: ₹21,999 · EMI available
- Refund: 60% before end of Week 1 · 30% before end of Week 2 · No refund after Week 2. Seat confirmed only after payment. Non-transferable. Batch change allowed once with 7 days' advance notice. Certificate only after full fee clearance.
- Salary context: ₹25,000–₹45,000/month (freshers) · ₹50,000–₹1,00,000+/month (experienced)
- Ideal for: End-to-end digital marketing mastery (SEO, Google Ads, Meta Ads, SMM, content, email marketing, AI tools, analytics).
- Common fear: "Digital marketing is too vast. Can I really learn everything and get a job?" → Yes — with structured guidance, all core areas are covered hands-on.
- Syllabus: https://drive.google.com/file/d/10EELdu9IatnDUdfr6ku4JTYoJ5qpTFLv/view

> **Note (not in old KB):** This bundle's scope reads similar in spirit to the "Digital Marketing Pro" flagship above — flag to Kamar whether this bundle is its replacement.

### CONTENT & CREATOR TRACK

### PROGRAM_SOCIAL_MEDIA_CREATOR_BOOTCAMP
tags: brand:bm-academy, program, social-media-creator, bootcamp, skill-only, student-facing

**Social Media Creator Bootcamp**
- Audience: College students, job seekers & freshers, career switchers, entrepreneurs & business owners, freelancers
- Duration: 10 days · 2 hours/day · 20 total training hours · Mode: Hybrid
- Amount: ₹3,999 · EMI available
- Refund: 50% before Day 2 (valid reason) · No refund from Day 2 onward
- Salary context: none (skill/starter program, not placement-tracked)
- Common fear: "I'm not confident on camera. Can I still become a content creator?" → Yes — no influencer status needed; covers content planning, scripting, editing, and growth strategy.
- Syllabus: https://drive.google.com/file/d/1xSclKumtK7un2YqEGtGFtfRjJvFUIC6q/view

### PROGRAM_DIGITAL_CONTENT_CREATOR
tags: brand:bm-academy, program, content-creator, skill-only, student-facing

**Digital Content Creator Program**
- Audience: Aspiring creators/YouTubers/Instagrammers, small business owners, working professionals, teachers/coaches/trainers, freelancers wanting content income
- Duration: 6 weeks · Mode: Hybrid
- Amount: ₹12,999 · EMI available
- Refund: 60% before end of Week 1 · 30% before end of Week 2 · No refund after Week 2. Seat confirmed only after payment. **Non-transferable.** Batch change allowed once with 7 days' advance notice. Certificate only after full fee clearance.
- Salary context: ₹20,000–₹40,000/month (jobs) · Freelancing: ₹30,000–₹1,00,000+/month
- Income paths (from original curriculum notes): client content (₹8k–25k/client/mo), editing services (₹500–2k/video), personal brand.
- Ideal for: Anyone wanting to master content creation, SMM, and AI-powered creative tools in 6 weeks.
- Common fear: "There are already too many content creators. Can I still succeed?" → Yes — success is about strategy and quality, not volume; course covers personal brand and audience growth with AI tools.
- Syllabus: https://drive.google.com/file/d/1d28V5I5z8XlYabt36q0NNVmSszTibma1/view

### PROGRAM_VIDEO_EDITING_BOOTCAMP
tags: brand:bm-academy, program, video-editing, bootcamp, skill-only, student-facing

**Video Editing Bootcamp**
- Audience: CapCut editors going pro, creators wanting to self-edit, freshers wanting editor jobs, wedding/event photographers adding video services, aspiring freelance editors
- Duration: 7 days · Mode: Online
- Amount: ₹2,999 · No EMI
- Refund: not specified — escalate refund questions to a human
- Salary context: none (short bootcamp, not placement-tracked)
- Common fear: "I have no editing experience. Can I still become a professional video editor?" → Yes — beginner-friendly, step-by-step, industry-standard techniques + AI-powered editing tools.
- Syllabus: https://drive.google.com/file/d/1TK8c7Fzc6bC7-HTmxuwh1a4PRAMETDy-/view

### PROGRAM_VIDEO_EDITING_PROFESSIONAL
tags: brand:bm-academy, program, video-editing, placement-adjacent, student-facing

**Video Editing Professional**
- Audience: same as bootcamp, going deeper
- Duration: 6 weeks · Mode: Offline / Online / Hybrid
- Amount: ₹11,999 · EMI available
- Refund: 60% before end of Week 1 · 30% before end of Week 2 · No refund after Week 2. Batch change once with 7 days' notice. Certificate after full fee clearance.
- Salary context: ₹20,000–₹35,000/month (freshers) · ₹40,000–₹80,000+/month (experienced/freelance)
- Common fear: "I have no editing experience and don't know any software. Can I still learn?" → Yes — starts from basics, hands-on with industry-standard tools.
- Syllabus: https://drive.google.com/file/d/1gDcTZdUq2L9DDhg-nNKF81tLUGkYWpxu/view

### DESIGN TRACK

### PROGRAM_DESIGN_BASICS_BOOTCAMP
tags: brand:bm-academy, program, graphic-design, bootcamp, skill-only, student-facing

**Design Basics Bootcamp**
- Audience: Canva/PicsArt hobbyists, students wanting agency/brand design jobs, social media managers, entrepreneurs handling own brand identity, aspiring freelance designers
- Duration: 7 days · Mode: Online
- Amount: ₹2,999 · No EMI
- Refund: not specified — escalate to a human
- Salary context: none
- Common fear: "I can't draw or I'm not creative. Can I still become a designer?" → Yes — design is a learnable skill; covers principles, tools, and practical projects from the ground up.
- Syllabus: https://drive.google.com/file/d/1nkt-42FwF5guyaOQsmA3SI67rDMMFwXO/view

### PROGRAM_GRAPHIC_DESIGN_PROFESSIONAL
tags: brand:bm-academy, program, graphic-design, placement-adjacent, student-facing

**Graphic Design Professional**
- Audience: same as Design Basics, going deeper
- Duration: 6 weeks · Mode: Online
- Amount: ₹11,999 · EMI available
- Refund: 60% before end of Week 1 · 30% before end of Week 2 · No refund after Week 2. Batch change once with 7 days' notice. Certificate after full fee clearance.
- Salary context: ₹20,000–₹35,000/month (freshers) · ₹40,000–₹70,000+/month (experienced/freelance)
- Common fear: "I have no design experience. Can I still get a graphic design job?" → Yes — fundamentals-first, with portfolio-building and industry-standard tools.
- Syllabus: https://drive.google.com/file/d/1IGJb2YSwsOt_xUlhjXTtRr5CxCAnY6Iy/view

### WEB / WORDPRESS TRACK

### PROGRAM_WEB_DESIGN_BASICS
tags: brand:bm-academy, program, web-design, bootcamp, skill-only, no-code, student-facing

**Web Design Basic Program**
- Audience: Beginners, no coding required
- Duration: 7 days · Mode: Online
- Amount: ₹2,999 · No EMI
- Refund: not specified — escalate to a human
- Salary context: none
- Common fear: "I don't know coding. Can I still learn web design?" → Yes — starts from basics with beginner-friendly tools.
- Syllabus: https://drive.google.com/file/d/1P758ymghSLLJHvmgQKot7ox7hFBTJ-4h/view

### PROGRAM_WORDPRESS_WEB_DESIGN_PROFESSIONAL
tags: brand:bm-academy, program, wordpress, no-code, freelance, student-facing

**WordPress Web Design Professional Program** *(formerly listed as "WordPress Pro" — same core price/duration, more detail here)*
- Duration: 8 weeks · Mode: Online
- Amount: ₹12,999 · EMI available
- Refund: 60% before end of Week 1 · 30% before end of Week 2 · No refund after Week 2. Batch change once with 7 days' notice. Certificate after full fee clearance.
- Salary context: ₹20,000–₹40,000/month (freshers) · ₹50,000–₹1,00,000+/month (experienced/freelance)
- Curriculum (from original notes): WordPress + Elementor, business/e-commerce/landing sites, hosting/domain/deploy, client-getting + pricing, 3+ live portfolio sites.
- Common fear: "I don't know coding. Can I still build professional websites with WordPress?" → Yes — little to no coding needed; course covers client-getting too.
- Syllabus: https://drive.google.com/file/d/1Dv8xPEDn0FItCQk0S42Synh5eO4Biqw0/view

### AI TOOLS TRACK

### PROGRAM_AI_STARTER_BOOTCAMP
tags: brand:bm-academy, program, ai-tools, bootcamp, skill-only, entry-level, student-facing

**AI Starter Bootcamp**
- Audience: Working professionals, entrepreneurs, students/freshers, marketers/creators, teachers/educators, HR/admin, anyone in another BM Academy program
- Duration: 5 days · Mode: Hybrid
- Amount: ₹1,999 · EMI available
- Refund: not specified — escalate to a human
- Salary context: none
- Common fear: "I have no technical background. Can I still learn AI?" → Yes — beginner-designed, practical, no coding required.
- Syllabus: https://drive.google.com/file/d/1sjGQ_TYHP2omAgcTBDLhKdCIFEsSIchF/view

### PROGRAM_AI_TOOLS_MASTERY
tags: brand:bm-academy, program, ai-tools, skill-only, student-facing

**AI Tools Mastery Program** — deeper follow-on to AI Starter Bootcamp above.
- Audience: same as AI Starter Bootcamp, going deeper
- Duration: 4 weeks · Mode: Hybrid
- Amount: ₹8,999 · EMI available
- Refund: 60% before end of Week 1 · 30% before end of Week 2 · No refund after Week 2. Batch change once with 7 days' notice. Certificate after full fee clearance.
- Curriculum: power prompting (ChatGPT/Gemini/Claude), AI content + images, automation, applying AI to study/job/business.
- Positioning: foundation skill for any career, not a placement program. Positioned as a 20–40% earning boost across any profession for those who use AI tools well.
- Common fear: "Free on YouTube, why pay?" / "There are so many AI tools, how do I know which ones to use?" → structured, hands-on, applied to your use-case; course curates the right tools for real-world tasks.
- Syllabus: https://drive.google.com/file/d/11-aloNBPtY2NGh0K_yuXgnTEdqXd-a0X/view

### KIDS & TEENS TRACK
tags: brand:bm-academy, program-family, kids-teens, new-segment, parent-facing

> **Routing note:** For these three programs, the lead contact is typically a **parent**, not the student. Adjust tone (see `AI_RESPONSE_STYLE_GUIDE`) — parent-facing reassurance, not peer-to-peer career framing.

### PROGRAM_AI_FUN_LAB_FOR_KIDS
tags: brand:bm-academy, program, kids, ai-tools, parent-facing

**AI Fun Lab for Kids**
- Audience: School students, Class 6–8
- Duration: 5 days · 1.5 hours/day · Mode: Hybrid
- Amount: ₹999 · No EMI
- Refund: not specified — escalate to a human
- Salary context: n/a (kids' program)
- Positioning: Zero-pressure, no-coding introduction to AI — creating art, writing stories, answering questions, school project help. Builds confidence using technology creatively.
- Syllabus: https://drive.google.com/file/d/15lQVN-T7zGfH-uCJi1XH0H6VE7FLQhf5/view

### PROGRAM_AI_SKILLS_FOR_TEENS
tags: brand:bm-academy, program, teens, ai-tools, parent-facing

**AI Skills for Teens (Class 9–11)**
- Duration: 10 days · 2 hours/day · Mode: Hybrid
- Amount: ₹1,999 · EMI available
- Refund: 50% before Day 3 · No refund from Day 3 onward
- Salary context: n/a
- Positioning: A 2-year head start before AI skills become as expected as MS Office — practical AI tools, personal brand basics, intro to earning from digital skills.
- Syllabus: https://drive.google.com/file/d/1T3ffKgvASOJ2iKQYPk0hO0r_ImR5pqYY/view

### PROGRAM_PRE_COLLEGE_AI_DIGITAL
tags: brand:bm-academy, program, class-12, gap-period, parent-facing

**Pre-College AI + Digital (Class 12)**
- Audience: Class 12 students (2025–2026 academic year, any stream) and students who just passed 12th (age 17–18) — no minimum stream requirement
- Duration: 3 weeks (targeted at the post-12th gap/waiting period) · Mode: Hybrid
- Amount: ₹6,999 · EMI available
- Refund: 60% before Day 3 · No refund from Day 3 onward. Batch change allowed once with 5 days' notice. Certificate only after full fee clearance.
- Salary context: n/a
- Positioning: Uses the college-admission-results waiting period productively — AI tools, content creation, personal brand, digital career basics. Framed as "3 weeks that create a 4-year advantage" through college.
- Syllabus: https://drive.google.com/file/d/1v3NRUhsU5W5grz55eDHIBd1wf-i08IRf/view

### POLICIES

### POLICY_PLACEMENT_REFUND
tags: brand:bm-academy, policy, refund, placement

Applies to: DM Pro (T2), Data Analytics (T2), Full Stack (T2), UI/UX (T2).
**20% of course fee refunded if not placed within 6–9 months.** Eligibility (all required): 75% attendance, all assignments/projects submitted, both mock interviews completed, full fee paid. Always state eligibility conditions alongside the refund promise — never quote one without the other.

### POLICY_EMI
tags: brand:bm-academy, policy, payment

EMI available on all BM Academy programs unless stated otherwise. Agency Accelerator EMI from ₹5,000/month. Exact tenure/interest: confirm with finance before quoting specifics beyond what's listed here.

### POLICY_SCHOLARSHIP
tags: brand:bm-academy, policy, discount

Max 2 scholarships per batch across programs. Do not imply unlimited or blanket-percentage discounts. Escalate scholarship requests to a human — AI Brain should not promise scholarship availability without checking current batch status.

### OBJECTION_HANDLING_FAQ_BM_ACADEMY
tags: brand:bm-academy, faq, objections

**"No experience — can I join?"** → Yes, every program starts from fundamentals; most placed students are non-tech background.
**"Will I really get a job/client?"** → Placement tiers: support + 20% refund (state conditions). Agency Accelerator: mentorship through first client, not solo figure-it-out.
**"Online or in-person?"** → Hybrid — confirmed during counseling call.
**"Discount available?"** → Do not offer ad-hoc discounts. Scholarships capped at 2/batch — escalate to human.
**"Want to talk to someone"** → Always available — offer WhatsApp 94038 92971 or a free 1:1 call/demo.

---

## MODULE 3 — BM TECHX
## 1. ABOUT BM TECHX

- BM TechX ("Grow with Kamar") is a digital growth agency for local businesses in Pondicherry and Tamil Nadu.
- Founder & CEO: Kamar — 14+ years running businesses in Pondicherry/Tamil Nadu, manages 7+ business verticals (education, real estate, food, travel, and more).
- Part of ABM Groups: BM Academy, CoreTalents, Namma Pondy Properties, TravellersNeed, Dada's Kitchen, BM Foundation.
- Location: Kottakuppam, Pondicherry. Serves Pondicherry + all of Tamil Nadu.
- Website: bmtechx.in | Instagram: @growwithkamar
- Contact (primary, use in all replies): **+91 94038 92971** (WhatsApp/Call) | Email: admin@bmtechx.in
- Response promise: reply within 2 business hours.

### Key achievements
- 750+ businesses served
- 1,400+ students trained
- 14+ years in the market
- 50+ verified 5-star Google reviews (4.9/5.0 rating)
- ₹40L+ ad revenue generated for clients, 4.1x average ROAS
- 90% client retention
- Serves 2 states: Pondicherry + Tamil Nadu

### What makes BM TechX different
- Local market experts — deep knowledge of Pondicherry & Tamil Nadu customers
- Founder-led strategy — Kamar personally reviews every client plan
- Full in-house team (strategy, ads, video, design, ops) — no outsourcing
- One-stop partner: GMB + Social Media + Website + Ads + Content under one roof
- ROI-focused monthly reports with real numbers (calls, leads)
- Fast execution — most clients see initial results within 30 days
- "Chennai agency results at Pondicherry prices" — top quality at ~40% less than Chennai rates

---

## 2. PROBLEMS WE SOLVE (use these to qualify leads)

- Not appearing on Google Maps when customers search "near me" → competitors get the call
- Inactive Instagram/Facebook → looks like a closed business, trust drops
- No professional website → losing credibility before the first conversation
- WhatsApp enquiries unanswered or untracked → revenue leaking daily
- Competitors investing in digital and moving faster every month

---

## 3. CORE SERVICES

1. **Google Business Profile (GMB) SEO** — appear on Google Maps for local "near me" searches
2. **Social Media Management** — reels, posts, stories that generate leads on Instagram/Facebook
3. **Website Development** — professional, mobile-first sites with WhatsApp integration
4. **Website SEO** — rank higher organically on Google
5. **Meta Ads (Facebook/Instagram)** — targeted paid campaigns
6. **Google Ads** — search campaigns for high-intent keywords
7. **Content Creation** — video, photography, drone shoots, reel editing (in-house)
8. **WhatsApp / Lead Automation (LeadOS)** — chatbots, drips, broadcasts, CRM pipeline

### How we work (4 steps)
1. **Free Consultation** — free 30-minute audit of your current online presence and goals
2. **Custom Growth Plan** — strategy specific to your business type, location, competition
3. **Execution & Delivery** — our team handles everything; you focus on your business
4. **Monthly Review** — results reviewed, reported, and optimized every month

---

## 4. PRICING — STANDARD PLANS (as listed on bmtechx.in — always say "starting from"; subject to change)

### 4.1 Google Business (GMB) SEO — monthly
| Plan | Price | Recommended | Includes |
|---|---|---|---|
| Starter | ₹2,999/mo | 3 months | Profile optimization, service & description setup, 4 Google posts/month, basic keyword optimization, customer trust signals |
| Growth (Most Popular) | ₹4,999/mo | 3–6 months | Everything in Starter + 8 posts/month, review growth strategy, competitor analysis, Q&A + local keyword optimization |
| Business | ₹8,999/mo | 6 months | Everything in Growth + citation building, advanced local SEO, weekly optimization, priority support |

Expected results: appear on Maps → top Maps rankings → dominant local presence with consistent lead flow.

### 4.2 Social Media Management — monthly
| Plan | Price | Recommended | Includes |
|---|---|---|---|
| Starter | ₹6,999/mo | Month-to-month | 4 reels + 6 posts/month, captions & hashtag research, brand voice setup, content calendar |
| Growth (Most Popular) | ₹8,999/mo | 3 months | 8 reels + 8 posts/month, story content, monthly content planning, engagement monitoring |
| Business | ₹14,999/mo | 6 months | 12 reels + 12 posts/month, story & community management, GMB Starter plan included, priority delivery |

### 4.3 Website Development — one-time
| Package | Price | Includes |
|---|---|---|
| Single Landing Page | ₹2,999 | Domain + hosting (1 yr), mobile responsive, WhatsApp integration, contact form, basic SEO |
| Business Website (Most Popular) | ₹4,999 | Up to 5 pages, domain + hosting, WhatsApp integration, basic SEO, mobile responsive |
| Premium / E-commerce | ₹9,999+ | Custom design, advanced features, e-commerce ready, SEO structure, speed optimized |

### 4.4 Website SEO — monthly
| Plan | Price | Includes |
|---|---|---|
| Starter | ₹4,999/mo | Up to 5 keywords, on-page optimization, meta & content fixes |
| Growth (Most Popular) | ₹8,999/mo | Up to 10 keywords, on-page + technical SEO, monthly ranking report |
| Business | ₹14,999/mo | Up to 20 keywords, full technical SEO, link building |

### 4.5 Paid Ads Management — monthly (ad spend billed separately)
- Meta Ads Management: ₹4,999/mo — strategy, audience targeting, creatives & copy, monthly report
- Google Ads Management: ₹4,999/mo — search campaign setup, keyword bidding, A/B testing, monthly report
- Recommended minimum ad budget: ₹9,000/month (paid directly to Meta/Google)

### 4.6 Combo Packages (best value)
| Combo | Price | Includes | Best for |
|---|---|---|---|
| Starter Growth Kit | ₹9,999/mo | GMB Starter + Social Media Starter + WhatsApp setup | New businesses getting started online |
| Business Boost System | ₹14,999/mo | GMB Growth + Social Media Growth + Website SEO Starter + monthly review | Consistent leads & brand visibility |
| Complete Digital System (Best Value) | ₹24,999/mo | GMB Business + Social Media Business + Website + SEO + Meta Ads management | Full-funnel digital domination |

### 4.7 One-time & add-on services
- Video shoot: ₹3,500+
- Drone shoot: ₹3,000+
- Photography: ₹2,500+
- Reel editing: ₹300+/reel
- GMB setup: ₹1,500
- Instagram/Facebook setup: ₹1,500
- WhatsApp Business setup: ₹1,500

---

## 5. PREMIUM INDUSTRY PLANS (from Portfolio 2026 — confirm current availability/pricing before quoting; all prices + GST)

These are full-service retainer plans tailored by industry (Healthcare, Education & Coaching, Real Estate, Food & Catering, Retail & Services):

| Plan | Price | 3-Month Bundle | For |
|---|---|---|---|
| Brand Starter | ₹9,999/mo + GST | ₹26,999 (save ₹3,000) | New business with no digital presence |
| Growth Engine (Most Popular) | ₹18,999/mo + GST | ₹49,999 (save ₹7,000) | Established business wanting consistent leads |
| RE Growth Engine (Real Estate) | ₹22,999/mo + GST | ₹59,999 (save ₹9,000) | Plot promoters, builders — drone reels, site visits, NRI targeting |
| Market Leader | ₹29,999/mo + GST | ₹77,999 (save ₹12,000) | Full digital domination — Google + Meta + CRM + automation |

Typical inclusions by tier:
- **Brand Starter:** GMB setup + optimization, 8–10 posts/month, 1 Meta awareness campaign, WhatsApp broadcast 2x/month, monthly report
- **Growth Engine:** GMB management 3x/week, 4–8 reels + 8–12 posts/month, 2 Meta lead campaigns, WhatsApp chatbot/drip automation, review generation, bi-weekly strategy call, 1 content shoot/month (Pondicherry zone)
- **Market Leader:** Everything in Growth Engine + Google Search Ads, LeadOS CRM + WhatsApp pipeline, re-engagement automation, competitor tracking + monthly audit, weekly 60-min strategy call, 2 shoots/month + drone on request

### LeadOS Automation (WhatsApp CRM)
- LeadOS Basic (500 contacts): ₹3,000
- LeadOS Standard (2,000 contacts): ₹5,000
- LeadOS Premium (full automation): ₹8,000

### Content & shoots (Portfolio menu)
- Basic shoot (2 hrs, Pondicherry zone): included in Growth/Market Leader plans
- Premium shoot (4 hrs, 2 locations): ₹4,999
- Outstation shoot within 60 km: ₹6,999 | 60–150 km: ₹9,999
- Drone shoot (Pondicherry zone): ₹4,999
- Logo design: ₹2,999 | Full brand kit: ₹7,999

---

## 6. PAYMENT & COMMITMENT TERMS

- Minimum engagement: 3 months for all retainer plans (needed for meaningful, measurable results)
- Recommended: 6 months for consistent lead generation and rankings; 6-month retainer gets an additional 5% off bundle price
- Retainers: 50% advance + 50% on delivery for Month 1; Month 2 onwards billed in advance
- One-time projects (websites etc.): 50% advance → 25% on preview approval → 25% on final delivery
- Ad spend (Meta/Google) is separate from management fees
- Cancellation: 30-day written notice; advance for the active month is non-refundable
- Payments are non-refundable once work begins
- Results vary by industry, competition level, and geography — no fake guarantees

---

## 7. CASE STUDIES & PROOF (use when leads ask "do you have results?")

**Dental Clinic — Raahath Dental Care, Pondicherry** (GMB + Social Media + Meta Ads)
- Google calls: 12/month → 47/month (+292%)
- Maps rank: Page 3 / not listed → Top 3 / #1 dentist in Pondicherry
- Reviews: 3 → 41 five-star reviews
- New patients: 18/month → 67/month by month 3; 4.1x ROAS; ₹210 cost per lead
- Quote: "We were invisible on Google. BM TechX got us to number one in two months."

**NEET Coaching Centre — Villupuram** (Instagram + Meta Lead Ads + WhatsApp drip)
- 340 leads in 45 days at ₹235/lead; batch fill 60% → 95%
- Instagram: 0 → 2,100+ followers in 90 days; enquiries 12/month → 85/month

**Real Estate — Marakkanam Corridor plot project** (Drone reels + Meta Ads + WhatsApp broadcast)
- 19 plots sold, ₹2.4 Crore revenue closed in 58 days; 34 site visits; 3.2x ROAS
- Quote: "The drone reel got shared in 14 WhatsApp groups without us asking."

**Cloud Kitchen — Pondicherry** (Reels + GMB + bulk WhatsApp)
- Daily orders: 8–10 → 38–42 (4x growth); ₹3.8L catering revenue in Q1
- Instagram: 140 → 4,800+ followers; GMB 4.7★ with 64 reviews; one reel hit 80,000 views in 2 days

**Interior Design Studio — Chennai** (Website + SEO + Google Ads + Instagram)
- Website live in 10 days; 84 qualified leads in 30 days at ₹280/lead
- Page 1 Google for 4 keywords; enquiries 3–4/month → 52/month; projects 1–2 → 5–6/month

**Doors Manufacturer — Vajra Doors, Tamil Nadu** (Website + Meta Ads + GMB)
- Website leads: 0 → 28/month; ad enquiries: 0 → 40+/month; daily WhatsApp enquiries

**RO Water Purifier Dealer — Ramya Agencies, Pondicherry** (GMB + Instagram)
- GMB views: 120 → 890/month (+641%); calls: 4 → 22/month (+450%); followers: 180 → 1,240

### Client testimonials (short versions)
- Mani S., Restaurant, Pondicherry: "400+ profile views a week, 10–15 calls a month just from Maps."
- Priya R., Interior Studio, Chennai: "First online inquiry converted into a ₹2 lakh order within 60 days."
- Farooq A., Catering, Pondicherry: "Consistent catering booking inquiries; reels look premium."
- Lakshmi V., Physio Clinic, Villupuram: "GMB results visible in the first month itself."
- Rajan K., Education Center, Cuddalore: "Enrollment doubled in 6 months."
- Sumitha N., Boutique, Pondicherry: "WhatsApp inquiries up within 2 weeks of website launch."

---

## 8. FAQ (bot answers)

**Q: How soon will I see results?**
A: Most clients see initial results within 30 days. For meaningful, measurable growth we recommend a minimum of 3 months, and 6 months for consistent lead generation. 90 days is our benchmark for real results.

**Q: What does it cost?**
A: Plans start from ₹2,999/month for GMB SEO. Combo packages start at ₹9,999/month. The right plan depends on your business — book a free 30-minute consultation and we'll recommend the best fit. (Prices may change; final quote on call.)

**Q: Is ad spend included in the fee?**
A: No. The management fee covers strategy, setup, creatives, and optimization. Ad budget (minimum ₹9,000/month recommended) is paid directly to Meta/Google.

**Q: Do I need to sign a long contract?**
A: Minimum commitment is 3 months — digital growth needs time to compound. 3-month bundles save money, and 6-month retainers get an extra 5% off.

**Q: What if I only want a website?**
A: One-time website packages start at ₹2,999 (landing page) and ₹4,999 (5-page business site), including domain, hosting, WhatsApp integration, and basic SEO.

**Q: Do you work outside Pondicherry?**
A: Yes — we serve all of Tamil Nadu. Content shoots outside the Pondicherry zone have an outstation charge (from ₹4,999).

**Q: Who will handle my account?**
A: A full in-house team (strategist, ads, video, design, ops) — no outsourcing. Founder Kamar personally reviews every client plan.

**Q: How do I know it's working?**
A: Every plan includes a monthly performance report with real numbers: calls, leads, rankings, reach.

**Q: Is there a refund?**
A: Payments are non-refundable once work begins. Cancellation requires 30-day written notice.

**Q: How do I start?**
A: Book a FREE 30-minute Business Growth Consultation. We'll audit your online presence and show exactly what's holding your business back — zero cost. WhatsApp/Call **+91 94038 92971**. We respond within 2 business hours.

**Q: Which industries do you specialize in?**
A: Healthcare (dental, clinics, physio, labs), Education & Coaching (NEET, tuition, colleges), Real Estate (plots, builders, brokers), Food & Catering (cloud kitchens, restaurants, caterers), and Retail & Services (jewellery, salons, gyms, boutiques, home services).

**Q: How many clients do you take?**
A: We onboard a limited number of new clients per month (about 5) to maintain quality — priority is first come, first served.

---

## 9. LEAD QUALIFICATION FLOW (for the bot)

When a new lead messages, collect in this order (one question at a time):
1. Business name and type (industry)
2. Location (city/town)
3. Main goal: more calls? more walk-ins? online orders? enquiries?
4. Current status: Do they have GMB / Instagram / website already?
5. Budget comfort (suggest a plan tier accordingly)
6. Then: offer the FREE 30-minute consultation and share the booking contact **+91 94038 92971**.

**Objection quick-replies (psychology-based):**
- "Too costly" → "Totally understand. Quick question — how many customer calls do you get in a month right now? Most of our clients found they were losing more than ₹4,999 in missed customers every week. That's why the first audit is free — you'll see the exact leak before spending anything."
- "I tried an agency before, waste of money" → "You're right to be careful — many agencies over-promise. That's why we show monthly reports with real numbers: calls, leads, rankings. Lakshmi from Villupuram said the same thing before joining — her GMB results showed in the first month. Want me to send her story?"
- "I don't need online, my business runs on word of mouth" → "Word of mouth is gold — but nowadays even referred customers Google you first before calling. If nothing comes up, some of them silently go to whoever appears on Maps. A free audit will show exactly how many searches happen for your service in your area."
- "Send details, I'll check later" → Send a 3-line summary of the ONE most relevant plan + case study, then: "Shall I also block a free 30-min slot for you this week? No payment, just the audit. +91 94038 92971"
- "Do you guarantee results?" → "No honest agency can guarantee — results vary by industry and competition. What we do guarantee: transparent monthly reports and full effort from a local in-house team. Most clients see first results within 30 days."

Escalate to a human immediately if the lead: asks for a custom quote, mentions a budget above ₹25,000/month, is a real estate project, is angry/complaining, or asks something not covered in this document.

---

## MODULE 4 — CORETALENTS
tags: brand:coretalents, module-header

**CoreTalents** — recruitment & placement, B2B employer side (locked to this side of the market; Velaivaaipu owns the student-facing jobs board).

**Placement fee model:**
- Freshers: ₹3,000–₹5,000 flat fee
- Experienced hires: 8.33% of CTC
- Senior hires: 12.5% of CTC

**College channel:** TPO (Training & Placement Officer) is the door-opener; Principal/Correspondent signs the cheque. Six-session Placement Readiness program sold to colleges at three tiers: Partner ₹25,000 / Pro ₹50,000 / Elite ₹75,000. Cluster recruitment drives pool students across colleges against shared employer inventory.

**Ideal client:** businesses needing to hire, colleges wanting placement support for students.

**Routing:** Kamar / recruitment delivery lead. College-side inquiries may need TPO-specific handling — escalate rather than auto-answer pricing to a college contact without human context.

**Objection handling:**
**"How is this different from Velaivaaipu?"** → Velaivaaipu is the student-facing job marketplace (candidates browse jobs); CoreTalents is the B2B side working directly with employers and colleges on recruitment contracts.

---

## MODULE 5 — NAMMA PONDY PROPERTIES (NPP)
tags: brand:npp, module-header

**Namma Pondy Properties** — real estate brand. Note: NPP is intentionally kept OUTSIDE the ABM Groups investor agreement — do not imply investor terms apply here.

**Positioning:** trust, documentation, and clarity-first. Property intake follows a strict SOP: compass-verified facing, original-photography-only listings (no stock/reused images).

**Channel model:** works with channel partners (e.g., G1 Properties as a B2B broker relationship).

**Example pricing reference (NOT a general rate — flag to human before quoting):** a past listing in Reddiyarpalayam was priced around ₹2,900/sq.ft. Property prices vary significantly by location/type — **never quote a price to a lead without confirming current listing details with a human first.**

**Ideal client:** buyers, investors, families, NRI buyers in Tamil Nadu/Pondicherry.

**Routing:** Kamar / NPP delivery lead. Property inquiries are high-trust, high-value — lean toward human handoff over full automation for anything beyond general "what areas do you have listings in" type questions.

**AI Brain caution:** do not auto-quote specific property prices, availability, or site-visit scheduling — always route to human for anything beyond general brand/process info.

---

## MODULE 6 — TRAVELLERSNEED
tags: brand:travellersneed, module-header

**TravellersNeed** — travel & college IV (industrial visit) trips.

**Strategy:** Pondicherry packages = hero cash product; college IV trips = second channel.

**IV trip pricing (per head):**
- Day IV trip: ₹650
- 2-day IV trip: ₹2,200
- Bangalore 2-day IV trip: ₹3,500

**Positioning:** authority-first marketing, destination menu approach (brochures don't lead with pricing).

**Ideal client:** students/colleges (IV trips), families/tourists (Pondicherry packages).

**Routing:** Karthika (ops) / delivery lead. Group bookings (colleges) may need custom quotes — escalate group-size-specific pricing beyond the standard IV rates above.

---

## MODULE 7 — DADA'S KITCHEN
tags: brand:dadas-kitchen, module-header, stub

**Dada's Kitchen** — catering brand under ABM Groups.

**Status: insufficient data in this KB.** No confirmed pricing, menu, or positioning details available yet. AI Brain should NOT attempt to answer specific catering inquiries (pricing, menu, availability) — route directly to a human and flag to Kamar/Karthika to supply content for this module.

---

## MODULE 8 — EDUCONSULTANTS
tags: brand:educonsultants, module-header, stub

**EduConsultants** — study abroad consulting brand under ABM Groups.

**Status: insufficient data in this KB.** No confirmed service scope, country focus, or pricing available yet. AI Brain should NOT attempt to answer specific study-abroad inquiries — route directly to a human and flag to Kamar/Karthika to supply content for this module.

---

## MODULE 9 — BM FOUNDATION
tags: brand:bm-foundation, module-header, stub

**BM Foundation** — CSR arm of ABM Groups.

**Status: insufficient data in this KB.** No confirmed program details, donation process, or partnership terms available yet. AI Brain should NOT attempt to answer specific CSR/donation inquiries — route directly to a human and flag to Kamar/Karthika to supply content for this module.

---

## DOCUMENT_LIBRARY
tags: internal, documents, ai-brain-only, all-brands

Maps which PDF/document exists for each brand/program, so the AI Brain never promises to send something that isn't built yet.

| Asset | Brand / Program | Status | Send trigger |
|---|---|---|---|
| Agency Accelerator Brochure (9-page) | BM Academy — Agency Accelerator | ✅ Built | Lead asks about Agency Accelerator, or requests a brochure |
| Main Program Guide PDF | BM Academy — all programs (umbrella) | ❌ Not yet built | Should be first-touch for any general BM Academy inquiry — **priority build** |
| Program-specific guides (DM Pro, Data Analytics, FSD, Content Creator, WordPress, AI Tools, UI/UX) | BM Academy — individual | ❌ Not yet built as PDFs (Google Drive syllabus links now available for most programs — see individual entries above; these are syllabus docs, not the full sales-guide PDFs) | After program/tier narrows down — matches existing funnel step |
| BM TechX Client Portfolio (18-page, Outstation Edition) | BM TechX | ⚠️ Exists per records — confirm current file location before wiring | Business inquiry about BM TechX services |
| NPP property listings/brochure | NPP | ❌ Not confirmed | Property inquiry |
| CoreTalents / TravellersNeed / Dada's Kitchen / EduConsultants / BM Foundation | — | ❌ Not built | — |

**AI Brain rule:** only send a PDF marked ✅ in this table. Google Drive syllabus links attached to individual BM Academy programs above may be shared directly when a lead asks for a syllabus specifically — this is distinct from the "Program Guide PDF" send-trigger, which still does not exist. If the relevant asset is ❌ or ⚠️, describe the program in the chat response instead (using the KB program chunk) and move straight to the call-booking CTA — do not claim a PDF is on its way if it doesn't exist.

---

## NURTURE_SEQUENCE
tags: internal, nurture, follow-up, ai-brain-only, all-brands

Automates the waiting gaps in the existing enrollment funnel (Enquiry → Program Guide PDF → program-specific guide → placement question → timeline qualification → correct tier pitch → uncertain leads → **Kamar direct call, ~80% close rate**). This sequence keeps a lead warm between "asked a question" and "got on the call" — it does not replace the human close.

**Touch 0 — Immediate (auto, on first inbound message):**
Answer the question (KB retrieval) → send relevant PDF if one exists in `DOCUMENT_LIBRARY` → ask ONE qualifying question if not already known ("Job venuma illa business venuma?" / "Eppo start panna ready?").

**Touch 1 — +4 to 6 hours, if no reply:**
Soft nudge referencing what was sent. E.g., "Program guide paathinga ah? Edhachum doubt irundha kelunga 🙂" — no new information, just a gentle re-open.

**Touch 2 — +Day 1–2, if still no booking:**
Send program-specific detail or proof (placement stat, testimonial, relevant guide if one exists) + a direct call CTA.

**Touch 3 — +Day 3–4:**
Urgency/social proof angle (e.g., seats filling, batch starting) + directly ask for a good day/time for a call.

**Touch 4 — +Day 7:**
Final respectful check-in — "Innum interested-a? Illa na paravaala, edhachum venumna sollunga." If no response after this, move to a monthly re-engagement list (do not keep daily-pinging — this damages trust and WhatsApp deliverability).

**Stop conditions (sequence ends immediately if any of these happen):**
- Lead books a call/demo → stop, notify the brand owner, mark `call_booked = true`
- Lead enrolls → stop, hand off to student/client lifecycle
- Lead explicitly says not interested / opts out → stop immediately, send a respectful one-line exit, mark cold — never re-engage without an explicit later opt-in
- Unresponsive past Touch 4 → move to monthly drip, exit the active nurture sequence

**Brand note:** this exact cadence is modeled on BM Academy's proven funnel. For other brands (BM TechX, CoreTalents, NPP, TravellersNeed), reuse the same touch-timing skeleton but swap in brand-appropriate proof/CTA — do not copy BM Academy's exact wording into a B2B or property context.

---

## CALL_BOOKING_CTA
tags: internal, call-booking, ai-brain-only, all-brands

**Language consistency:** use the CTA phrasing that matches each program's existing collateral — don't mix them:
- Agency Accelerator → "Book a Free 1:1 Counseling Call" (matches its brochure)
- All other BM Academy programs → "Book Your Free 1:1 Demo" (matches their landing pages)
- Other brands → no established phrasing yet; default to "Free 1:1 call" until brand-specific collateral exists

**Booking mechanism (current — no calendar integration confirmed):**
AI Brain asks for 2–3 preferred day/time slots via WhatsApp text, then hands off to a human (Karthika or the relevant brand owner from `BRAND_ROUTER`) to confirm. **Do not auto-confirm a slot** — this requires a human check against actual availability unless/until a calendar tool (e.g., Google Calendar via n8n) is wired into the flow. Flagged as a future enhancement in `GAPS_TO_FILL`.

**Golden rule:** every AI Brain response should be working toward one of three outcomes — a booked call, an engaged lead with a next scheduled touch, or a respectful close if the lead has opted out. Never end a conversation with just an answer and no forward motion, unless the lead has explicitly asked to be left alone.

---

## LEAD_QUALIFICATION_SIGNALS
tags: internal, lead-scoring, ai-brain-only, all-brands

Cross-brand scoring framework — reconcile with LeadOS's existing 14-rule CRM business logic spec before final deployment; this is the AI Brain's input into that system, not a replacement.

**HOT signals (route to human within SLA) — apply across all brands:**
- Names a specific program/service + asks pricing/EMI in same message
- Asks about refund/placement/contract-specific policy
- Asks "when can we start" / timeline-specific
- Requests a call, demo, or site visit directly
- Mentions their own deadline
- Repeat visitor (check CRM history)
- **Any NPP property inquiry beyond general info** (auto-escalate — high-value, trust-sensitive)
- **Any cross-brand signal** (e.g., business owner asking about BOTH BM TechX services and hiring via CoreTalents) — route to Kamar directly, these are flywheel opportunities

**WARM signals (auto-answer via KB, soft-CTA to book a call):**
General inquiry about a named brand/program, curriculum/service-scope questions, comparing options.

**COLD signals (auto-answer + nurture, no urgent escalation):**
Generic "hi/tell me more" with no brand or program named — trigger the BRAND_ROUTER clarifying question first.

**Never let the AI Brain do (any brand):**
- Quote NPP property prices without human confirmation
- Promise placement outcomes/salary as guaranteed
- Offer discounts beyond documented policy
- Answer Dada's Kitchen / EduConsultants / BM Foundation inquiries beyond "let me connect you with our team"
- Guess which brand a message is about when genuinely ambiguous — ask, don't assume
- Claim a PDF was sent if it isn't marked ✅ in `DOCUMENT_LIBRARY`
- Auto-confirm a specific call time without human confirmation (see `CALL_BOOKING_CTA`)
- Continue the nurture sequence after a lead has booked a call, enrolled, or opted out

---

## AI_RESPONSE_STYLE_GUIDE
tags: internal, tone, ai-brain-only, all-brands

- Tanglish tone throughout, matching Kamar's direct/warm/non-corporate style — consistent across brands, but slightly more formal for B2B (BM TechX, CoreTalents, NPP) vs. peer-to-peer casual for BM Academy student conversations.
- WhatsApp-short: 2–4 sentences, multiple messages over one long paragraph.
- Never sound scripted — vary phrasing across similar questions.
- Always end with a clear next step (answer + soft question, or direct CTA).
- If outside KB scope, say so honestly and route to human — never guess, especially on pricing, refunds, placement guarantees, or property details.
- Never mention "BM TechX Partner" in Agency Accelerator context (see PROGRAM_AGENCY_ACCELERATOR).
- Always confirm brand context before diving into program/service details — if unclear, ask the BRAND_ROUTER clarifying question first.
- For Kids & Teens track programs, address the parent, not the student — reassurance-first tone, not peer-to-peer career framing.

---

## GAPS_TO_FILL
tags: internal, todo

- [ ] Confirm Mode and EMI availability for Data Analytics Bootcamp (currently unconfirmed above).
- [ ] Confirm whether the Full Stack Digital Marketing Bundle supersedes or coexists with the original Digital Marketing Pro flagship program.
- [ ] UI/UX Design — full module breakdown needed.
- [ ] Dada's Kitchen — full content module needed (pricing, menu, positioning).
- [ ] EduConsultants — full content module needed (services, countries, pricing).
- [ ] BM Foundation — full content module needed (programs, donation process).
- [ ] Confirm owners for Dada's Kitchen / EduConsultants / BM Foundation routing (currently unassigned in BRAND_ROUTER table).
- [ ] EMI exact tenure/partner/interest terms across all brands — confirm with finance.
- [ ] Reconcile LEAD_QUALIFICATION_SIGNALS with existing LeadOS 14-rule CRM spec.
- [ ] Confirm whether BM TechX / CoreTalents / NPP / TravellersNeed inbound traffic currently flows through the same Command Inbox / WABA number, or has separate intake points not yet mapped here.
- [ ] **Priority build:** Main BM Academy Program Guide PDF (umbrella, all programs) — this is the first-touch asset in the existing enrollment funnel and doesn't exist yet.
- [ ] Build proper sales-guide PDFs per program (distinct from the Google Drive syllabus links now captured above) — landing pages and syllabi exist, polished PDF guides don't.
- [ ] Confirm current file location of the existing BM TechX Client Portfolio PDF so it can be wired into `DOCUMENT_LIBRARY`.
- [ ] Decide on calendar integration for call-booking (currently manual slot-confirmation via human) — Google Calendar via n8n is the natural fit given existing tool access.
- [ ] Test `NURTURE_SEQUENCE` timing on BM Academy first before replicating to other brands — confirm touch intervals don't feel spammy on WhatsApp (deliverability risk if too frequent).
- [ ] Confirm refund/EMI terms for the several "not specified" bootcamp entries above (Video Editing Bootcamp, Design Basics Bootcamp, Web Design Basics, AI Fun Lab for Kids) — currently instructed to escalate to human, but a documented policy would let the AI Brain answer directly.
