# Agent 04 — Eval / Quality (Phase 1, parallel)

Build the harness that proves the scoring is actually good — the most heavily weighted eval
criterion. You build the dataset + metrics in parallel; the actual rubric *tuning* happens at
integration once the real `results.json` exists.

## Workspace
```bash
git worktree add -b feat/eval ../HotBoxAssignment-eval main
cd ../HotBoxAssignment-eval && pnpm install
```
Read [PLAN.md](../../PLAN.md) §7 and [agents/README.md](README.md). Build against
`@hotbox/schema` + the fixture; the harness reads any `results.json` shape later.

## Use `/tdd`
Write tests first for the **metric functions** with synthetic inputs: tier-accuracy,
confusion matrix, and a rank-correlation (Spearman) over the labeled subset. Deterministic,
no LLM.

## Scope — `packages/eval`
- **Labeled dataset** (`labels.json`): hand-rank ~8–12 of the 25 leads into expected `tier`
  and a relative ordering, each with a one-line rationale. Anchor it to the PLAN stratification
  — e.g. `matt.lifts.heavy`→hot, `kels_fit.journey`→hot, `cryptoking_gains2024`→spam,
  `lifestyle.with.lena`→weak (off-audience despite 312k), `lifting.layla28`→strong,
  `briannatfitness`→lukewarm (support). Use your judgment from the actual DMs in `data/leads.json`.
- **Harness CLI** (`pnpm eval`): read `results.json`, join to `labels.json`, print a scorecard
  — tier accuracy, confusion matrix, rank correlation, and a list of the biggest
  predicted-vs-expected disagreements (the rubric-tuning worklist).
- Write a short `docs/EVAL.md` template the scorecard fills in.

## You own
`packages/eval/**` + `docs/EVAL.md`. Consume `@hotbox/schema`. Don't touch pipeline/UI/DB.

## Definition of done
- `pnpm eval` runs against the fixture and prints a scorecard (will look poor vs fixture —
  that's fine; it proves the harness works).
- Metric-function unit tests green; `labels.json` committed; `pnpm typecheck`/`pnpm lint`
  green. Committed to `feat/eval`.

> Integration note: once `feat/pipeline` is merged, whoever runs the real pipeline reruns
> `pnpm eval` and tunes the scoring prompt against the disagreement list. Flag a low score
> loudly — don't let an untuned rubric ship.
