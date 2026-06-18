# Agent 01 — Pipeline (enrich → score) (Phase 1, parallel)

Build the LLM pipeline that turns `data/*.json` into a contract-valid `results.json`.

## Workspace
```bash
git worktree add -b feat/pipeline ../HotBoxAssignment-pipeline main
cd ../HotBoxAssignment-pipeline && pnpm install
```
Read [PLAN.md](../../PLAN.md) §3–4 (it is the spec) and [agents/README.md](README.md).

## Use `/tdd`
Write tests first for all **pure logic**, mocking the Anthropic client (no live calls in
tests, ever): content-hash cache key, `clampScore`, tier→band enforcement, the contract
shaper (extras nested under `enrichmentInfo`), draft-reply **gating** (no draft for
`spam`/`scam` / below lukewarm), and per-lead error-record fallback. A tiny live smoke run is
a manual script, not a unit test.

## Scope — `apps/pipeline`
- CLI entry (`tsx`) run via `pnpm pipeline`. Load + zod-validate `data/business.json` and
  `data/leads.json` using `@hotbox/schema`.
- **Step 1 Enrich** (business-agnostic): tool-use call over `profile + posts + DM`, Sonnet 4.6
  (`claude-sonnet-4-6`), temp 0 → `EnrichmentInfo`. Remember: this is the **only** carrier of
  post-derived signal into scoring, so capture audience fit / vertical / authenticity /
  urgency fully.
- **Step 2 Score** (business-specific): tool-use call over `enrichment + raw DM + business.json`
  → `qualityScore`, `summary`, `scoreRationale`, `tier`, `recommendedAction`, and (gated)
  `draftReply`. Prompt the **tier-first, then number-in-band** calibration. Write the rubric
  against `business.json` *fields* — never hardcode "fitness/coaching".
- **Assemble** the exact contract object (top-level `qualityScore`/`summary`/`enrichmentInfo`;
  everything else nested), validate with `@hotbox/schema`, write `results.json`.
- **Robustness:** content-hash cache in `.cache/` (key includes a prompt-version string),
  `p-limit` (~5) concurrency, per-lead try/catch + bounded retries, zod re-validate + clamp.
- Leave a **seam** for DB seeding (e.g. call an optional `onResult(result)` hook) — do **not**
  import `packages/db` (that's the DB agent's wiring at integration).
- Consult current Anthropic TS SDK docs for tool-use / structured-output syntax before coding.

## You own
`apps/pipeline/**`. Consume `@hotbox/schema`; treat it as read-only (append-only + flag if
you truly need a new field).

## Definition of done
- `pnpm pipeline` produces a `results.json` that validates against `LeadResult` for all 25 leads.
- Unit tests green (cache, clamp, tier-band, contract shaping, draft gating, error fallback),
  with the LLM mocked. `pnpm typecheck`/`pnpm lint` green. Committed to `feat/pipeline`.
