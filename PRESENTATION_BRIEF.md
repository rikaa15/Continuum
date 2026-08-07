# Continuum — Presentation Brief

## Recommended track

**Primary track: Build an AI product with real willingness-to-pay.**

This is Continuum’s strongest positioning because the product addresses a
high-stakes, recurring consumer problem: people navigating U.S. immigration
must keep years of personal history current, understand changing rules, and
avoid missing deadlines. The value is not another immigration-news feed. The
value is knowing what applies to one person and what they should do next.

Continuum does not yet have a paying user, so the presentation should not imply
that it does. The honest track argument is a clear revenue path:

- Founding plan: **$49/year** for early users.
- Standard consumer plan: **$12/month or $99/year**.
- At $99/year, every paid user contributes far more than $10 ARR.
- 101 annual subscribers produce about **$10,000 ARR**.
- 1,011 annual subscribers produce about **$100,000 ARR**.

The strongest pre-presentation improvement would be one real paid pilot or
pre-order, even at the founding price. A payment is much stronger evidence than
a survey response or waitlist signup.

### Possible secondary-track fit

Only claim these if the official hackathon offers matching tracks:

- **Trustworthy or safe AI:** strong fit. Deterministic rules decide relevance;
  AI structures user-provided history and explains results, but does not make
  legal conclusions.
- **Memory / EverOS:** credible secondary fit. Confirmed structured profiles are
  mirrored to EverOS and can be explicitly reconciled without silently
  overwriting local facts. EverOS is not queried for every alert.
- **Cost of intelligence:** conceptually strong but currently weaker as a prize
  claim. Continuum filters with deterministic logic before invoking an LLM, but
  the Snowflake economics view is still projected unless measured rows are
  available.

Do not claim eligibility for an unnamed track without checking its official
requirements.

---

## Product in one sentence

**Continuum is a memory-powered immigration planning companion that joins a
person’s confirmed history with regulatory change and classifies each event as
a deadline, a re-prioritization, or no action.**

## Short tagline

**Immigration change, filtered to your life.**

## The hook

Immigration news creates anxiety because every proposed rule, court decision,
and policy memo sounds urgent. But most changes do not affect most people.

Continuum tells users less, correctly:

1. **Deadline:** this applies to you and a date now matters.
2. **Re-prioritize:** your long-term plan should change order.
3. **No action:** the change is real, but it does not apply to your profile.
4. **Needs facts:** Continuum refuses to guess when required information is
   missing.

## The problem

People navigating immigration currently have to combine:

- Personal facts spread across forms, documents, emails, and memory.
- Years of status, education, employment, travel, and petition history.
- Regulatory changes from agencies, courts, the Federal Register, visa
  bulletins, form updates, and processing changes.
- Generic online explanations that rarely account for transition provisions or
  one person’s actual situation.

The result is either constant anxiety or missed action. A generic news summary
cannot answer the real question: **Does this apply to me, and what is the
no-regret next step?**

## The user

The initial consumer is an international student or early-career worker moving
through F-1, OPT, STEM OPT, H-1B planning, and employment-based permanent
residence.

This user has:

- A multi-year immigration journey.
- Changing employers, travel plans, documents, and filing goals.
- High consequences for stale information or missed timing.
- A need for organization between occasional conversations with a DSO or
  attorney.

Continuum complements qualified professionals. It does not replace legal
advice, determine eligibility, represent users, or submit filings.

---

## What Continuum does today

### 1. Builds a structured profile

The initial assessment captures the minimum useful facts: location, current
basis, classification, citizenship, optional date of birth, family summary,
pending cases, goals, travel, and known deadlines.

Unknown answers remain explicitly unknown. They are never converted into a
negative conclusion.

### 2. Conducts a guided history interview

Users can describe complicated immigration history naturally. The AI:

- Corrects spelling and wording.
- Splits a long narrative into separate timeline events.
- Asks one focused follow-up question at a time.
- Remembers confirmed intake facts and avoids asking the same questions again.
- Shows every proposed fact or event for user confirmation.

Only confirmed structured updates enter the profile.

### 3. Analyzes immigration documents

Users can attach PDFs, JPEGs, or PNGs to the relevant history section. For
example, an I-94 uploaded to Entries and Travel can produce proposed admission
events and entry dates.

- Files are linked locally to the profile.
- The selected file is sent to the configured AI service for analysis.
- Extracted facts require confirmation.
- Common receipt, admission, and A-numbers are redacted from generated text.
- Raw files are not mirrored to EverOS.

### 4. Maintains structured memory

