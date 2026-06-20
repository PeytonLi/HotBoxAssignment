import { z } from "zod";
import { TierSchema } from "./tiers";

/** Universal inbound-DM taxonomy (business-agnostic; values are domain-flavored). */
export const INTENT_CATEGORIES = [
  "coaching_inquiry",
  "product_purchase",
  "product_question",
  "reorder",
  "support",
  "collab_inbound",
  "service_pitch",
  "scam",
  "off_vertical",
  "other",
] as const;
export type IntentCategory = (typeof INTENT_CATEGORIES)[number];
export const IntentCategorySchema = z.enum(INTENT_CATEGORIES);

export const AudienceFitSchema = z.object({
  level: z.enum(["high", "medium", "low", "na"]),
  reason: z.string(),
});

export const SpamSignalsSchema = z.object({
  isSpam: z.boolean(),
  reasons: z.array(z.string()),
});

export const BuyingSignalsSchema = z.object({
  urgency: z.enum(["high", "medium", "low", "none"]),
  signals: z.array(z.string()),
});

/**
 * Output of STEP 1 (enrich) — business-agnostic facts extracted from profile + posts + DM.
 * This is the *complete carrier* of post-derived signal into scoring (which never sees posts).
 * Use this object as the tool/structured-output schema for the enrich call.
 */
export const EnrichmentBaseSchema = z.object({
  intentCategory: IntentCategorySchema,
  primaryAsk: z.string(),
  vertical: z.string(),
  audienceFit: AudienceFitSchema,
  spamSignals: SpamSignalsSchema,
  buyingSignals: BuyingSignalsSchema,
  language: z.string(),
  audienceSize: z.number().int().nonnegative().optional(),
  isVerified: z.boolean().optional(),
  confidence: z.number().min(0).max(1),
  /** avg (likes + comments) per post / followerCount; 0 if no posts or 0 followers */
  engagementRate: z.number().min(0),
  /** whether follower count appears consistent with observed engagement */
  contentAuthenticity: z.enum(["high", "medium", "low"]),
});
export type EnrichmentBase = z.infer<typeof EnrichmentBaseSchema>;

/**
 * Output of STEP 2 (score) — the business-specific qualified fields. `qualityScore` and
 * `summary` are top-level in the contract; the rest nest under `enrichmentInfo`.
 * Use this as the tool/structured-output schema for the score call.
 */
export const ScoreOutputSchema = z.object({
  qualityScore: z.number().int().min(0).max(100),
  summary: z.string(),
  tier: TierSchema,
  scoreRationale: z.string(),
  recommendedAction: z.string(),
  /** Null/omitted for unqualified tiers (spam/scam) — drafting is gated. */
  draftReply: z.string().nullable().optional(),
});
export type ScoreOutput = z.infer<typeof ScoreOutputSchema>;

/** The full nested `enrichmentInfo` object in the output contract = enrich + scored fields. */
export const EnrichmentInfoSchema = EnrichmentBaseSchema.extend({
  tier: TierSchema,
  scoreRationale: z.string(),
  recommendedAction: z.string(),
  draftReply: z.string().nullable().optional(),
});
export type EnrichmentInfo = z.infer<typeof EnrichmentInfoSchema>;
