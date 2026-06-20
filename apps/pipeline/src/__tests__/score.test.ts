import { describe, it, expect, vi } from "vitest";
import type { Lead, BusinessProfile, EnrichmentBase } from "@hotbox/schema";
import type Anthropic from "@anthropic-ai/sdk";
import { scoreLead } from "../score.js";

const mockEnrichment: EnrichmentBase = {
  intentCategory: "coaching_inquiry",
  primaryAsk: "What does coaching look like?",
  vertical: "fitness",
  audienceFit: { level: "high", reason: "active lifter" },
  spamSignals: { isSpam: false, reasons: [] },
  buyingSignals: { urgency: "high", signals: ["plateaued 5 months"] },
  language: "en",
  confidence: 0.9,
  engagementRate: 0.05,
  contentAuthenticity: "high",
};

const mockBusiness: BusinessProfile = {
  name: "Test Brand",
  description: "fitness supplements and 1:1 coaching",
  goals: "coaching first, then product sales",
  idealCustomer: "gym people 20s-40s",
  commonSpam: "fake collab DMs",
};

const mockLead: Lead = {
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

const validScoreOutput = {
  qualityScore: 88,
  summary: "A coaching lead with high intent",
  tier: "hot",
  scoreRationale: "Direct coaching request",
  recommendedAction: "Reply with coaching overview",
  draftReply: "hey! ...",
};

function makeClient(output = validScoreOutput): Anthropic {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "tool_use", name: "score_lead", input: output }],
      }),
    },
  } as unknown as Anthropic;
}

describe("scoreLead — S2 calibration examples", () => {
  it("includes a CALIBRATION EXAMPLES block in the prompt", async () => {
    const client = makeClient();
    await scoreLead(mockLead, mockEnrichment, mockBusiness, client);
    const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const prompt = call.messages[0].content as string;
    expect(prompt).toContain("CALIBRATION EXAMPLES");
  });

  it("anchors the hot tier with a concrete 91-score example", async () => {
    const client = makeClient();
    await scoreLead(mockLead, mockEnrichment, mockBusiness, client);
    const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const prompt = call.messages[0].content as string;
    expect(prompt).toContain("hot (91)");
  });

  it("anchors the weak tier with a large-follower-but-wrong-vertical example", async () => {
    const client = makeClient();
    await scoreLead(mockLead, mockEnrichment, mockBusiness, client);
    const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const prompt = call.messages[0].content as string;
    expect(prompt).toContain("weak (22)");
  });

  it("anchors the spam tier with a cold-pitch agency example", async () => {
    const client = makeClient();
    await scoreLead(mockLead, mockEnrichment, mockBusiness, client);
    const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const prompt = call.messages[0].content as string;
    expect(prompt).toContain("spam (5)");
  });

  it("places calibration examples before SCORING INSTRUCTIONS", async () => {
    const client = makeClient();
    await scoreLead(mockLead, mockEnrichment, mockBusiness, client);
    const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const prompt = call.messages[0].content as string;
    const calibIdx = prompt.indexOf("CALIBRATION EXAMPLES");
    const instrIdx = prompt.indexOf("SCORING INSTRUCTIONS");
    expect(calibIdx).toBeGreaterThan(-1);
    expect(instrIdx).toBeGreaterThan(calibIdx);
  });
});

describe("scoreLead — basic contract", () => {
  it("returns parsed ScoreOutput with correct fields", async () => {
    const client = makeClient();
    const result = await scoreLead(mockLead, mockEnrichment, mockBusiness, client);
    expect(result.qualityScore).toBe(88);
    expect(result.tier).toBe("hot");
    expect(result.summary).toBe("A coaching lead with high intent");
  });

  it("throws when no tool_use block is returned", async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "oops" }] }),
      },
    } as unknown as Anthropic;
    await expect(scoreLead(mockLead, mockEnrichment, mockBusiness, client)).rejects.toThrow(
      "scoreLead: no tool_use block",
    );
  });
});
