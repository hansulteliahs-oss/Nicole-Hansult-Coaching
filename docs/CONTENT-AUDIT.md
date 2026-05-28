# Content Audit — nicolehansultcoaching.com

**Source:** Live Squarespace site at nicolehansultcoaching.com
**Crawled:** 2026-05-25
**Purpose:** Single source of truth for every word, image, CTA, and embed that gets ported into the Next.js rebuild
**Status:** Complete for site shell. Blog post bodies (12 posts) deferred. Pending Nicole confirmations listed below.

---

## ⚠️ Pending Nicole Confirmation (BLOCKS BUILD)

Eliahs is gathering answers in `Answers.md` (source of truth). Items below marked ✅ are resolved; ⏳ are still open.

1. ✅ **Offer ladder — RESOLVED.** Per Nicole (2026-05-25): the rebuild surfaces a **5-tier offer ladder**, not 3. The live site is missing the two highest-touch offers and has stale pricing on the Clinical Evaluation.

   | # | Offer | Price | Format | Notes |
   |---|---|---|---|---|
   | 1 | Clinical Longevity Evaluation (Seca scanner) | **$295** | In person | Live site says $255 — UPDATE during rebuild |
   | 2 | Vibrant40 Jumpstart | $88 | Online (self-paced) | **8-days** |
   | 3 | 45-min Strategy Session | $88 | Zoom | $88 credits toward the 3-month program if booked after |
   | 4 | 3-Month Coaching Program | **$5,500** | In person | Currently not surfaced on live site — ADD during rebuild. Strategy Session fee credits toward this. |
   | 5 | Everyday Training (hourly) | **$165/hr** | In person | Currently not surfaced on live site — ADD during rebuild |

   **Action items flowing from this:**
   - Update CLE price `$255 → $295` everywhere in copy below
   - Update Vibrant40 duration `8 days → 8 weeks` everywhere
   - Add a 3-Month Coaching tier to Services page and home "Choose Your Best Starting Point" section
   - Add Everyday Training ($165/hr) as a tier
   - Wire the $88 → $5,500 credit logic into Strategy Session copy + booking flow

2. ✅ **Vibrant40 delivery platform — RESOLVED.** Decision (2026-05-25): **self-host on the new Next.js site.** Squarespace subscription gets cancelled after rebuild completes. Final stack:
   - **Auth + DB:** Supabase (Postgres + Auth)
   - **Payments:** Stripe — one-time $88 charge; Stripe webhook → Supabase row marks account as Vibrant40 member
   - **Video hosting:** **Mux** (better player, cost is trivial at this scale)
   - **Auth UI:** **custom** (built to match the rebuild's design, ~2–3 hrs vs Supabase's prebuilt)
   - **Release model:** **all-unlocked on day 1** (no drip — full course visible immediately after purchase)
   - **Gated routes:** `/vibrant40/*` protected by Supabase session middleware in Next.js
   - **Member migration:** Eliahs to pull CSV export from Squarespace admin → one-time "set your password" email via Resend, sent once the new site is live

3. 🟡 **Video testimonial source files — PARTIALLY RESOLVED.** Scraped from live `/testimonials` page; structured data lives in [`lib/content/testimonials.ts`](../lib/content/testimonials.ts).
   - ✅ Bianca (San Diego) — YouTube `8dLnl5LIm1I`
   - ✅ John McClure (La Jolla) — YouTube `BlQt9NWM8iE`
   - ✅ Greg R. (Carlsbad) — Squarespace-hosted MP4 (not YouTube). System data ID `60837fe5-7452-4446-8760-e907e548d313`, library `5b83975d45776e48dcfe0f15`. 1080p + 360p variants on `video.squarespace-cdn.com`. Action: re-host (YouTube unlisted or Mux/Vercel Blob) before the Squarespace site is taken down, or the link dies.
   - ✅ Vanessa (Atlanta) — YouTube `z4_kqU5vRho`
   - ⏳ "Meet Nicole" video on the About page — video-block exists on `/about` but is uninitialized/empty on the live site. Need original from Nicole.
4. ✅ **Geography — RESOLVED.** Canonical city for the rebuild is **Carlsbad, CA**. Matches current footer, most image alt-tags, and the CLE "in-person only in Carlsbad, CA" line. Action during rebuild: scrub the Encinitas references out of testimonial copy (`Encinitas` appears in client labels and a few opening paragraphs) and standardize on Carlsbad. "North County San Diego" stays as the regional framing where it appears.
5. ✅ **`/start-here` — RESOLVED.** Remove from nav. Drop it from both the primary nav dropdown (Services → Start Here, CLE, Vibrant40) and the footer nav. `/services` already serves the "where do I start" job via the "Not Sure Where to Start?" section.
6. ✅ **Contact email — RESOLVED.** Keep `nicole@nicolehansultcoaching.com` as the destination for both the contact form and lead-magnet form. Implement via Resend API route in Next.js — Resend sends the form payload as an email to that address; Privacy + Terms copy stays as-is.
7. ⏳ **Free guide PDF.** `/look-and-feel-good-naked` collects email to deliver a guide. Need the actual PDF file from Nicole to host in `/public/downloads/` of the new site.
8. ⏳ **Vibrant40 active member count.** Needed to size the migration email blast and confirm whether free-tier Supabase + low-tier Mux are enough. Eliahs to pull from Squarespace admin (Members → Vibrant40 area).

> Open items now (3, 7, 8) are all info/file gathering, not decisions. They can be collected in parallel with the build kickoff.

---

## Site Map

```
nicolehansultcoaching.com
├── /                                       Home
├── /services                               Services overview
├── /services/clinical-longevity-evaluation Clinical Longevity Evaluation detail
├── /vibrant40-jumpstart                    Vibrant40 sales page (member-gated content)
├── /about                                  About Nicole
├── /testimonials                           Client results
├── /insights                               Blog index (12 posts)
├── /contact                                Contact form
├── /look-and-feel-good-naked               Lead magnet landing page
├── /booking-appointment                    Acuity scheduler embed
├── /privacy-policy                         Privacy policy
├── /terms-conditions                       Terms & conditions
└── /start-here                             BROKEN (404 on live site, still in nav)
```

---

## Integrations & Embeds (Critical Inventory)

