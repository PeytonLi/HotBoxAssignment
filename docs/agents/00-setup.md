# Agent 00 — Project Setup (Phase 0, BLOCKING)

You scaffold the monorepo and, most importantly, author the **shared contract** every other
agent depends on. Until you commit to `main`, no feature agent can start. Keep configs minimal.

## Workspace
You work **directly on `main`** (you create the base commit). All other agents branch off your
commit. Read [PLAN.md](../../PLAN.md) and [agents/README.md](README.md) first.

## Use `/tdd`
For the one piece of real logic you own — the **tier↔band mapping** and **score-clamp**
helpers in `packages/schema` — write tests first. Scaffolding/config doesn't need TDD.

## Scope — what to build

1. **Monorepo plumbing**
   - `pnpm-workspace.yaml` (`apps/*`, `packages/*`), root `package.json` with scripts that
     delegate to Turbo: `pipeline`, `dev`, `build`, `test`, `test:e2e`, `eval`, `typecheck`, `lint`.
   - `turbo.json` with `build`, `dev`, `test`, `lint`, `typecheck` pipelines.
   - `tsconfig.base.json`; per-package `tsconfig.json` extending it.
   - Vitest config, ESLint + Prettier (shared, minimal).
   - `.gitignore` (`node_modules`, `.env`, `.turbo`, `dist`, `.next`, `*.db`, `.cache/`,
     `results.json`) and `.env.example` (`ANTHROPIC_API_KEY=`).

2. **`packages/schema` — THE CONTRACT** (this is the deliverable that matters most)
   - zod schemas + inferred TS types for: `BusinessProfile`, `RecentPost`, `Lead`,
     `EnrichmentInfo`, and `LeadResult` (top-level `{ qualityScore, summary, enrichmentInfo }`
     with **everything extra nested under `enrichmentInfo`** — match PLAN §3–4 exactly).
   - `Tier` enum + `TIER_BANDS` table (hot 85–100, strong 65–84, lukewarm 40–64, weak 15–39,
     spam 0–14) + helpers: `tierForScore(score)`, `clampScore(n)`. **TDD these.**
   - `IntentCategory` union.
   - `TriageStore` **interface** (`getAll()`, `setStatus(username, status)`, where status ∈
     `unhandled | handled | dismissed`) + a `localStorageTriageStore` implementation (so Web
     can ship without the DB agent) + an in-memory impl for tests.
   - A small **`results.fixture.json`** (3–5 schema-valid leads spanning hot→spam) exported
     for Web + Eval to build against without running the pipeline.

3. **Package skeletons** (compile + empty test passing, so Turbo is green):
   `packages/db`, `packages/eval`, `apps/pipeline`, `apps/web` (Next.js app router).

4. Confirm `data/business.json` + `data/leads.json` are present (already staged).

## You own
Root configs, `packages/schema/**`, `data/`, the fixture, and empty skeletons of the other
packages/apps. **Do not** implement pipeline/UI/DB/eval logic — that's the feature agents.

## Definition of done
- `pnpm install` clean; `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` all green on
  the skeleton.
- `@hotbox/schema` exports all types/helpers above; `tierForScore`/`clampScore` unit-tested;
  `results.fixture.json` validates against `LeadResult`.
- Committed to `main`. Post a one-line "base ready" note so Phase 1 can start.
