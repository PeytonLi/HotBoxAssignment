import { describe, it, expect } from "vitest";
import { groupByTier, sortByScoreDesc, computeTierCounts, filterEntries } from "./view-model";
import type { LeadView } from "./view-model";

function makeEntry(
  username: string,
  overrides: Partial<LeadView> = {},
): LeadView {
  return {
    username,
    fullName: username,
    qualityScore: 50,
    summary: "test summary",
    tier: "lukewarm",
    intentCategory: "other",
    primaryAsk: "test ask",
    vertical: "fitness",
    bio: "",
    followerCount: 0,
    dm: "",
    recentPosts: [],
    isVerified: false,
    audienceFit: { level: "na", reason: "" },
    spamSignals: { isSpam: false, reasons: [] },
    buyingSignals: { urgency: "none", signals: [] },
    language: "en",
    audienceSize: 0,
    confidence: 0.5,
    scoreRationale: "",
    recommendedAction: "",
    draftReply: null,
    ...overrides,
  };
}

describe("groupByTier", () => {
  it("returns empty arrays for all tiers when given no entries", () => {
    const result = groupByTier([]);
    expect(result.hot).toEqual([]);
    expect(result.strong).toEqual([]);
    expect(result.lukewarm).toEqual([]);
    expect(result.weak).toEqual([]);
    expect(result.spam).toEqual([]);
  });

  it("groups entries by their tier field", () => {
    const hot = makeEntry("a", { tier: "hot", qualityScore: 90 });
    const strong = makeEntry("b", { tier: "strong", qualityScore: 70 });
    const spam = makeEntry("c", { tier: "spam", qualityScore: 5 });
    const result = groupByTier([hot, strong, spam]);
    expect(result.hot).toHaveLength(1);
    expect(result.hot[0].username).toBe("a");
    expect(result.strong).toHaveLength(1);
    expect(result.strong[0].username).toBe("b");
    expect(result.spam).toHaveLength(1);
    expect(result.lukewarm).toHaveLength(0);
  });

  it("puts multiple entries in the same tier group", () => {
    const a = makeEntry("a", { tier: "hot", qualityScore: 90 });
    const b = makeEntry("b", { tier: "hot", qualityScore: 88 });
    const result = groupByTier([a, b]);
    expect(result.hot).toHaveLength(2);
  });
});

describe("sortByScoreDesc", () => {
  it("sorts entries by qualityScore descending", () => {
    const a = makeEntry("a", { qualityScore: 50 });
    const b = makeEntry("b", { qualityScore: 90 });
    const c = makeEntry("c", { qualityScore: 70 });
    const sorted = sortByScoreDesc([a, b, c]);
    expect(sorted.map((e) => e.qualityScore)).toEqual([90, 70, 50]);
  });

  it("returns empty array unchanged", () => {
    expect(sortByScoreDesc([])).toEqual([]);
  });

  it("preserves single-entry array", () => {
    const a = makeEntry("a");
    expect(sortByScoreDesc([a])).toEqual([a]);
  });
});

describe("computeTierCounts", () => {
  it("returns zero counts for empty input", () => {
    const counts = computeTierCounts({ hot: [], strong: [], lukewarm: [], weak: [], spam: [] });
    expect(counts).toEqual({ hot: 0, strong: 0, lukewarm: 0, weak: 0, spam: 0 });
  });

  it("counts entries per tier", () => {
    const hot = makeEntry("a", { tier: "hot" });
    const strong = makeEntry("b", { tier: "strong" });
    const spam = makeEntry("c", { tier: "spam" });
    const grouped = groupByTier([hot, strong, spam]);
    const counts = computeTierCounts(grouped);
    expect(counts).toEqual({ hot: 1, strong: 1, lukewarm: 0, weak: 0, spam: 1 });
  });
});

describe("filterEntries", () => {
  const entries: LeadView[] = [
    makeEntry("alice", { tier: "hot", intentCategory: "coaching_inquiry", fullName: "Alice Fitness", summary: "wants coaching" }),
    makeEntry("bob", { tier: "strong", intentCategory: "product_purchase", fullName: "Bob Builder", summary: "needs protein" }),
    makeEntry("crypto_scam", { tier: "spam", intentCategory: "scam", fullName: "Crypto King", summary: "click my link" }),
    makeEntry("dave", { tier: "lukewarm", intentCategory: "support", fullName: "Dave Smith", summary: "where is my order" }),
  ];

  it("returns all entries when no filters are applied", () => {
    expect(filterEntries(entries, {})).toHaveLength(4);
  });

  it("filters by tier", () => {
    const result = filterEntries(entries, { tier: "hot" });
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("alice");
  });

  it("filters by intentCategory", () => {
    const result = filterEntries(entries, { intentCategory: "scam" });
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("crypto_scam");
  });

  it("filters by search text matching username", () => {
    const result = filterEntries(entries, { search: "alice" });
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("alice");
  });

  it("filters by search text matching fullName (case insensitive)", () => {
    const result = filterEntries(entries, { search: "builder" });
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("bob");
  });

  it("filters by search text matching summary", () => {
    const result = filterEntries(entries, { search: "coaching" });
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("alice");
  });

  it("combines multiple filters", () => {
    const result = filterEntries(entries, { tier: "spam", intentCategory: "scam" });
    expect(result).toHaveLength(1);
  });

  it("returns empty array when no entries match", () => {
    const result = filterEntries(entries, { tier: "hot", intentCategory: "scam" });
    expect(result).toHaveLength(0);
  });

  it("returns empty array for unknown tier filter", () => {
    const result = filterEntries([], { tier: "hot" });
    expect(result).toHaveLength(0);
  });
});