| Integration | Where | Details |
|---|---|---|
| **Acuity Scheduling** | `/booking-appointment` | Owner ID `16610306`. Embed script: `https://embed.acuityscheduling.com/js/embed.js`. Iframe loads `https://app.acuityscheduling.com/schedule.php?owner=16610306`. Drops in as-is to Next.js. |
| **Squarespace Commerce (Vibrant40)** | `/vibrant40-jumpstart` | Pricing plan ID `f0ab3970-edb8-440d-b8c0-6ccfd7770e48`. $88 one-time, FIXED_AMOUNT. Gated content delivery via Squarespace member area. Backend uses Stripe (abstracted). |
| **Lead capture form** | `/look-and-feel-good-naked` | Fields: First Name, Last Name, Email. Squarespace backend. Replace with Resend-backed API route + email delivers the guide PDF. |
| **Contact form** | `/contact` | Fields: First Name, Last Name, Email, Phone (optional), Services dropdown (CLE / Strategy Session / Vibrant40 / Other). Replace with Resend-backed API route. |
| **Video testimonials** | `/testimonials`, `/about` | Platform unclear from HTML — likely Squarespace native video. Source files needed from Nicole. |
| **Reviews badges** | Home, Testimonials | Google Reviews 5-star, Yelp 5-star, "Best Personal Trainer North County 2024," "Best Local Fitness Influencer 2024." |
| **Contact email** | Footer / Privacy / Terms | `nicole@nicolehansultcoaching.com` |
| **Location** | Footer | Carlsbad, CA |
| **Web dev credit** | Footer | "Strategic Copywriting & Website Development by JBits Connects" |

---

## Pricing Summary

**Two columns: what's on the live site vs. the source-of-truth pricing for the rebuild (per Nicole, `Answers.md`).**

| Service | Live site | Rebuild (source of truth) | Duration | Format |
|---|---|---|---|---|
| Clinical Longevity Evaluation | $255 | **$295** | 75 min | In-person, Carlsbad CA only |
| Strategy Session | $88 | $88 (credits to 3-mo program) | 45 min | Zoom |
| Vibrant40 Jumpstart | $88 | $88 | **8 weeks** (live site says 8 days) | Self-paced online — stays on Squarespace |
| 3-Month Coaching Program | not listed | **$5,500** | 3 months | In person |
| Everyday Training | not listed | **$165/hr** | Hourly | In person |
| Free Guide (Look & Feel Good Naked Over 40) | Free | Free | — | Digital download |

---

## Site-Wide Navigation

> The rebuild drops `/start-here` from both the primary nav dropdown and the footer (resolved 2026-05-25). Also: footer credit line "Strategic Copywriting & Website Development by JBits Connects" is replaced — Eliahs/Handled is building the rebuild.

**Primary nav (rebuild):**
- Home
- Services (dropdown → Clinical Longevity Evaluation, Vibrant40 Jumpstart)
- About
- Testimonials
- Insights
- Contact
- Login (only for Vibrant40 members)

**Footer nav (rebuild):**
- Home / About / Testimonials / Insights / Contact
- Services / Clinical Longevity Evaluation / Vibrant40 Jumpstart
- Download Guide / Book a Session
- Privacy Policy / Terms & Conditions

**Footer text (rebuild):** © Nicole Hansult Coaching 2026 · Carlsbad, CA · [Handled credit TBD]

---

**Primary nav (current live site, for reference only):**
- Home / Services (dropdown → Start Here, CLE, Vibrant40) / About / Testimonials / Insights / Contact / Login

---

## Home Page

- **URL:** https://nicolehansultcoaching.com/
- **Browser title:** Nicole Hansult | Functional Longevity Coach
- **H1:** Stop Guessing What Your Body Needs After 40

### SEO Meta

- `og:site_name`: Nicole Hansult | Functional Longevity Coach
- `og:title`: Nicole Hansult | Functional Longevity Coach
- `og:url`: https://nicolehansultcoaching.com
- `og:type`: website
- `og:image`: `http://static1.squarespace.com/static/5b83975d45776e48dcfe0f15/t/5b98b71b4fa51a8f86e5331b/1536735006489/NicoleHansult+Logo_edit.png?format=1500w` (1107×863)

### Heading Hierarchy

- H1: Stop Guessing What Your Body Needs After 40
- H2: When Your Body Starts Changing
- H2: A Practical Approach to Longevity
  - H3: Movement
  - H3: Fuel
  - H3: Lifestyle
  - H3: Mindset
- H2: Stop Guessing What Your Body Needs
- H2: Start With a Clear Plan
- H2: My Philosophy
- H2: A Personalized Approach to Longevity
- H2: Choose Your Best Starting Point

### Body Copy (Verbatim)

**Hero subhead:**
> Feel strong, mobile, and confident again with a plan designed for your body.

**When Your Body Starts Changing:**
> At some point after 40, many people notice things beginning to feel different.
>
> Using clinical data, mobility assessments, and 25+ years of movement expertise, I help you understand what your body needs and give you a clear, personalized plan.
>
> You may feel:
> - Stiffer getting out of bed
> - Less confident about your strength or energy
> - Frustrated that things that used to work no longer do
> - Unsure where to start — or whether it's even worth trying
>
> And if you've never considered yourself "a fitness person," the idea of starting now can feel overwhelming.
>
> But the truth is: your body can improve at any stage when you understand how it works and give it the right support.
>
> That's where I come in.

**A Practical Approach to Longevity:**
> My work focuses on helping people become the strongest, most capable version of themselves — not someone else's version of fitness.
>
> Lasting results come from balancing four key areas of health:
>
> **Movement** — Restore mobility, posture, flexibility, and strength so your body moves well again.
>
> **Fuel** — Understand how nutrition supports energy, metabolism, and body composition.
>
> **Lifestyle** — Sleep, stress management, and daily habits that support longevity.
>
> **Mindset** — Build consistency and confidence so progress lasts.
>
> No single area works in isolation.
>
> You might be eating well, but not building enough strength.
> Or focusing on cardio and weight loss while ignoring mobility, recovery, or muscle preservation.
> Or trying to stay consistent without understanding what your body actually needs at this stage of life.
>
> Many people are working hard, but following a strategy that's incomplete, imbalanced, or no longer effective for their body.
>
> This is where most people get stuck.
>
> Because it's not about doing more—it's about understanding what your body needs right now and bringing these elements back into balance.
>
> That's what makes a holistic approach so effective.

**Stop Guessing What Your Body Needs:**
> Most people rely on a bathroom scale to measure their progress. But weight alone doesn't tell the whole story.
>
> I use medical-grade body composition analysis (Seca mBCA) to understand what is actually happening inside your body.
>
> This scan measures:
> - muscle mass and imbalances
> - fat distribution
> - visceral fat
> - metabolic health
> - cellular health
> - hydration status
>
> This information becomes the foundation of your Clinical Longevity Evaluation, allowing us to stop guessing and build a strategy based on how your body is currently functioning.

**Start With a Clear Plan:**
> The best way to begin is with a Clinical Longevity Evaluation — giving us the insight needed to build a personalized strategy for your body.
>
> 75 minutes • movement • body composition • lifestyle
>
> During the evaluation, we will:
> - analyze your body composition using medical-grade technology
> - assess mobility and movement patterns
> - review key health indicators
> - identify the most important areas to focus on first
>
> You will leave with clear next steps and a better understanding of how to support your body moving forward.

