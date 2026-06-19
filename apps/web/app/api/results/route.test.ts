import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { EnrichmentInfo } from "@hotbox/schema";

// Controllable mock for the Prisma client. Defined before vi.mock; the factory closure
// captures it and is only invoked lazily on first dynamic import of @hotbox/db.
const findMany = vi.fn();
vi.mock("@hotbox/db", () => ({
  prisma: { leadResult: { findMany } },
}));

// Import the route handler AFTER the mock is hoisted.
const { GET } = await import("./route");

/** A full, valid EnrichmentInfo blob as stored in LeadResult.enrichmentInfo (JSON string). */
function enrichmentBlob(overrides: Partial<EnrichmentInfo> = {}): string {
  const base: EnrichmentInfo = {
    tier: "weak",
    intentCategory: "other",
    primaryAsk: "db ask",
    vertical: "fitness",
    audienceFit: { level: "low", reason: "db" },
    spamSignals: { isSpam: false, reasons: [] },
    buyingSignals: { urgency: "none", signals: [] },
    language: "en",
    audienceSize: 134,
    isVerified: false,
    confidence: 0.5,
    scoreRationale: "db rationale",
    recommendedAction: "db action",
    draftReply: null,
  };
  return JSON.stringify({ ...base, ...overrides });
}

beforeEach(() => {
  findMany.mockReset();
});

afterEach(() => {
  delete process.env.DATABASE_URL;
});

describe("GET /api/results — DB path", () => {
  it("serves from the DB when DATABASE_URL is set, overriding score/summary/tier", async () => {
    process.env.DATABASE_URL = "postgresql://test";
    findMany.mockResolvedValue([
      {
        username: "matt.lifts.heavy",
        qualityScore: 42,
        summary: "from db",
        tier: "weak",
        intentCategory: "other",
        enrichmentInfo: enrichmentBlob({ tier: "weak" }),
      },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(findMany).toHaveBeenCalledOnce();
    expect(data).toHaveLength(1);
    const matt = data[0];
    // DB scoring wins...
    expect(matt.qualityScore).toBe(42);
    expect(matt.summary).toBe("from db");
    expect(matt.tier).toBe("weak");
    // ...but profile fields (not in the DB) are preserved from the lead source.
    expect(matt.fullName).toBe("Matt R.");
    expect(matt.dm.length).toBeGreaterThan(0);
  });

  it("preserves DB row order (already sorted by score desc)", async () => {
    process.env.DATABASE_URL = "postgresql://test";
    findMany.mockResolvedValue([
      { username: "lifting.layla28", qualityScore: 80, summary: "a", tier: "strong", intentCategory: "product_purchase", enrichmentInfo: enrichmentBlob() },
      { username: "matt.lifts.heavy", qualityScore: 70, summary: "b", tier: "strong", intentCategory: "coaching_inquiry", enrichmentInfo: enrichmentBlob() },
    ]);

    const res = await GET();
    const data = await res.json();
    expect(data.map((l: { username: string }) => l.username)).toEqual([
      "lifting.layla28",
      "matt.lifts.heavy",
    ]);
  });

  it("skips DB rows with no matching profile data", async () => {
    process.env.DATABASE_URL = "postgresql://test";
    findMany.mockResolvedValue([
      { username: "ghost.user", qualityScore: 99, summary: "x", tier: "hot", intentCategory: "other", enrichmentInfo: enrichmentBlob() },
      { username: "matt.lifts.heavy", qualityScore: 50, summary: "y", tier: "lukewarm", intentCategory: "coaching_inquiry", enrichmentInfo: enrichmentBlob() },
    ]);

    const res = await GET();
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].username).toBe("matt.lifts.heavy");
  });
});

describe("GET /api/results — file fallback", () => {
  it("falls back to the file source when DATABASE_URL is unset", async () => {
    delete process.env.DATABASE_URL;
    const res = await GET();
    const data = await res.json();

    expect(findMany).not.toHaveBeenCalled();
    expect(data.length).toBeGreaterThan(1);
    const matt = data.find((l: { username: string }) => l.username === "matt.lifts.heavy");
    expect(matt.qualityScore).toBe(91); // fixture value, not the DB value
  });

  it("falls back to the file source when the DB is present but empty", async () => {
    process.env.DATABASE_URL = "postgresql://test";
    findMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();
    expect(findMany).toHaveBeenCalledOnce();
    expect(data.length).toBeGreaterThan(1);
  });

  it("falls back to the file source when the DB read throws", async () => {
    process.env.DATABASE_URL = "postgresql://test";
    findMany.mockRejectedValue(new Error("connection refused"));

    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.length).toBeGreaterThan(1);
  });
});
