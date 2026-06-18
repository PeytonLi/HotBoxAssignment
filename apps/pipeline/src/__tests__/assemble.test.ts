import { describe, it, expect } from "vitest";
import { assembleLead, enforceScoreBand, shouldIncludeDraft, makeErrorResult } from "../assemble.js";
import { LeadResultSchema, TIER_BANDS } from "@hotbox/schema";
import type { EnrichmentBase, ScoreOutput, Lead } from "@hotbox/schema";

const baseEnrich: EnrichmentBase = {
  intentCategory: "coaching_inquiry",
  primaryAsk: "What does coaching look like?",
  vertical: "fitness",
  audienceFit: { level: "high", reason: "active lifter" },
  spamSignals: { isSpam: false, reasons: [] },
  buyingSignals: { urgency: "high", signals: ["plateaued 5 months"] },
  language: "en",
  audienceSize: 134,
  isVerified: false,
  confidence: 0.9,
};

const baseScore: ScoreOutput = {
  qualityScore: 91,
  summary: "Intermediate lifter asking about coaching",
  tier: "hot",
  scoreRationale: "Bullseye for coaching goal",
  recommendedAction: "Reply with coaching overview",
  draftReply: "hey Matt! ...",
};

describe("shouldIncludeDraft", () => {
  it("allows drafts for hot, strong, and lukewarm tiers", () => {
    expect(shouldIncludeDraft("hot")).toBe(true);
    expect(shouldIncludeDraft("strong")).toBe(true);
    expect(shouldIncludeDraft("lukewarm")).toBe(true);
  });

  it("gates drafts for weak and spam tiers", () => {
    expect(shouldIncludeDraft("weak")).toBe(false);
    expect(shouldIncludeDraft("spam")).toBe(false);
  });
});

describe("enforceScoreBand", () => {
  it("passes through a valid score already within the band", () => {
    expect(enforceScoreBand("hot", 91)).toBe(91);
    expect(enforceScoreBand("spam", 5)).toBe(5);
    expect(enforceScoreBand("lukewarm", 50)).toBe(50);
  });

  it("clamps a score above the band max down to the band max", () => {
    // spam band is 0-14; 50 is too high
    expect(enforceScoreBand("spam", 50)).toBe(TIER_BANDS.spam.max);
  });

  it("clamps a score below the band min up to the band min", () => {
    // hot band is 85-100; 50 is too low
    expect(enforceScoreBand("hot", 50)).toBe(TIER_BANDS.hot.min);
  });

  it("applies clampScore before banding (handles out-of-range inputs)", () => {
    expect(enforceScoreBand("hot", 150)).toBe(TIER_BANDS.hot.max); // 150 → 100 → hot max (100)
    expect(enforceScoreBand("spam", -10)).toBe(TIER_BANDS.spam.min); // -10 → 0 → spam min (0)
  });
});

describe("assembleLead", () => {
  it("places qualityScore and summary at the top level", () => {
    const result = assembleLead(baseEnrich, baseScore);
    expect(result.qualityScore).toBe(91);
    expect(result.summary).toBe("Intermediate lifter asking about coaching");
  });

  it("nests tier, scoreRationale, and recommendedAction under enrichmentInfo", () => {
    const result = assembleLead(baseEnrich, baseScore);
    expect(result.enrichmentInfo.tier).toBe("hot");
    expect(result.enrichmentInfo.scoreRationale).toBe("Bullseye for coaching goal");
    expect(result.enrichmentInfo.recommendedAction).toBe("Reply with coaching overview");
  });

  it("includes draftReply for a hot-tier lead", () => {
    const result = assembleLead(baseEnrich, baseScore);
    expect(result.enrichmentInfo.draftReply).toBe("hey Matt! ...");
  });

  it("nullifies draftReply for a spam-tier lead even when the LLM provided one", () => {
    const spamScore: ScoreOutput = {
      ...baseScore,
      tier: "spam",
      qualityScore: 5,
      draftReply: "this should not appear",
    };
    const result = assembleLead({ ...baseEnrich, intentCategory: "scam" }, spamScore);
    expect(result.enrichmentInfo.draftReply).toBeNull();
  });

  it("nullifies draftReply for a weak-tier lead", () => {
    const weakScore: ScoreOutput = {
      ...baseScore,
      tier: "weak",
      qualityScore: 25,
      draftReply: "also should not appear",
    };
    const result = assembleLead({ ...baseEnrich, intentCategory: "off_vertical" }, weakScore);
    expect(result.enrichmentInfo.draftReply).toBeNull();
  });

  it("enforces score band — clamps a mismatched tier/score pair", () => {
    const mismatchedScore: ScoreOutput = {
      ...baseScore,
      tier: "spam",
      qualityScore: 80, // way outside spam band (0-14)
    };
    const result = assembleLead(baseEnrich, mismatchedScore);
    expect(result.qualityScore).toBe(TIER_BANDS.spam.max); // 14
  });

  it("preserves all enrichment base fields inside enrichmentInfo", () => {
    const result = assembleLead(baseEnrich, baseScore);
    expect(result.enrichmentInfo.intentCategory).toBe("coaching_inquiry");
    expect(result.enrichmentInfo.vertical).toBe("fitness");
    expect(result.enrichmentInfo.confidence).toBe(0.9);
    expect(result.enrichmentInfo.audienceSize).toBe(134);
  });

  it("produces a result that passes LeadResultSchema validation", () => {
    const result = assembleLead(baseEnrich, baseScore);
    expect(() => LeadResultSchema.parse(result)).not.toThrow();
  });
});

describe("makeErrorResult", () => {
  const errLead: Lead = {
    username: "bad.lead",
    dm: "test",
    bio: "",
    fullName: "",
    followerCount: 0,
    followingCount: 0,
    isVerified: false,
    linkInBio: "",
    recentPosts: [],
    postCount: 0,
  };

  it("returns qualityScore of 0 and spam tier", () => {
    const result = makeErrorResult(errLead, new Error("API timeout"));
    expect(result.qualityScore).toBe(0);
    expect(result.enrichmentInfo.tier).toBe("spam");
  });

  it("includes the error message in the summary", () => {
    const result = makeErrorResult(errLead, new Error("Network failure"));
    expect(result.summary).toContain("Network failure");
  });

  it("always sets draftReply to null", () => {
    const result = makeErrorResult(errLead, "any error");
    expect(result.enrichmentInfo.draftReply).toBeNull();
  });

  it("passes LeadResultSchema validation", () => {
    const result = makeErrorResult(errLead, new Error("test"));
    expect(() => LeadResultSchema.parse(result)).not.toThrow();
  });
});