**My Philosophy:**
> Longevity is not about extreme workouts or chasing unrealistic fitness goals.
>
> It's about building a body that supports the life you want to live.
>
> For some people, that means moving with more ease, having more energy, and feeling confident in their body again.
>
> For others, it means refining what's already working — improving body composition, addressing imbalances, and continuing to feel strong and capable for years to come.
>
> This is not about becoming someone else or comparing yourself to others.
>
> It's about improving what you already have so your body feels reliable, resilient, and aligned with the life you want to live.

**A Personalized Approach to Longevity:**
> 25+ years helping adults move, feel, and age better
> Clinical-grade body composition analysis
> Personalized recommendations for adults 40+
> Focused on sustainable strength, mobility, and longevity
>
> Everyone starts at a different point.

**Choose Your Best Starting Point** (4-card layout):

*MOST PERSONALIZED*
> **Clinical Longevity Evaluation**
> Best for:
> - data + clarity
> - body composition insights
> - pain/mobility concerns
> - personalized strategy

*BEST NEXT STEP*
> **Strategy Session**
> Best for:
> - getting unstuck
> - creating a realistic plan
> - accountability + direction
> - discussing goals & challenges

> **Vibrant40 Jumpstart**
> Best for:
> - building sustainable habits
> - consistency
> - guided movement
> - starting simply

> **Free Guide**
> Best for:
> - understanding your body at 40+
> - exploring options
> - getting started gently

### Images (Squarespace CDN — need to be re-hosted)

| Position | URL | Alt | Description |
|---|---|---|---|
| Header/footer logo | `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/1536735004047-L01MPQSGCY8K1727N65B/NicoleHansult+Logo_edit.png` | Nicole Hansult Logo | Brand wordmark logo |
| Hero | `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/a924483d-49f2-4b9c-9603-384ef117b53e/clinical-longevity-evaluation-over-40-encinitas.jpg` | Clinical longevity coaching session | Nicole working with client in clinical setting |
| Body | `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/ec2f222a-d8a4-45a8-94d7-09a0f3c1bc5f/functional-movement-coaching-over-40-carlsbad.jpg` | Nicole guiding corrective movement exercises | Movement coaching in session |
| Body | `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/41805ff6-84d0-4049-a37d-62ca9bbcf859/seca-body-composition-assessment-carlsbad.jpg` | SECA body composition evaluation with client | Seca scanner session |
| Body | `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/4b8c7201-90b3-4702-aee0-cf8bbf0781d2/seca-body-composition-analysis-carlsbad-ca.jpg` | Medical-grade body composition analysis | Seca scanner closeup / results readout |
| Body | `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/61bc8b30-7d90-4e86-aa50-9244691ec346/clinical-longevity-consultation-carlsbad.jpg` | Clinical longevity coaching session | Consultation moment |
| Body | `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/78aea947-22bf-4ac1-ad82-41fe7e4e3a69/functional-longevity-coach-over-40-carlsbad-nicole-hansult.jpg` | Nicole sharing healthy aging philosophy | Nicole portrait / brand image |

### CTAs

| Text | Destination |
|---|---|
| Start with a Clinical Longevity Evaluation | `/services/clinical-longevity-evaluation` |
| Download the Guide | `/look-and-feel-good-naked` |
| Explore the Evaluation | `/services/clinical-longevity-evaluation` |
| Book a Strategy Session | `/booking-appointment` |
| Begin the Jumpstart | `/services/vibrant40-jumpstart-enroll` |
| Book a Session | `/booking-appointment` |

### Social Proof on Page

- Google Reviews 5-star badge
- Yelp Reviews 5-star badge
- "Winner North County San Diego Best Personal Trainer 2024" award
- "25+ years helping adults move, feel, and age better" credential

---

## Services Page

- **URL:** https://nicolehansultcoaching.com/services
- **Browser title:** Functional Longevity Coaching Services | Nicole Hansult
- **H1:** How You Can Work With Me

### Heading Hierarchy

- H1: How You Can Work With Me
- H2: There isn't just one way to begin
- H2: Clinical Longevity Evaluation
  - H3: The best place to start
  - H3: What's included
  - H3: Already ready? Book your evaluation
- H2: Continue Working Together
- H2: Strategy Session
- H2: Vibrant40 Jumpstart
- H2: Not Sure Where to Start?
- H2: Free Guide

### Body Copy (Verbatim)

**Opening:**
> There isn't just one way to begin.
>
> Whether you're ready for a deeper understanding of your body, want guidance and accountability, or prefer to start more gradually, there is a clear path forward.

**Clinical Longevity Evaluation:**
> The best place to start
>
> If you want to understand what your body actually needs, this is where we begin.
>
> This 75-minute in-person session provides a complete picture of how your body is functioning—so we can stop guessing and create a clear, personalized strategy.
>
> This is not a workout. It's a clinical starting point.
>
> **What's included:**
> - Medical-grade body composition analysis (seca mBCA)
> - Mobility and movement assessment
> - Review of key health and recovery indicators
> - A personalized Longevity Roadmap with clear next steps
>
> **This evaluation is designed for people who:**
> - feel their body has started to change
> - don't know where to begin
> - want a structured, expert-led approach
>
> **Investment: $255**
>
> Already ready? Book your evaluation
> (Available in-person only in Carlsbad, CA)

**Continue Working Together:**
> For those who want guidance, structure, and accountability
>
> After your evaluation, many clients choose to continue working with me to implement their plan and build consistency.
>
> This is where the real change happens.
>
> Together, we focus on applying your roadmap across the four pillars:
> - movement
> - nutrition
> - lifestyle
> - mindset
>
> This ongoing work is personalized and adapted to your needs, your schedule, and your goals.
>
> You'll receive:
> - 1:1 coaching and guidance
> - ongoing adjustments based on your progress
> - support in building sustainable routines
> - accountability to help you follow through
>
> Ongoing coaching options are available both in-person and virtually, and can be discussed after your evaluation. Pricing varies based on the level of support needed.

**Strategy Session:**
> A flexible starting point (virtual or in-person)
>
> If you're not ready for a full evaluation or you're not local, this is a great place to begin.
>
> In this 45-minute session, we focus on your current challenges, goals, and what may be holding you back.
>
> You'll leave with:
> - clarity on your next steps
> - practical guidance you can apply immediately
> - a better understanding of how to move forward
>
> **Investment: $88**

