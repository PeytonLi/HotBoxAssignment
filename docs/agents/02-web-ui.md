# Agent 02 — Web UI (triage inbox) (Phase 1, parallel)

Build the operator inbox that lets someone navigate and triage leads top-down.

## Workspace
```bash
git worktree add -b feat/web-ui ../HotBoxAssignment-web-ui main
cd ../HotBoxAssignment-web-ui && pnpm install
```
Read [PLAN.md](../../PLAN.md) §5 and [agents/README.md](README.md). **Build against the
fixture `results.fixture.json`** from `@hotbox/schema` — do not wait on the pipeline agent.

## Use `/tdd`
Write tests first for the pure **view-model logic** (Vitest + Testing Library): grouping by
tier, score-desc sort within tier, tier counts, spam auto-collapse, filtering (tier/category,
search), and `TriageStore` interaction (handled/dismissed updates). Mock the store with the
in-memory impl.

## Scope — `apps/web` (Next.js)
- Load `results.json` at runtime (fixture in dev). Render a **two-pane** layout:
  - **Left queue:** grouped by tier (Hot / Strong / Lukewarm / Weak / Spam) with counts,
    sorted by score desc within tier, **spam/scam collapsed by default**. Each row: score
    badge, tier color, name/username, `intentCategory` chip, one-line `summary`, urgency flag.
  - **Right detail (evidence-first):** raw **DM front and center**, recent posts collapsible,
    all enrichment fields, `scoreRationale`, `recommendedAction`, and `draftReply` with a
    **copy** button. Link out to the IG profile.
- **Triage actions** via the `TriageStore` interface from `@hotbox/schema` — use
  `localStorageTriageStore` for now (the DB agent provides a drop-in API-backed impl later, so
  keep the store **injected**, not imported concretely deep in components).
- **Controls:** filter by tier/category, search, toggle show/hide handled.
- Make it look like a real tool (clean hierarchy, keyboard-navigable list is a plus). Mind
  loading/empty states.

## You own
`apps/web/**` **except** `apps/web/app/api/triage/**` (that's the DB agent). Consume
`@hotbox/schema` + the fixture.

## Definition of done
- Inbox renders from the fixture; selecting a lead shows full detail; triage actions persist
  via the store and survive reload (localStorage).
- View-model + store-interaction tests green; `pnpm typecheck`/`pnpm lint` green. Committed to
  `feat/web-ui`.
