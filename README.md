# Apex Fuel — Lead Triage

Enrich + qualify a batch of inbound Instagram leads with an LLM, then triage them in an
operator inbox. Built for the Hotbox take-home. See **[PLAN.md](PLAN.md)** for the full
design and decision log, and **[docs/ANALYSIS.md](docs/ANALYSIS.md)** for the usernames-only
writeup.

## What it does

1. **Pipeline** (`apps/pipeline`) reads `data/business.json` + `data/leads.json`, runs each
   lead through a two-step LLM pass (enrich → score), and writes `results.json` with a
   0–100 `qualityScore`, a one-line `summary`, and structured `enrichmentInfo`.
2. **Inbox** (`apps/web`) reads `results.json` and lets an operator triage the inbox from the
   top down — grouped by quality tier, evidence-first detail, recommended action + draft reply.

## Stack

pnpm workspaces + Turborepo · TypeScript · Anthropic SDK (Claude Sonnet 4.6) · zod ·
Next.js · Prisma + SQLite (triage persistence).

```
packages/schema   shared zod schemas + types (the contract) + tier defs + store interface
packages/db       Prisma + SQLite: lead records + triage state
packages/eval     labeled eval set + scorecard harness
apps/pipeline     enrich → score → results.json
apps/web          Next.js triage inbox
```

## Prerequisites

- Node ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm`)
- An Anthropic API key

## Setup

```bash
pnpm install
cp .env.example .env        # then set ANTHROPIC_API_KEY
```

## Run

```bash
# 1) Run the enrichment + scoring pipeline → writes ./results.json
pnpm pipeline               # turbo run pipeline (apps/pipeline)

# 2) Launch the triage inbox (reads results.json)
pnpm dev                    # turbo run dev (apps/web) → http://localhost:3000
```

The pipeline **caches by content hash**, so re-runs and unchanged leads don't re-spend the
API budget. Delete `.cache/` to force a fresh run.

## Scripts

| Command | What |
|---|---|
| `pnpm pipeline` | Run enrich → score, write `results.json` |
| `pnpm dev` | Start the Next.js inbox |
| `pnpm build` | Build all packages/apps (Turbo) |
| `pnpm test` | Unit/component tests across the repo |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm eval` | Score `results.json` against the labeled set (scorecard) |
| `pnpm typecheck` / `pnpm lint` | Static checks |

## Notes

- `ANTHROPIC_API_KEY` is read from `.env` and is **git-ignored** — never committed.
- Output contract: top-level `{ qualityScore, summary, enrichmentInfo }` per username; all
  extra fields nest under `enrichmentInfo`.