**Vibrant40 Jumpstart:**
> A simple way to reconnect with your body
>
> If you prefer to start on your own, the Vibrant40 Jumpstart is a short guided program designed to help you:
> - improve mobility
> - feel less stiff
> - build simple daily consistency
>
> **This is ideal if:**
> - you're new to movement
> - you want something simple and manageable
> - you're not ready for 1:1 support yet
>
> **Investment: $88**

**Not Sure Where to Start?:**
> That's completely normal.
>
> Most people come to me unsure of what their body actually needs—and that's exactly why this work is so effective.
>
> If you're looking for clarity and a structured plan, start with the Clinical Longevity Evaluation.
>
> If you prefer a more gradual approach, the Vibrant40 Jumpstart is a great place to begin.
>
> And if you want to talk things through first, the Strategy Session gives you a clear next step.

### Images

| URL | Note |
|---|---|
| `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/e7b62c0b-0ac8-4840-bd03-154389d6b4ac/BrandPortraits%40MarcyBrowePhoto-165.jpg` | Brand portrait by Marcy Browe Photo |
| `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/2a3795b1-b0cb-4def-b530-f842bbe048b2/BrandPortraits%40MarcyBrowePhoto-256.jpg` | Brand portrait by Marcy Browe Photo |
| `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/fae3d33a-daa5-4bcc-bf3c-5b4bec2bc31c/Nicole+yellow+top+DSC04555.jpg` | Nicole in yellow top |
| `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/32bbe325-7bb7-4b3b-8e45-9c6aa40026f9/nicole-hansult-longevity-wellness-encinitas-lavendar.jpg` | Nicole in lavender |

### CTAs

| Text | Destination |
|---|---|
| Get Scheduled Now | `/booking-appointment` |
| Learn More About the Clinical Longevity Evaluation | `/services/clinical-longevity-evaluation` |
| Book a Strategy Session | `/booking-appointment` |
| Start the Vibrant40 Jumpstart | `/services/vibrant40-jumpstart-enroll` |
| Learn more about the Evaluation | `/services/clinical-longevity-evaluation` |
| Explore the Jumpstart | `/services/vibrant40-jumpstart-enroll` |
| Download | `/look-and-feel-good-naked` |

---

## Clinical Longevity Evaluation Page

- **URL:** https://nicolehansultcoaching.com/services/clinical-longevity-evaluation
- **Browser title:** Clinical Longevity Evaluation | Nicole Hansult Functional Longevity Coach
- **H1:** Clinical Longevity Evaluation

### Heading Hierarchy

- H1: Clinical Longevity Evaluation
- H2: Understand Your Body. Build Your Roadmap.
- H2: If your body has started to feel different lately, you're not imagining it.
- H2: You Don't Have to Be a "Fitness Person"
- H2: What Happens During the Evaluation
- H3: Instead of guessing, we can see
- H3: We begin with a clinical scan using the Seca mBCA system
- H3: What We Measure
- H3: Gentle Movement Assessment
- H3: Your Personal Longevity Roadmap
- H2: Investment
- H2: Why Work With Nicole?

### Body Copy (Verbatim)

**Hero:**
> Understand Your Body. Build Your Roadmap.
>
> Book your evaluation
>
> If your body has started to feel different lately, you're not imagining it.
>
> Many people reach their 40s, 50s, or 60s and begin to notice subtle changes:
> - stiffness in the morning
> - strength that isn't what it used to be
> - energy levels that fluctuate
> - changes in body composition and body shape
>
> For many people, the hardest part is simply knowing where to start.
>
> The Clinical Longevity Evaluation is designed to give you clarity.
>
> Instead of guessing what your body needs, we gather real data, assess how your body moves, and create a clear strategy for moving forward with confidence.

**You Don't Have to Be a "Fitness Person":**
> Many of my clients have never loved exercise.
>
> Some haven't exercised consistently in years.
>
> Others have old injuries or stiffness that make movement feel intimidating.
>
> You do not need to "get in shape" before coming in.
>
> This session is designed to meet you exactly where you are today.
>
> This is not a traditional gym environment. It is a private space focused on clinical movement, longevity, and sustainable health.
>
> My approach is not about pushing you harder.
>
> It is about helping your body move, feel, and function better.

**What Happens During the Evaluation:**
> Your 75-minute Clinical Longevity Evaluation gives us a clear understanding of how your body is functioning today.
>
> From there, we build your Personal Longevity Roadmap.
>
> schedule your evaluation
>
> Instead of guessing, we can see how your body is functioning beneath the surface, how your body is aging, and where we should focus first.
>
> We begin with a clinical scan using the Seca mBCA system.
>
> This is not a typical gym scale. The Seca system is medical-grade technology normally found in leading hospitals, research facilities, and high-end longevity clinics.
>
> Very few private studios have access to this level of body analysis. I chose to invest in it because it allows me to understand your body with far greater precision than traditional methods.
>
> In less than a minute, the scan produces a detailed clinical report with more than 20 measurements and graphs.
>
> **What We Measure**
> - Muscle mass
> - Strength imbalances
> - Visceral fat
> - Hydration levels
> - Metabolic health
> - Inflammation markers
>
> **Gentle Movement Assessment**
>
> Next, we look at how your body moves.
>
> Using my background in physiotherapy training and more than 25 years of movement expertise, I guide you through a simple movement screen to assess:
> - mobility
> - flexibility
> - posture
> - structural balance
>
> This helps us identify the hidden reasons behind stiffness, discomfort, or movement limitations.
>
> **Your Personal Longevity Roadmap**
>
> After reviewing your scan and movement assessment, we sit down together and translate everything into a clear strategy.
>
> With more than 25 years of experience in physiotherapy-based movement, rehabilitation training, and integrative health, I interpret your results and identify the most important areas to focus on first.
>
> You will leave with a simple 3-step longevity roadmap tailored to your body.
>
> This roadmap may include guidance on:
> - improving mobility, flexibility, and posture
> - restoring strength safely
> - optimizing body composition through nutrition
> - discussing lifestyle adjustments that improve energy and recovery
> - shifting your approach to health so you can stay consistent long-term
> - breaking through what's been holding you back from real progress
>
> My goal is to remove the confusion and give you a path forward that feels manageable and realistic.

**Investment:**
> Clinical Longevity Evaluation
> $255
>
> 75 minutes of private assessment, data analysis, and strategic planning for your long-term health.
>
> Many clients choose continued support as they implement their roadmap.
>
> But the evaluation itself is designed to give you immediate insight and a clear starting point.
>
> The evaluation gives us clarity on what your body needs.
>
> The next phase is where we apply it.
>
> For those who want deeper support, I offer a 1, 3, or 6-month coaching extension designed to help you integrate the four pillars of longevity (movement, nutrition, lifestyle, and mindset) into daily life.
>
> Together, we focus on consistent progress, personalized adjustments, and building a routine your body and lifestyle can sustain.
>
> Pricing varies based on the level of support and whether sessions are virtual or in-person.

