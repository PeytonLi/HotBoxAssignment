# Agent 05 — End-to-End Testing & Integration (Phase 2, after merges)

Wire the merged features together and prove the whole thing works end to end.

## Workspace
Start **after** the Phase 1 branches (`feat/pipeline`, `feat/web-ui`, `feat/persistence`,
`feat/eval`) are merged to `main`.
```bash
git worktree add -b feat/e2e ../HotBoxAssignment-e2e main
cd ../HotBoxAssignment-e2e && pnpm install
```
Read [PLAN.md](../../PLAN.md) and [agents/README.md](README.md).

## Use `/tdd`
Here TDD means **author the E2E test journeys first** (Playwright), then make the integration
wiring satisfy them. Fix integration gaps in the seams the feature agents left — don't rewrite
their internals.

## Integration tasks (minimal glue only)
- **Swap the Web `TriageStore`** from `localStorageTriageStore` to the DB-backed
  `apiTriageStore` (single injection point).
- **Wire the pipeline's `onResult` seam** to `packages/db` `seed()` so a run also populates the
  DB; confirm `results.json` is still written (contract).
- Ensure `pnpm dev` serves the inbox from real `results.json` and the triage API works.

## E2E suite (`pnpm test:e2e`, Playwright)
- Inbox loads; tiers grouped with correct counts; spam collapsed; ordering is score-desc.
- Open a hot lead → DM + enrichment + rationale + draft visible; **copy draft** works.
- Mark a lead handled → it updates and **persists across reload** (proves the DB/API path).
- Filter by tier/category and search narrow the queue correctly.

## Budget discipline
**Do not** re-run the LLM in E2E. Use a committed/recorded `results.json` fixture for the UI
journeys. At most **one** optional live pipeline smoke run (1–2 leads) behind a flag.

## Quality gate
Run `pnpm eval` against the real `results.json`; assert tier accuracy / rank correlation meet
an agreed threshold. If below, file the disagreement list back to whoever owns the scoring
prompt rather than papering over it.

## Definition of done
- `pnpm test:e2e` green; `pnpm eval` meets threshold; full `pnpm build`/`test`/`typecheck`/`lint` green.
- README run steps verified from a clean `pnpm install`.
- Update **PLAN.md §9** with where the ~5h mark hit and what (if anything) was cut. Committed to `feat/e2e`.
