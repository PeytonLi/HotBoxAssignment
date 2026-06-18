# Apex Fuel — Lead Triage Pipeline & Inbox

Lite version of Hotbox's inbound enrichment + qualification: run a batch of Instagram
leads through an LLM to **enrich** (infer structured attributes) and **qualify** (score
lead quality for the business), then triage them in an operator inbox.

> This doc is the source of truth for the build. It also doubles as a thinking artifact —
> the **Decision log** at the bottom records every fork and why we chose what we chose.

---

## 1. The problem & the data

**Business (`data/business.json`) — Apex Fuel:** supplement brand ($25–55 products) +
**$200/mo 1:1 coaching, the stated #1 priority**. Collabs only if the creator's audience
is *genuinely fitness*. Spam = fake "love your page, wanna collab??" DMs + people selling
marketing/growth services. Online only, ships US.

**Leads (`data/leads.json`) — 25 inbound DMs**, each with profile + recent posts + the DM.
The dataset is deliberately **stratified**, and that stratification *is* the test:

| Segment | Examples | Should score |
|---|---|---|
| Hot coaching intent | `matt.lifts.heavy` (134 followers!), `kels_fit.journey`, `carlos.fit.mx` (Spanish) | High |
| Warm product buyers (w/ urgency) | `lifting.layla28` (meet Saturday), `trevormlifts` (reorder), `dan.lifts.things` | Med–High |
| Genuine fitness collab | `calisthenics.cam` (22k), `lifts.with.lena` (61k, verified) | Med |
| Off-audience collab (trap) | `lifestyle.with.lena` (312k *travel*), `glowwithgreta` (47k skincare) | Low |
| Growth-service spam | `growthlab.media`, `brandgrowthbykyle`, `social.with.priya` | Very low |
| Scam | `cryptoking_gains2024` | ~0 |
| Wrong vertical (skincare buyers) | `nadia.skn`, `glowwith.marisa`, `sara.in.austin` | Low |
| Support, not a lead | `briannatfitness` (where's my shipping?) | Low–Med |

**Core insight the scorer must encode:** follower count ≠ value. The 312k lifestyle
influencer scores *low*; the 134-follower Matt scores *high*. Score = **expected value to
*this* business**, not popularity or vibe.

---

## 2. Architecture — pnpm + Turborepo monorepo

A monorepo is a deliberate choice: a shared **contract package** (`packages/schema`) lets
multiple agents build the pipeline, UI, DB, and eval **in parallel** without colliding,
because they all import the same types. Configs are kept minimal.

```
hotbox-leads/
├── pnpm-workspace.yaml        # workspaces: apps/*, packages/*
├── turbo.json                 # pipelines: build, dev, test, lint, typecheck
├── tsconfig.base.json
├── .env.example               # ANTHROPIC_API_KEY=
├── data/
│   ├── business.json          # input (staged)
│   └── leads.json             # input (staged)
├── packages/
│   ├── schema/                # ⭐ THE CONTRACT: zod schemas + TS types, tier/band defs,
│   │                          #    TriageStore interface, fixture results.json
│   ├── db/                    # Prisma + SQLite: records + triage state, API-backed store
│   └── eval/                  # labeled eval set + scorecard harness
├── apps/
│   ├── pipeline/              # tsx CLI: enrich → score → results.json (+ optional db seed)
│   └── web/                   # Next.js triage inbox UI
└── docs/
    ├── ANALYSIS.md            # usernames-only writeup (deliverable)
    └── agents/                # parallel-agent briefs (see §9)
```

---

## 3. Pipeline design

Two LLM steps per lead, **both via tool-use** (forced structured output), **Sonnet 4.6
(`claude-sonnet-4-6`) @ temperature 0**, validated with zod.

### Step 1 — Enrich (business-agnostic)
Reads `profile + posts + DM`. Extracts a **fixed, universal** schema — universal *fields*,
domain-flavored *values* (so a swapped non-fitness business doesn't get empty columns).

> ⚠️ **Critical:** the score step (below) sees enrichment + DM but **NOT the posts**. So
> enrichment must be the *complete carrier of every post-derived signal* (audience fit,
> vertical, authenticity, "has a meet Saturday"). If a signal isn't enriched, the score is
> blind to it.

`EnrichmentInfo` fields (all nested under `enrichmentInfo` in output):
- `intentCategory` — the universal inbound taxonomy: `coaching_inquiry` | `product_purchase`
  | `product_question` | `reorder` | `support` | `collab_inbound` | `service_pitch` |
  `scam` | `off_vertical` | `other`
- `primaryAsk` — short, what they actually want
- `vertical` — their niche (fitness / skincare / marketing-agency / crypto / …)
- `audienceFit` — `{ level: high|medium|low|na, reason }` — do they match `idealCustomer`?
- `spamSignals` — `{ isSpam: bool, reasons: [] }` — mapped to `commonSpam`
- `buyingSignals` — `{ urgency: high|med|low|none, signals: [] }` (deadlines, "6 months deciding")
- `language` — e.g. `en`, `es` (routes the reply)
- `audienceSize` / `isVerified` — passthrough/interpretation
- `confidence` — `0..1`, how much data backed the inference (powers the usernames-only future)

### Step 2 — Score + summarize (business-specific)
Reads `enrichment + raw DM + business.json`. Produces the qualified outputs.
- `qualityScore` — integer 0–100, **expected value to this business**, rubric written
  against `business.json` *fields* (`goals` ordering, `idealCustomer`, `commonSpam`) — never
  the words "fitness/coaching". This is what makes it survive a swapped business profile.
- **Calibration:** model picks a named **tier** first, then an integer **within the tier's
  band**. Avoids the cluster-at-60–85 jitter that wrecks top-down ordering.

  | Tier | Band | Meaning (value-to-business terms) |
  |---|---|---|
  | `hot` | 85–100 | Ready to convert on a **priority** goal |
  | `strong` | 65–84 | Strong-fit prospect, needs nurture |
  | `lukewarm` | 40–64 | Real but lower-value / off-priority |
  | `weak` | 15–39 | Poor fit / wrong vertical / not a customer |
  | `spam` | 0–14 | Spam / scam / selling *to* the business |

- `summary` — one sentence: who they are + what they're asking
- `scoreRationale` — one line, *why this number* (trust + explainability)
- `recommendedAction` — one line, what the operator should do next
- `draftReply` — ready-to-send DM, **only for qualified tiers** (≥ lukewarm), matched to the
  business's casual voice. Gated so we never draft replies to scams. *(Stretch — cut #1.)*

### Robustness (runs on **unseen** inputs, on a **fixed budget**)
- **Schema enforcement:** tool-use → effectively never fails to parse; zod re-validates +
  clamps `qualityScore` to 0–100.
- **Budget:** content-hash cache (hash each lead's content + prompt version) → re-runs and
  unchanged leads cost ~nothing.
- **Failure isolation:** per-lead try/catch + bounded retries; on permanent failure write a
  record with an error/low-confidence marker and continue. One bad lead never kills the batch.
- **Concurrency:** `p-limit` (~5) — works for 25 or 250 leads.

---

## 4. Output contract (exact)

The pipeline writes `results.json`. They'll grade it with a script expecting **exactly** this
top-level shape — so keep these three keys exact and **nest everything else** under
`enrichmentInfo`:

```jsonc
{
  "matt.lifts.heavy": {
    "qualityScore": 91,
    "summary": "An intermediate Ohio lifter stuck on bench/squat for 5 months, explicitly asking what 1:1 coaching involves month-to-month.",
    "enrichmentInfo": {
      "tier": "hot",
      "intentCategory": "coaching_inquiry",
      "primaryAsk": "What does monthly coaching look like (programming + form checks)?",
      "vertical": "fitness",
      "audienceFit": { "level": "high", "reason": "lifts, in target age, wants to get serious" },
      "spamSignals": { "isSpam": false, "reasons": [] },
      "buyingSignals": { "urgency": "high", "signals": ["plateaued 5mo", "explicitly wants accountability"] },
      "language": "en",
      "confidence": 0.9,
      "scoreRationale": "Bullseye for the #1 goal (coaching) with explicit readiness; low followers irrelevant to value.",
      "recommendedAction": "Reply with coaching overview + intake link; lead with form/programming.",
      "draftReply": "hey Matt! ..."
    }
  }
}
```

> If Prisma lands, the DB is seeded **in addition** — `results.json` is always written.

---

## 5. UI — triage inbox

Next.js. Reads `results.json` (decoupled; no browser-side API calls). Built around the
brief's verbs: **navigate** + **triage from the top down**.

- **Two-pane layout** (Gmail/Superhuman pattern): left = prioritized queue, right = detail.
- **Queue:** grouped by tier (Hot / Strong / Lukewarm / Weak / Spam) with counts; sorted by
  score desc within tier; **spam/scam auto-collapsed**.
- **Detail panel (evidence-first):** the raw **DM front and center**, recent posts
  collapsible, all enrichment fields, `scoreRationale`, `recommendedAction`, and the
  `draftReply` with a **copy** button.
- **Triage actions:** mark handled / dismissed, behind a thin `TriageStore` interface
  (localStorage impl first; swappable to the DB-backed impl).
- **Controls:** filter by tier/category, search, show/hide handled.

---

## 6. Persistence (Prisma + SQLite)

Deliberately scoped as the **last** thing (cut #2). To make it pay for itself it holds more
than checkboxes: **lead records** (pipeline-seeded) + **triage state** + timestamps, exposed
to the UI via API routes behind the same `TriageStore` interface. The pure-JSON contract
(`results.json`) is preserved regardless.

---

## 7. Quality strategy (graded criterion #1)

Don't trust the rubric blind. `packages/eval` ships a **small labeled set** (~8–12 of the 25
hand-ranked into expected tiers + relative order, with rationale) and a **scorecard harness**
that reads `results.json` and reports tier accuracy + rank correlation vs the labels. Tune
the rubric until it agrees. This is also a strong walkthrough artifact.

---

## 8. Generalization (unseen leads + possibly a different business)

Everything that's business-specific lives in **one place**: the scoring prompt, which reads
`business.json` *fields*. Enrichment, schema, tiers, and UI are business-agnostic. Sanity
test: mentally swap in a non-fitness `business.json` — nothing but the score should change.

---

## 9. Build order, cut lines, and parallel agents

**Phase 0 — Setup (blocking, on `main`):** scaffold, shared `schema` contract, fixture
`results.json`, store interface. Unblocks everyone. → `docs/agents/00-setup.md`

**Phase 1 — Features (parallel, each in its own worktree off `main`):**
- Pipeline → `docs/agents/01-pipeline.md`
- Web UI → `docs/agents/02-web-ui.md`
- Persistence/DB → `docs/agents/03-persistence-db.md`
- Eval/quality → `docs/agents/04-eval-quality.md`

**Phase 2 — E2E testing (after features merge):** → `docs/agents/05-e2e-testing.md`

**Cut order if the 5h clock wins:** Cut #1 = `draftReply`. Cut #2 = Prisma (fall back to
localStorage, which the store interface already supports). The core pipeline + UI + quality
pass is a complete, contract-passing submission on its own.

**~5h marker:** _(fill in where the time box was hit and what was cut.)_

---

## 10. Decision log (the grill)

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Stack | TS/Next.js (now pnpm+Turbo monorepo) | UI ceiling is ~half the eval; shared contract enables parallel agents |
| 2 | Pipeline shape | Enrich → score (2 steps) | Enrichment business-agnostic, scoring business-specific → clean generalization |
| 3 | Model | Sonnet 4.6 @ temp 0 | Best quality/cost for the deliberately ambiguous cases; budget is the constraint, not latency |
| 4 | Score-step input | enrichment + raw DM + business profile | Keeps separation but avoids the lossy-bottleneck (score still reads the real words) |
| 5 | Score meaning | Profile-driven holistic EV | Encodes the coaching>product>collab priority *and* survives a swapped business |
| 6 | Calibration | Anchored tiers → number-in-band, temp 0 | Stops cluster/jitter; tier doubles as the UI grouping key |
| 7 | Enrichment schema | Fixed *universal* triage schema | Rich but not overfit to fitness; stable UI columns |
| 8 | Action/reply | recommendedAction + gated draftReply | Mirrors Hotbox's real product; draft gated to qualified tiers (cut #1) |
| 9 | Schema enforcement | Tool-use + zod | Robust on unseen inputs |
| 10 | Budget | Content-hash cache | Re-runs/unchanged leads ~free on a fixed key |
| 11 | Failure mode | Per-lead isolation + retries + error record | One bad lead never kills the batch |
| 12 | UI layout | Two-pane ranked list + detail | Canonical triage pattern; matches "navigate + triage top-down" |
| 13 | Ordering | Grouped by tier, score-desc, spam collapsed | How an operator actually works |
| 14 | Persistence | Prisma + SQLite (records+triage+timestamps) | Chosen as a real data layer; scoped last, behind a store interface |
| 15 | Usernames-only | Lead w/ 3rd-party scraper + hydration stage | Pragmatic; DM stays the anchor; confidence down-weights thin data (see ANALYSIS.md) |
| 16 | Quality | Labeled eval set + scorecard | Protects the most-weighted criterion |
