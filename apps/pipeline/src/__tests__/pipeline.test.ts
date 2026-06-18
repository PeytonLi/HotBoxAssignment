import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Lead, BusinessProfile } from "@hotbox/schema";
import type Anthropic from "@anthropic-ai/sdk";

// Mock LLM modules — no API calls in unit tests
vi.mock("../enrich.js", () => ({ enrichLead: vi.fn() }));
vi.mock("../score.js", () => ({ scoreLead: vi.fn() }));
// Mock cache to avoid filesystem side-effects
vi.mock("../cache.js", () => ({
  buildCacheKey: vi.fn(() => "test-cache-key"),
  readCache: vi.fn().mockResolvedValue(null),
  writeCache: vi.fn().mockResolvedValue(undefined),
}));

import { runPipeline } from "../pipeline.js";
import { enrichLead } from "../enrich.js";
import { scoreLead } from "../score.js";

const mockEnrich = vi.mocked(enrichLead);
const mockScore = vi.mocked(scoreLead);

const testLead: Lead = {
  username: "test.user",
  fullName: "Test User",
  bio: "lifter",
  followerCount: 500,
  followingCount: 200,
  isVerified: false,
  linkInBio: "",
  dm: "interested in coaching",
  recentPosts: [],
  postCount: 0,
};

const testBusiness: BusinessProfile = {
  name: "Test Brand",
  description: "supplements and coaching",
  goals: "coaching first, then product sales",
  idealCustomer: "gym people 20s-40s",
  commonSpam: "fake collab DMs",
};

const mockEnrichResult = {
  intentCategory: "coaching_inquiry" as const,
  primaryAsk: "coaching info",
  vertical: "fitness",
  audienceFit: { level: "high" as const, reason: "active lifter" },
  spamSignals: { isSpam: false, reasons: [] },
  buyingSignals: { urgency: "high" as const, signals: ["ready now"] },
  language: "en",
  confidence: 0.9,
};

const mockScoreResult = {
  qualityScore: 88,
  summary: "Test user asking about coaching",
  tier: "hot" as const,
  scoreRationale: "High intent coaching lead",
  recommendedAction: "Reply with coaching overview",
  draftReply: "hey! ...",
};

const fakeClient = {} as Anthropic;

describe("runPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrich.mockResolvedValue(mockEnrichResult);
    mockScore.mockResolvedValue(mockScoreResult);
  });

  it("produces a keyed result for each lead", async () => {
    const results = await runPipeline([testLead], testBusiness, fakeClient);
    expect(Object.keys(results)).toHaveLength(1);
    expect(results["test.user"]).toBeDefined();
    expect(results["test.user"].qualityScore).toBe(88);
  });

  it("calls the onResult hook for each lead with the assembled result", async () => {
    const onResult = vi.fn().mockResolvedValue(undefined);
    await runPipeline([testLead], testBusiness, fakeClient, { onResult });
    expect(onResult).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith(
      "test.user",
      expect.objectContaining({ qualityScore: 88 }),
    );
  });

  it("returns an error fallback record when enrichment fails all retries", async () => {
    mockEnrich.mockRejectedValue(new Error("API timeout"));
    const results = await runPipeline([testLead], testBusiness, fakeClient);
    const result = results["test.user"];
    expect(result.qualityScore).toBe(0);
    expect(result.enrichmentInfo.tier).toBe("spam");
    expect(result.summary).toContain("Processing failed");
  });

  it("processes multiple leads and returns all results", async () => {
    const lead2: Lead = { ...testLead, username: "another.user" };
    const results = await runPipeline([testLead, lead2], testBusiness, fakeClient);
    expect(Object.keys(results)).toHaveLength(2);
    expect(results["test.user"]).toBeDefined();
    expect(results["another.user"]).toBeDefined();
  });

  it("isolates failures — one failing lead does not block others", async () => {
    const goodLead: Lead = { ...testLead, username: "good.user" };
    mockEnrich.mockImplementation(async (lead: Lead) => {
      if (lead.username === "test.user") throw new Error("always fails");
      return mockEnrichResult;
    });
    const results = await runPipeline([testLead, goodLead], testBusiness, fakeClient);
    expect(results["test.user"].qualityScore).toBe(0); // error fallback
    expect(results["good.user"].qualityScore).toBe(88); // succeeded
  });
});