### FAQ (Verbatim)

> **Q: What if the results show something isn't ideal?**
> A: That's exactly why we do the evaluation. Most people already sense that something in their body feels different — they just don't have clear information about what's actually happening. The purpose of the scan and assessment is not to judge or criticize. It's to give us insight so we can build a practical plan that improves how your body functions over time. Many clients actually feel relieved once they understand what their body needs and realize there are clear steps they can take to improve it.
>
> **Q: What if I haven't exercised in years?**
> A: You're in the right place. Many of my clients are returning to movement after long breaks. The goal is not intensity — it's building a foundation.
>
> **Q: Do I need to be fit to start?**
> A: Absolutely not. This evaluation is designed for people who feel unsure where to begin. We start exactly where you are.
>
> **Q: I have an old injury. Is this safe?**
> A: Yes. My background is in physiotherapy-based movement training, and the assessment is designed to be safe and appropriate for your current condition.
>
> **Q: I'm currently doing physical therapy or following a program. Should I wait until I'm done?**
> A: No—this is actually one of the best times to do the evaluation. We can capture a clear baseline of how your body is functioning right now and identify any underlying imbalances that may still be present. It also gives you a way to measure real progress over time—not just how you feel, but what's actually changing in your body.
>
> **Q: I'm taking a GLP-1 medication and have lost weight. How do I maintain it without losing strength?**
> A: This is exactly where a more precise approach becomes important. While weight loss can happen quickly with medication, it often includes loss of muscle along with fat. The evaluation allows us to see your current muscle balance, metabolism, and overall body composition so we can focus on maintaining strength, supporting your metabolism, and protecting your long-term health.
>
> **Q: I'm currently dieting or trying to lose weight. Should I wait?**
> A: You don't need to wait. The evaluation helps us understand how your body is responding right now—so we can support your efforts more effectively. Instead of guessing, we can see what's actually happening beneath the surface and adjust your approach in a way that supports long-term results.
>
> **Q: I want to lose some weight before coming in. Should I wait until I'm closer to my goal?**
> A: There's no need to wait. In fact, starting now gives us a clear understanding of your current baseline so we can guide your progress more effectively. Your body doesn't need to be at a certain point to begin—this is where we create a plan that helps you move forward with clarity and confidence.
>
> **Q: What should I wear?**
> A: Something comfortable that allows you to move easily. Gym clothes are not required.

**Why Work With Nicole?:**
> For more than 25 years, Nicole has worked at the intersection of physiotherapy-based movement, rehabilitation training, and integrative health.
>
> Instead of generic programs or intense workouts, Nicole focuses on precision, sustainability, and long-term results.
>
> Learn more about Nicole's background
>
> Ready to Understand What Your Body Needs?
>
> The Clinical Longevity Evaluation gives you the data, insight, and guidance to begin improving how your body moves, feels, and functions.
>
> Book Your Clinical Longevity Evaluation

### CTAs

| Text | Destination |
|---|---|
| Book your evaluation | `/booking-appointment` |
| schedule your evaluation | `/booking-appointment` |
| Book Your Clinical Longevity Evaluation | `/booking-appointment` |

---

## About Page

- **URL:** https://nicolehansultcoaching.com/about
- **Browser title:** About Nicole Hansult | Functional Longevity Coach
- **H1:** About Nicole

### Heading Hierarchy

- H1: About Nicole
- H2: Why I Work This Way
- H2: Meet Nicole
- H2: A Different Approach
- H2: Who I Work With
- H2: What This Work Helps You Do
- H2: Education & Certifications

### Body Copy (Verbatim)

**Opening:**
> I've spent more than 25 years working at the intersection of physical therapy, personal training, sports performance, injury rehabilitation, and integrative health across Europe, Asia, and the United States.
>
> During that time, I've worked with a wide range of people — from teenagers and professional athletes to active adults, including seniors recovering from back injuries or hip replacement surgery, and people who have never considered themselves "fitness people."
>
> And what I've seen again and again is this:
>
> At some point, your body starts to feel different.
>
> And most people don't know what to do next, regardless of their fitness level.

**Why I Work This Way:**
> Many of my clients come to me feeling frustrated, confused, embarrassed, or disconnected from their bodies.
>
> Others are former athletes or active adults who want to maintain their strength, mobility, and independence as their bodies change with age.
>
> What used to work no longer works.
>
> They feel stiff, achy, low on energy, or less confident in their bodies.
>
> And often, they've tried to "figure it out" on their own or ignored it, hoping it would go away.
>
> But the issue is rarely effort.
>
> It's a lack of clarity and the right strategy.
>
> That's why my work is focused on helping you understand what your body actually needs—so you can move forward with confidence.

**Meet Nicole (video embed):**
> I know how overwhelming it can feel when your body starts changing and what used to work no longer does.
>
> My approach combines physical therapy–based movement, rehabilitation training, nutrition, and integrative health to help you understand what your body actually needs.
>
> In this short video, I share more about my story, philosophy, and approach to longevity.
>
> *[Video embed — source platform not identified in HTML; needs source from Nicole]*

**A Different Approach:**
> I don't believe in pushing you harder or putting you through generic programs.
>
> My approach is precise, structured, and adapted to you.
>
> When something hurts, there's usually a reason.
>
> Often, it comes from repetitive movement patterns, compensation, weakness, mobility restrictions, or how the body has adapted over time.
>
> Part of my work is helping you understand why your body feels the way it does, so we can address the root cause rather than just the symptom.
>
> (Yes—this is where a little German engineering comes in.)
>
> But it's also practical.
>
> Because your plan has to fit your real life, not the other way around.

**Who I Work With:**
> Many of the people I work with:
> - have never connected with traditional fitness
> - are starting again after years of inconsistency
> - are high-performing adults who have built successful careers or businesses but feel like their energy and vitality no longer match their professional achievements
> - want to maintain their mobility, strength, independence, and quality of life as they age, including active seniors and those recovering from injury or surgery
> - are active or former athletes navigating new physical limitations or recovery challenges
>
> Often, they're dealing with stiffness, recurring aches, compensation patterns, or injuries that have never fully resolved.
>
> As our bodies change with age, what used to work often stops working. Many people respond by pushing harder with intense workouts or restrictive dieting, only to feel increasingly frustrated and disconnected from their body.
>
> My role is to help them understand why their body feels the way it does and create a clear plan to improve it.
>
> You don't need to be "in shape" to start.
>
> You just need to be ready to approach your health differently.