The browser profile is the current source of truth. Confirmed structured
profiles are mirrored to EverOS in the background.

The Profile page can compare local data with the latest EverOS snapshot. If the
remote profile is newer, Continuum asks before restoring it. There is no silent
overwrite.

True cross-device account recovery requires authentication and is not part of
the current demo.

### 5. Filters regulatory change

The Alerts hub evaluates versioned monitoring fixtures against confirmed
profile facts and produces:

- Deadline.
- Re-prioritization.
- Needs facts.
- No action.

Each alert shows:

- Change channel.
- Stage and effective date.
- Expected lead time.
- Reversibility.
- Transition provision to verify.
- Exact profile facts behind the result.
- A no-regret move.
- Source, version, and counsel-review status.

The current expanded monitoring items are clearly labeled demonstration
fixtures. They are not presented as verified current-law claims.

---

## Why AI is necessary

Immigration history does not arrive as clean database fields. It arrives as:

- “I started at community college, transferred my SEVIS record, finished two
  degrees, worked on STEM OPT, and now my job ended.”
- Scanned I-94 records, notices, EADs, and I-20s.
- Uncertain dates and overlapping status, filing, travel, and family facts.

AI is useful for turning that messy input into clean proposed structure and for
asking clarifying questions.

AI is not trusted to decide whether a rule applies. That decision remains in a
versioned TypeScript rule engine with three possible outcomes:

- affected,
- not affected,
- needs review.

The LLM explains the deterministic result afterward. This separation is the
core safety design.

## The moat

Summarizing a rule is a commodity. The defensible product is the join:

**regulatory event × current personal history → deadline | re-prioritize |
needs facts | no action**

That join becomes difficult because:

1. The profile must remain accurate across years.
2. Transition provisions depend on dates, location, travel, and filing history.
3. “Do nothing” must be a trusted product output.
4. Every conclusion must show the exact facts and source version behind it.

Continuum compounds value as its confirmed memory becomes more complete.

---

## Willingness to pay

The product is not selling generic immigration information. Free websites and
LLMs already provide that.

The paid value is:

- A persistent, organized immigration record.
- Personalized filtering instead of a high-volume news feed.
- Document-to-timeline extraction.
- Deadline and transition tracking.
- A clear record of why an alert applies or does not apply.
- Better preparation for meetings with a DSO or attorney.

### Proposed pricing

**Free**

- Initial assessment.
- One profile.
- Basic timeline.
- Demonstration alerts.

**Continuum Plus — $12/month or $99/year**

- Ongoing personalized monitoring.
- Document analysis.
- Unlimited guided history updates.
- Deadline calendar and reminders.
- EverOS-backed structured-memory reconciliation.
- Exportable history packet for professional review.

**Future professional plan**

- DSO, attorney, or mobility-team dashboard.
- Client-authorized profile review.
- Organization-specific checklists and rule packs.
- Audit trail for sources and profile versions.

The consumer annual plan is the clearest hackathon story. The professional plan
is an expansion path, not the current product claim.

### Fastest validation experiment

Before presenting:

1. Show Continuum to 10 international students or recent graduates.
2. Offer a $49 founding annual plan.
3. Ask for payment or a refundable deposit, not only interest.
4. Record the exact workflow each payer values most.
5. Use one real payment as the slide’s strongest proof point.

If nobody pays, do not hide it. Narrow the segment or value proposition.

---

# Three-minute slide deck

Keep the deck to **six slides**. The product demo should carry more weight than
text.

## Slide 1 — The hook

### On-slide copy

**Continuum**

**Immigration change, filtered to your life.**

Most immigration news does not affect you. The hard part is knowing which part
does.

### Speaker notes — 0:00–0:25

“Immigration news is consumed as anxiety. A rule is proposed, forums panic, and
most readers were never affected. Continuum remembers one person’s actual
history and classifies change into a deadline, a re-prioritization, or no
action.”

### Visual

One regulatory event entering Continuum and producing three outputs:
Deadline / Re-prioritize / No action.

## Slide 2 — The problem

### On-slide copy

**A news feed cannot answer: Does this apply to me?**

- Personal history changes over years.
- Rules contain dates, exceptions, and transition provisions.
- Missing one fact can reverse the result.
- Generic AI answers sound confident even when context is incomplete.

### Speaker notes — 0:25–0:50

“The relevant facts are scattered across forms, documents, employers, schools,
and memory. The same change can create a deadline for one student and no action
for another. A generic chatbot does not have a reliable, current profile.”

### Visual

