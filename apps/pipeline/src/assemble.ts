import { TIER_BANDS, clampScore } from "@hotbox/schema";
import type { EnrichmentBase, Lead, LeadResult, ScoreOutput, Tier } from "@hotbox/schema";

const DRAFT_ELIGIBLE_TIERS = new Set<Tier>(["hot", "strong", "lukewarm"]);

export function shouldIncludeDraft(tier: Tier): boolean {
  return DRAFT_ELIGIBLE_TIERS.has(tier);
}

export function enforceScoreBand(tier: Tier, score: number): number {
  const band = TIER_BANDS[tier];
  const clamped = clampScore(score);
  return Math.min(band.max, Math.max(band.min, clamped));
}

export function assembleLead(enrichBase: EnrichmentBase, scoreOut: ScoreOutput): LeadResult {
  const qualityScore = enforceScoreBand(scoreOut.tier, scoreOut.qualityScore);
  const draftReply = shouldIncludeDraft(scoreOut.tier) ? (scoreOut.draftReply ?? null) : null;

  return {
    qualityScore,
    summary: scoreOut.summary,
    enrichmentInfo: {
      ...enrichBase,
      tier: scoreOut.tier,
      scoreRationale: scoreOut.scoreRationale,
      recommendedAction: scoreOut.recommendedAction,
      draftReply,
    },
  };
}

export function makeErrorResult(lead: Lead, error: unknown): LeadResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    qualityScore: 0,
    summary: `Processing failed: ${message.slice(0, 200)}`,
    enrichmentInfo: {
      intentCategory: "other",
      primaryAsk: "unknown",
      vertical: "unknown",
      audienceFit: { level: "na", reason: "error during processing" },
      spamSignals: { isSpam: false, reasons: [] },
      buyingSignals: { urgency: "none", signals: [] },
      language: "en",
      confidence: 0,
      engagementRate: 0,
      contentAuthenticity: "low",
      tier: "spam",
      scoreRationale: "Processing error — manual review required",
      recommendedAction: `Investigate ${lead.username} and reprocess`,
      draftReply: null,
    },
  };
}