**What This Work Helps You Do:**
> Together, we focus on helping you:
> - improve mobility, posture, and strength
> - understand your body composition and energy patterns
> - build sustainable habits that actually fit your life
> - feel more confident and capable in your body again
> - stay consistent even when motivation fluctuates
> - stop guessing and follow a clear strategy that works for your body
>
> Not through extremes.
>
> Through clarity, consistency, and the right strategy.

**Education & Certifications:**
> Nicole's background combines physiotherapy-based movement, rehabilitation, nutrition, and integrative health training from Europe, Asia, and the United States.
>
> **Certifications & Credentials:**
> - Diploma in Physical Therapy — Bruederkrankenhaus, St. Joseph, Koblenz, Germany
> - Transformational Mastery Coach
> - Health Coach (Health Coach Institute — CCE International Coach Education)
> - Diploma in Nutrition — Alice-Salomon Schule, Linz am Rhein, Germany
> - NASM (National Academy of Sports Medicine) Certified Personal Trainer
> - NASM Certified Performance Enhancement Specialist
> - Certification in Kinesiology — Seminarzentrum in Neumarkt, Germany
> - Reiki Healing Practitioner Level 1 and 2 — Katt Lowe in Los Angeles, CA
> - Certification in Rehabilitation Training — Arbeitsgemeinschaft Medizinisches Aufbautraining in Mannheim, Germany
> - Certification in CPR / AED
> - APS (Australian Physical Therapy Association) Certification in Clinical Pilates For Pathologies
> - Certificate on TMJ Treatment — Medizinische Hochschule in Hannover, Germany
> - Diploma in Shotokan Karate 3rd KYU (Hong Kong)

### Images

| URL | Note |
|---|---|
| `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/45bc548e-4ac1-48ba-8844-43720d01cdf1/nicole-hansult-wellness-studio-carlsbad.jpg` | Nicole in wellness studio |
| `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/f2aa2390-c5e2-4f64-b291-a652141ff83b/nicole-hansult-functional-health-coach-carlsbad.png` | Functional health coach portrait |
| `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/e5b9c4c8-9686-467b-9bf6-ff5048878afc/nicole-hansult-longevity-coach-carlsbad.png` | Longevity coach portrait |
| `https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/1564322979173-MOK00WYUSQN897IQI4HW/nicolewebsite_4.jpg` | Wellness lifestyle image |

### CTAs

| Text | Destination |
|---|---|
| Download Free Guide | `/look-and-feel-good-naked` |
| Book a Session | `/booking-appointment` |
| Testimonials | `/testimonials` |
| Contact | `/contact` |

---

## Testimonials Page

- **URL:** https://nicolehansultcoaching.com/testimonials
- **Browser title:** Client Results | Functional Longevity Coach Nicole Hansult
- **H1:** Real People. Real Results.

### Heading Hierarchy

- H1: Real People. Real Results.
- H2: Hear It in Their Own Words
- H2: Move Better. Recover From Pain.
- H3: Real Recovery Stories
- H2: Strength, Confidence & Energy
- H2: Aging & Staying Active
- H2: Recognition & Reviews
- H3: 5-Star Rated by Clients Across North County San Diego
- H2: Your Body Doesn't Need Another Generic Program

### Body Copy (Verbatim)

**Opening:**
> From pain relief and improved mobility to greater strength, confidence, and long-term health, these are the experiences of people who have worked with Nicole in Encinitas, across North County San Diego, the United States, and internationally.

**Hear It in Their Own Words:**
> Every client starts from a different place.
>
> Some are recovering from injury. Others want to feel stronger, move better, improve body composition, or maintain their mobility and independence as they age.
>
> These stories reflect what's possible with the right strategy, guidance, and support.

**Video Testimonials (4 — source platform not identified, need files from Nicole):**
- Bianca, San Diego, CA
- John M., La Jolla, CA
- Greg R., Carlsbad, CA
- Vanessa, Atlanta, Georgia

**Move Better. Recover From Pain:**
> Many clients initially come to Nicole because something hurts: chronic stiffness, recurring injuries, limited mobility, poor posture, or pain that traditional approaches haven't fully resolved.
>
> Nicole's background in physiotherapy-based movement, rehabilitation, and functional training helps clients understand why their body feels the way it does and create a strategy to improve it.

**Real Recovery Stories:**

> "After three sessions, my shoulder was completely pain-free and I was back in the gym lifting again."
> — Ray B., Del Mar, CA

> "With Nicole's guidance, my posture improved and my pain disappeared."
> — Karen S., Encinitas

> "Nicole guided me through every step of my recovery after hip replacement surgery."
> — Mike S., Carlsbad, CA

**Strength, Confidence & Energy:**
> For many clients, the goal isn't just weight loss.
>
> It's feeling stronger, more energized, and more confident in their body again.
>
> Nicole's approach focuses on sustainable progress through movement, nutrition, accountability, and personalized strategy.

> "I'm at my ideal weight and continue to grow stronger and build muscle daily."
> — Jayne C., Encinitas, CA

> "She helped me realize I'm stronger than I think."
> — Hillary S., Encinitas, CA

> "What I learned from Nicole completely changed my life for the long haul."
> — Brie M., Carlsbad, CA

> "I feel stronger, more confident, and I've seen real progress."
> — Monica B., Encinitas, CA

**Aging & Staying Active:**
> Many of Nicole's clients are active adults or former athletes who want to maintain mobility, strength, balance, and independence as they age.
>
> The goal isn't simply to exercise more. It's to stay strong, mobile, and fully engaged in the life you want to live.

> "Nicole doesn't just train bodies, she transforms lives."
> — Enid, Encinitas, CA

> "I intend to be a client for the rest of my life."
> — Linda G., Encinitas, CA

> "My mobility improved and I can walk more confidently with much less pain."
> — Karin S., Encinitas, CA

> "Every detail was thoughtfully executed. We're thrilled with the outcome."
> — Greg R., Carlsbad, CA

**Recognition & Reviews:**
> 5-Star Rated by Clients Across North County San Diego
>
> - Best Personal Trainer North County 2024
> - Best Local Fitness Influencer 2024
> - 5-star Google and Yelp ratings

**Closing CTA:**
> Your Body Doesn't Need Another Generic Program
>
> Whether your goal is to move without pain, rebuild strength, improve body composition, or better understand what your body needs as you age, the first step is gaining clarity.
>
> The Clinical Longevity Evaluation helps identify what's happening beneath the surface so you can move forward with a clear, personalized plan.

### CTAs

| Text | Destination |
|---|---|
| Start with a Clinical Longevity Evaluation | `/services/clinical-longevity-evaluation` |
| Book Your Clinical Longevity Evaluation | `/booking-appointment` |

---

## Insights (Blog) Page

- **URL:** https://nicolehansultcoaching.com/insights
- **Browser title:** Insights — Nicole Hansult | Functional Longevity Coach
- **H1:** Insights

