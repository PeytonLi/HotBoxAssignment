import { z } from "zod";

/** Quality tiers, highest value first. Doubles as the UI grouping key. */
export const TIERS = ["hot", "strong", "lukewarm", "weak", "spam"] as const;
export type Tier = (typeof TIERS)[number];
export const TierSchema = z.enum(TIERS);

/** Score bands per tier, defined in value-to-business terms (see PLAN.md §3). */
export const TIER_BANDS: Record<Tier, { min: number; max: number }> = {
  hot: { min: 85, max: 100 },
  strong: { min: 65, max: 84 },
  lukewarm: { min: 40, max: 64 },
  weak: { min: 15, max: 39 },
  spam: { min: 0, max: 14 },
};

/** Coerce any number into a valid 0..100 integer score. */
export function clampScore(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Map a score to its tier (clamps first, so out-of-range input is safe). */
export function tierForScore(score: number): Tier {
  const s = clampScore(score);
  for (const tier of TIERS) {
    const band = TIER_BANDS[tier];
    if (s >= band.min && s <= band.max) return tier;
  }
  /* istanbul ignore next — bands cover 0..100, so this is unreachable */
  return "spam";
}
