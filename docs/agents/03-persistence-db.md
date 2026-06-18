# Agent 03 — Persistence / DB (Phase 1, parallel)

Provide a Prisma + SQLite data layer and a DB-backed `TriageStore` the UI can swap in. This is
**cut #2** in the time box — build it cleanly but it must not block core.

## Workspace
```bash
git worktree add -b feat/persistence ../HotBoxAssignment-persistence main
cd ../HotBoxAssignment-persistence && pnpm install
```
Read [PLAN.md](../../PLAN.md) §6 and [agents/README.md](README.md). Build against
`@hotbox/schema` types + the fixture; you do not need the live pipeline.

## Use `/tdd`
Write tests first. Make the **`TriageStore` contract** a reusable test suite and run it
against *both* the in-memory impl and your Prisma impl (against a temp SQLite file) so the
contract is provably honored. Test the API route handlers too. No network in tests.

## Scope
- **`packages/db`** — Prisma + SQLite:
  - Schema: `LeadResult` record (mirrors the contract: username PK + score + summary +
    flattened/JSON `enrichmentInfo`) and `Triage` (username, status, createdAt, updatedAt).
  - Generated client + a migration; a `seed(results)` function that upserts pipeline output
    (consumes the contract type — this is what the pipeline's `onResult` seam will call at
    integration).
  - A `prismaTriageStore` implementing the `@hotbox/schema` `TriageStore` interface.
- **`apps/web/app/api/triage/**`** — Next.js route handlers: `GET` (all triage state) +
  `POST` (`{ username, status }`), backed by `prismaTriageStore`. Plus a tiny client-side
  `apiTriageStore` implementing the same interface (fetches the routes) so Web can swap
  localStorage → API by changing only which store is injected.

## You own
`packages/db/**` and `apps/web/app/api/triage/**` only. **Do not** modify Web UI components or
the pipeline. Treat `@hotbox/schema` as read-only.

## Definition of done
- `pnpm --filter @hotbox/db migrate` (or equivalent) creates the SQLite schema; `seed()` upserts
  the fixture without error.
- The shared `TriageStore` contract suite passes for the Prisma impl; API route tests green.
- `pnpm typecheck`/`pnpm lint` green. Committed to `feat/persistence`.