### Blog Post Index (titles, slugs, dates, excerpts — bodies deferred)

> **NOTE:** Full post bodies are not in this audit. Migration of post bodies happens in a separate task after the site shell is built. The 12 posts below need to be re-crawled or pulled from Squarespace export when that phase begins.

| # | Title | Date | Categories | Slug | Excerpt |
|---|---|---|---|---|---|
| 1 | The 3 Biggest Mistakes People Make When Trying to "Get Back in Shape" After 40 | 2026-04-28 | Functional Longevity | `/insights/the-3-biggest-mistakes-people-make-when-trying-to-get-back-in-shape-after-40` | Most people don't struggle to get back in shape because they lack motivation—they struggle because they're focusing on the wrong things. |
| 2 | I'm Too Old to Start Exercising… Or Am I? | 2026-03-31 | Mobility, Longevity | `/insights/im-too-old-to-start-exercising-or-am-i` | It usually doesn't come from laziness. It comes from feeling like your body has changed… |
| 3 | Your Body Is Talking. Are You Listening? | 2026-02-25 | Mobility, Longevity | `/insights/your-body-is-talking-are-you-listening` | After 40, your body doesn't suddenly 'break.' It whispers first — through stiffness, tight shoulders, and subtle limitations. |
| 4 | Why the Scale Isn't Telling the Whole Story About Your Body After 40 | 2026-01-29 | Body Composition, Longevity | `/insights/why-the-scale-isnt-telling-the-whole-story-about-your-body-after-40` | After 40, the number on the scale becomes less reliable. It can't tell you how much muscle you're building… |
| 5 | December Reset: How to Take Care of Yourself Without Opting Out During the Holidays | 2025-12-18 | — | `/insights/december-reset-how-to-take-care-of-yourself-without-opting-out-during-the-holidays` | (excerpt not captured) |
| 6 | The Confidence Connection: How Better Posture Changes How Others See You | 2025-11-18 | — | `/insights/the-confidence-connection-how-better-posture-changes-how-others-see-you` | Your posture shapes how confident, capable, and attractive you appear. With simple daily habits, you can look and feel stronger… |
| 7 | The Fascia Factor: What It Is and Why It Could Be the Reason You Feel Stiff | 2025-10-24 | — | `/insights/the-fascia-factor-what-it-is-and-why-it-could-be-the-reason-you-feel-stiff` | Still feel tight even after stretching? It might not be your muscles—it's your fascia. |
| 8 | 3 Daily Stretches That Take You from Stiff and Sore to Confident and Strong | 2025-09-23 | — | `/insights/3-daily-stretches-that-take-you-from-stiff-and-sore-to-confident-and-strong` | Over 40 and feeling stiff? Mobility—not intensity—is the key to strength, confidence, and pain-free movement. |
| 9 | Why Mobility Matters More Than Intense Workouts After 40 | 2025-08-28 | — | `/insights/2025/why-mobility-matters-more` | (excerpt not captured) |
| 10 | Why Smart People Over 40 Are Rethinking Their Water Habits | 2025-07-02 | — | `/insights/smart-people-over-40-rethinking-water-habits` | Over 40? Hydration matters more than ever. Boost energy, digestion, skin, and focus… |
| 11 | Reclaiming Strength After 50: Karen's Story (and Why It's Never Too Late to Start) | 2025-06-05 | — | `/insights/reclaiming-strength-after-50` | (excerpt not captured) |
| 12 | The Power of Mobility: Why It's the Key to Aging Gracefully | 2025-05-09 | — | `/insights/the-power-of-mobility` | (excerpt not captured) |

---

## Contact Page

- **URL:** https://nicolehansultcoaching.com/contact
- **Browser title:** Contact Nicole Hansult | Functional Longevity Coach in Carlsbad, CA
- **H1:** Let's Connect

### Heading Hierarchy

- H1: Let's Connect
- H2: Let's Work Together

### Body Copy (Verbatim)

> Whether you're interested in a Clinical Longevity Evaluation, one-on-one coaching, speaking opportunities, or simply have a question, I'd love to hear from you.
>
> Complete the form and I'll personally respond to your message.

### Contact Info

- **Name:** Nicole Hansult
- **Title:** Functional Longevity Coach
- **Location:** Carlsbad, California
- **Email:** nicole@nicolehansultcoaching.com
- **Map:** Google Map embed (Carlsbad, CA pinned)

### Contact Form

| Field | Type | Required |
|---|---|---|
| First Name | text | yes |
| Last Name | text | yes |
| Email | email | yes |
| Phone | tel | no |
| What services are you interested in? | select | no |

**Service dropdown options:**
- Clinical Longevity Evaluation
- Strategy Session
- Vibrant40 Jumpstart
- Other

### CTAs

| Text | Destination |
|---|---|
| Submit | (form submission — currently Squarespace backend; will move to Resend API route) |
| Download | `/look-and-feel-good-naked` |
| Book a Session | `/booking-appointment` |

---

## Vibrant40 Jumpstart (Sales Page)

- **URL:** https://nicolehansultcoaching.com/vibrant40-jumpstart
- **H1 (visible):** Welcome to Vibrant40 Jumpstart
- **Status:** Public sales section visible; full program content gated behind Squarespace member login

### Body Copy (Verbatim — public-facing section)

> This page is only available for members.
>
> **Vibrant40 Jumpstart**
> $88.00
> One time
> Sign up
>
> Kickstart your energy, strength, and confidence in just 8 days.
>
> The Vibrant40 Jumpstart is a no-fluff, feel-good reset designed for busy people over 40 who want real change without the overwhelm.
>
> Get short workouts, simple nutrition, and doable mindset shifts that actually stick.
>
> ✔ Feel better in your body—fast
> ✔ Fuel your day without tracking or stress
> ✔ Rebuild consistency with tools that work in real life
>
> "Finally, something realistic that actually works."
> See more
>
> ✓ Short, effective workouts for strength & mobility
> ✓ No meal plans. Just real food habits that work.
> ✓ Built for busy people who want to feel better fast
> ✓ Create healthy lifestyle habits that last
>
> Log In

### Commerce Details

- **Pricing plan ID:** `f0ab3970-edb8-440d-b8c0-6ccfd7770e48`
- **Type:** FIXED_AMOUNT, one-time
- **Backend:** Squarespace Commerce → Stripe
- **Member portal:** Squarespace native member area (replacement TBD)

### CTAs

| Text | Destination |
|---|---|
| Sign up | Squarespace member signup flow |
| Log In | Squarespace member login |

---

## Look and Feel Good Naked (Lead Magnet)

- **URL:** https://nicolehansultcoaching.com/look-and-feel-good-naked
- **H1:** How to Look and Feel Good Naked Over 40