Messy inputs on the left; one structured profile on the right.

## Slide 3 — The product demo

### On-slide copy

**Tell your story once. Keep it current.**

1. Minimal assessment.
2. Guided AI history interview.
3. Document-to-timeline extraction.
4. User confirms every update.

### Speaker notes — 0:50–1:30

“A user can describe a complicated F-1 and STEM OPT history in plain language.
The agent cleans it into separate events and asks one question at a time. They
can upload an I-94 and extract proposed entry dates. Nothing enters the profile
until the user confirms it.”

### Live demo

- Open a custom profile.
- Show the structured history timeline.
- Open the history interview.
- Briefly show the attachment button and confirmation cards.

Do not wait for a live model response during the presentation. Have a completed
example ready.

## Slide 4 — The personalized change layer

### On-slide copy

**One change. Different people. Different actions.**

- Deadline.
- Re-prioritize.
- Needs facts.
- No action.

### Speaker notes — 1:30–2:00

“Continuum joins a versioned monitoring event with confirmed profile facts. It
shows the exact facts behind the result, the transition provision to verify,
and a no-regret move. Most importantly, no action is a successful output—not a
missing notification.”

### Live demo

- Open Alerts.
- Show an action result for one profile.
- Switch to another profile.
- Show the same fixture becoming no action.

State clearly that expanded monitoring items are demonstration fixtures.

## Slide 5 — Why this is safe and defensible

### On-slide copy

**AI structures and explains. Deterministic rules decide.**

Structured memory → versioned rule engine → three-state result → AI explanation

Unknown fact → needs review, never a confident negative.

### Speaker notes — 2:00–2:30

“The model never decides who is affected. TypeScript rules make the
classification. Missing facts become needs review. EverOS mirrors confirmed
structured memory and supports explicit reconciliation, but never silently
overwrites local facts. Every alert carries source, version, stage, and review
status.”

### Visual

A four-step architecture line. Keep infrastructure logos secondary to the
product outcome.

## Slide 6 — Business and close

### On-slide copy

**A $99/year personal immigration command center**

- 101 users ≈ $10K ARR.
- Recurring value across a multi-year journey.
- Expansion to DSOs, attorneys, and mobility teams.

**Continuum tells you less—correctly.**

### Speaker notes — 2:30–3:00

“Users already spend significant time and money managing immigration risk. We
are not charging for information; we are charging for persistent memory,
personalized filtering, document organization, and deadline confidence. At
$99 a year, 101 users produce about $10,000 ARR. Continuum turns immigration
change from a news problem into a personal decision system.”

If there is a paying founding user, replace the ARR math headline with that
proof.

---

# Suggested live-demo sequence

Prepare two browser profiles before presenting.

1. Open a completed custom profile and show its timeline.
2. Open one saved document and its extracted proposed events.
3. Open Alerts and show a deadline or re-prioritization.
4. Switch to a profile for whom the same event is no action.
5. Open the alert detail and point to:
   - matched facts,
   - no-regret move,
   - source and version,
   - demonstration / counsel-review label.
6. Return to the closing slide.

The live demo should take no more than 60 seconds.

## Demo contingency

Do not depend on:

- A live OpenAI response.
- A fresh document upload.
- EverOS responding during the presentation.
- Snowflake showing measured data unless it has been verified immediately
  beforehand.

Use prebuilt profiles and already-analyzed examples. Keep a short screen
recording as backup.

---

# Claims to make

- Continuum has a working guided history interview.
- Users explicitly confirm AI-proposed facts.
- Documents can produce proposed structured timeline events.
- Deterministic rules classify relevance.
- Unknown required facts produce needs review.
- EverOS mirrors and explicitly reconciles structured profile memory.
- Alerts show provenance, stage, version, and counsel-review status.
- The consumer pricing path exceeds $10 ARR per paid user.

# Claims not to make

- Do not say Continuum provides legal advice or determines eligibility.
- Do not call demonstration fixtures current law.
- Do not say every alert is counsel reviewed.
- Do not say EverOS is queried for every alert.
- Do not claim cross-device recovery without authentication.
- Do not claim Snowflake measurements if the page says projected.
- Do not claim a paying user unless money was actually collected.
- Do not describe uploaded documents as remaining only on-device: a local copy
  is stored, and the selected document is sent to the configured AI service for
  analysis.

# Final positioning

Continuum is not an immigration chatbot and not an immigration newsletter.

It is a personal decision layer:

**remember the person → understand the change → show what applies → recommend a
no-regret next step → explicitly ignore the rest**
