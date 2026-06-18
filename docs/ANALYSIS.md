# If we only had the usernames

How I'd feasibly get the data and fold it into the pipeline if the input were *just* an
Instagram username per lead (no pre-hydrated profile/posts).

## The key reframe

- **We almost certainly still have the DM** — it's the inbound itself, and it's the single
  highest-signal field for both intent and qualification. The missing piece is the
  *hydrated* context: profile (bio, follower/following, verified, link) + recent posts. So
  this is a **data-hydration** problem, not a from-scratch problem.
- The current two-step design (business-agnostic **enrich** → business-specific **score**)
  already degrades gracefully here: thinner profile data → fewer/low-confidence enrichment
  fields → the score leans harder on the DM. The `confidence` field exists precisely for this.

## Acquisition options (lead with the pragmatic one)

- **Lead: third-party enrichment/scraper API** (Apify IG scrapers, Bright Data,
  Phantombuster, or a data vendor). Fastest path to profile + recent posts by username.
  Trade-offs to manage: per-profile cost, variable reliability/latency, and ToS/legal risk —
  so cache aggressively and treat fields as best-effort.
- **Fallback: official Instagram Graph API / Business Discovery.** Sanctioned and stable,
  but only covers business/creator accounts you're authorized for — won't resolve arbitrary
  inbound DMers. Good for compliance-sensitive deployments; can't be the whole answer.
- **Last resort: build our own scraper** (headless browser / public endpoints + rotating
  proxies). Most control, no vendor fee, but brittle, rate-limited, high maintenance, and the
  most ToS exposure. Frame as a backstop, not the default.

## How it plugs into the pipeline

- **Add a `hydrate` stage before `enrich`:** `username → fetch(profile, recentPosts)`. The
  rest of the pipeline is unchanged because it already consumes a `Lead` object — the
  hydrator just produces that object instead of reading it from `leads.json`.
- **Cache hydrated profiles** by username with a TTL (profiles change slowly; posts faster).
  This also caps vendor spend and lets re-runs be free, mirroring the existing content-hash
  cache.
- **Rate-limit + bounded retries + per-lead isolation** (same posture the batch already
  uses): a profile that's private, deleted, or fails to fetch yields a partial `Lead`, not a
  crash.
- **Vision option for posts:** if a vendor returns image URLs but no captions/alt-text, run a
  cheap vision pass to produce the `imageDescription` the enricher expects — keeps the
  enrichment schema identical to today.

## Quality & degradation

- **Carry `dataCompleteness`/`confidence` through to scoring.** When only the DM + a sparse
  bio are available, the score should widen its uncertainty and avoid over-penalizing thin
  profiles (a great lead with a near-empty profile shouldn't be buried) — surface
  `confidence` in the UI so the operator knows.
- **Asynchronous hydration:** for large/real-time volume, score immediately on the DM
  (fast, cheap) for an initial triage, then re-score once full hydration lands — the inbox
  shows a "DM-only" badge until enriched.

## Cost / compliance / ops

- Vendor cost scales per-profile → the cache + "DM-first, hydrate-on-demand" pattern keeps it
  bounded (only hydrate leads above an initial DM-based threshold).
- Respect platform ToS and privacy/PII handling; prefer the official API where it covers the
  account; document the data source per lead for auditability.