### Body Copy (Verbatim)

> **Download Your Free Guide**
>
> Get practical insights to improve your energy, mobility, and longevity without extreme diets or workouts.
>
> The guide covers:
> - Mindset development for confidence
> - Nutritious eating approaches
> - Mobility and core strengthening exercises
> - Hydration and sleep importance
> - Daily stress-reduction practices

### Form Fields

| Field name | Type | Placeholder | Required |
|---|---|---|---|
| `fname` | text | First Name | yes |
| `lname` | text | Last Name | yes |
| `email` | email | (Email Address) | yes |

**Submit method:** POST (currently to Squarespace backend; rebuild via Resend API route that delivers the guide PDF as attachment or download link)

**Success state:** "Thank you!" confirmation message displayed inline

---

## Booking Appointment

- **URL:** https://nicolehansultcoaching.com/booking-appointment
- **Embed:** Acuity Scheduling

### Embed Details

- **Script:** `<script src="https://embed.acuityscheduling.com/js/embed.js" type="text/javascript"></script>`
- **Iframe:** `<iframe title="Schedule Appointment" width="100%" frameBorder="0" allow="payment"></iframe>`
- **Acuity URL:** `https://app.acuityscheduling.com/schedule.php?owner=16610306`
- **Block type:** Squarespace component `website.components.acuity`

**Migration note:** Drop the embed script + iframe into a Next.js page component as-is. No backend changes needed. Owner ID stays the same.

---

## Privacy Policy

- **URL:** https://nicolehansultcoaching.com/privacy-policy

### Full Text (Verbatim)

> **Your Privacy Matters**
>
> By using our Website, you consent to the practices described in this Privacy Policy. We collect two types of information:
>
> **Information We Collect:**
>
> When you interact with our Website, you may voluntarily provide personal information, including but not limited to:
> - Name
> - Email address
> - Phone number (if provided)
> - Payment details (if purchasing a product or service)
> - Any other information you provide via forms, sign-ups, or customer inquiries
>
> When you visit our Website, certain information is automatically collected:
> - IP address
> - Browser type and version
> - Pages visited and time spent on the Website
> - Referral source (how you found our Website)
> - Cookies and similar tracking technologies
>
> **Data Security**
>
> We take data security seriously and implement industry-standard measures to protect your personal information, including:
> - Secure hosting and encryption
> - Limited access to personal data
> - Regular security reviews and updates
>
> However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
>
> **Cookies & Tracking**
>
> Our Website may use cookies and tracking technologies to enhance user experience and collect usage data. You can choose to disable cookies in your browser settings, but some features of our Website may not function properly.
>
> **Third-Party Services**
>
> We may use third-party services (such as email marketing providers, payment processors, and analytics tools) that collect, process, and store your data. These third parties have privacy policies that govern how they handle your information.
>
> **Email Communications**
>
> If you subscribe to our email list, we may send you newsletters, updates, and promotional emails. You can opt-out at any time by clicking the "unsubscribe" link in our emails or by contacting us directly at nicole@nicolehansultcoaching.com.
>
> **Your Rights**
>
> Depending on your location, you may have the following rights regarding your personal data:
> - Access your personal data
> - Request corrections or updates
> - Request deletion of your data
> - Opt-out of marketing communications
>
> To exercise any of these rights, please contact us at nicole@nicolehansultcoaching.com.
>
> **Policy Updates**
>
> We may update this Privacy Policy periodically. Any changes will be posted on this page with an updated "Effective Date." We encourage you to review this policy regularly.
>
> **Contact Us**
>
> If you have any questions about this Privacy Policy or how we handle your data, please contact us at nicole@nicolehansultcoaching.com.

---

## Terms & Conditions

- **URL:** https://nicolehansultcoaching.com/terms-conditions

### Full Text (Verbatim)

> **Agreement to Terms**
>
> By accessing or using this Website, you agree to comply with and be bound by these Terms. If you do not agree, please do not use our Website.
>
> **Prohibited Activities**
>
> Users shall not:
> - Engage in fraudulent, harmful, or abusive behavior
> - Violate intellectual property rights
> - Distribute spam, malware, or unauthorized promotions
> - Interfere with the Website's operation
>
> **Payments & Refunds**
>
> If you purchase a program, service, or product from us:
> - All payments are due at the time of purchase
> - We reserve the right to change pricing or discontinue products at any time
> - Refund policies are specified in individual product descriptions
>
> **Disclaimer of Warranties**
>
> We do not warrant that:
> - The Website will always be available, secure, or error-free
> - Any results promised in programs or content will be achieved
>
> **Limitation of Liability**
>
> Nicole Hansult Coaching is not liable for:
> - Any injuries, damages, or losses resulting from the use of our Website, content, or programs
> - Any third-party links, products, or services referenced on this Website
> - Our liability shall not exceed the amount you paid for any services or products
>
> **Third-Party Links**
>
> Our Website may contain links to third-party websites. We do not control or endorse their content and are not responsible for their policies or practices.
>
> **Termination**
>
> We reserve the right to suspend or terminate your access to the Website if you:
> - Violate these Terms
> - Engage in harmful or illegal activity
> - Use our content improperly
>
> **Updates to Terms**
>
> We may update these Terms from time to time. Any changes will be posted on this page with an updated "Effective Date." Continued use of the Website means you accept the new Terms.
>
> **Governing Law**
>
> These Terms shall be governed by and interpreted in accordance with the laws of California, without regard to conflict of law principles.
>
> **Contact Us**
>
> If you have any questions about these Terms, please contact us at nicole@nicolehansultcoaching.com.

---

## Image Migration Checklist

All images currently live on `images.squarespace-cdn.com`. Squarespace's CDN dies when the subscription ends. Every image must be downloaded and re-hosted in `/public/images/` of the Next.js repo (or Vercel Blob if file count grows).

A script to do this is part of the build phase (Phase 1, Step 4 of the parent build plan).

Image URLs to migrate are listed inline above under each page. Quick count:
- Home: 7 images (logo + 6 body)
- Services: 4 brand portraits
- About: 4 images
- Other pages: TBD (testimonials videos are higher-priority and gated behind separate decision)

---

## Audit Verification

Per the plan, this audit is "done" when:

1. ✅ This file exists in the repo on the `docs/content-audit` branch
2. ✅ Every page in the site map has a section with H1, verbatim body, images, CTAs, embeds
3. ✅ All open questions listed at the top under "Pending Nicole Confirmation"
4. ✅ Integrations table populated (Acuity owner ID, Vibrant40 pricing plan ID, contact email)
5. ⏳ Eliahs spot-check: open 3 random pages on live site, pick a sentence from each, search this file — must all be present verbatim
6. ⏳ Parent build plan references this file as input for the design + build phase
