# Parallel agent workflow

The build is split so multiple agents can work **simultaneously**. Read [PLAN.md](../../PLAN.md)
first — these briefs assume it.

## Phasing (there is one hard dependency)

You cannot fully parallelize from an empty repo: the **Setup agent must finish first** because
it creates the shared `packages/schema` contract every other agent imports, plus a fixture
`results.json` so feature agents don't block on each other.

```
Phase 0  ── 00-setup ───────────────► commits to main (THE BASE)
                │
Phase 1  ── 01-pipeline ┐
            02-web-ui    ├─ run in parallel, each in its own worktree off main
            03-persistence-db │
            04-eval-quality ┘
                │
Phase 2  ── 05-e2e-testing ─────────► after Phase 1 branches merge to main
```

## Rules for EVERY agent

1. **Work in your own git worktree** — never edit the main checkout directly:
   ```bash
   # from the main repo root, after Setup has committed to main:
   git worktree add -b feat/<name> ../HotBoxAssignment-<name> main
   cd ../HotBoxAssignment-<name>
   pnpm install
   ```
   (Setup itself works directly on `main` since it creates the base commit.)
2. **Use the `/tdd` skill for all implementation.** Write the failing test first, make it
   pass, refactor. LLM/network calls are **mocked** in unit tests — never burn API budget in
   tests.
3. **Stay in your lane.** Only edit the files/packages listed under *You own* in your brief.
   If you think the shared `packages/schema` contract must change, that's a coordination
   point — prefer **append-only** additions and call it out; don't silently rewrite shared types.
4. **Consume the contract, don't fork it.** Import types from `@hotbox/schema`. Build against
   the fixture `results.json` so you don't wait on other agents.
5. **Definition of done = your brief's checklist green:** `pnpm typecheck`, `pnpm lint`, and
   your tests pass in your worktree. Commit to your `feat/<name>` branch.

## Integration

Feature branches merge back to `main` (resolve `pnpm-lock.yaml` conflicts by re-running
`pnpm install` after merge). Then the **E2E agent** branches off the integrated `main`,
wires the real implementations together (e.g. swaps the localStorage `TriageStore` for the
DB-backed one), and verifies end to end.

## Package / ownership map (who touches what)

| Path | Owner |
|---|---|
| root configs, `packages/schema`, `data/`, fixture | Setup |
| `apps/pipeline` | Pipeline |
| `apps/web` (UI) | Web UI |
| `packages/db`, `apps/web/app/api/triage/**` | Persistence/DB |
| `packages/eval` | Eval/quality |
| `e2e/`, root test wiring | E2E testing |
