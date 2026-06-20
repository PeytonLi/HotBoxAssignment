import { describe, it, expect } from "vitest";
import { EnrichmentBaseSchema } from "./enrichment.js";

const validBase = {
  intentCategory: "coaching_inquiry",
  primaryAsk: "wants 1:1 coaching",
  vertical: "fitness",
  audienceFit: { level: "high", reason: "fitness audience" },
  spamSignals: { isSpam: false, reasons: [] },
  buyingSignals: { urgency: "high", signals: ["plateaued 5 months"] },
  language: "en",
  confidence: 0.9,
  engagementRate: 0.045,
  contentAuthenticity: "high",
} as const;

describe("EnrichmentBaseSchema — engagementRate", () => {
  it("accepts a valid non-negative engagementRate", () => {
    expect(() => EnrichmentBaseSchema.parse(validBase)).not.toThrow();
  });

  it("accepts engagementRate of 0", () => {
    const input = { ...validBase, engagementRate: 0 };
    expect(EnrichmentBaseSchema.parse(input).engagementRate).toBe(0);
  });

  it("rejects negative engagementRate", () => {
    const input = { ...validBase, engagementRate: -0.01 };
    expect(() => EnrichmentBaseSchema.parse(input)).toThrow();
  });
});

describe("EnrichmentBaseSchema — contentAuthenticity", () => {
  it("accepts 'high', 'medium', and 'low'", () => {
    for (const val of ["high", "medium", "low"] as const) {
      const input = { ...validBase, contentAuthenticity: val };
      expect(EnrichmentBaseSchema.parse(input).contentAuthenticity).toBe(val);
    }
  });

  it("rejects an unknown contentAuthenticity value", () => {
    const input = { ...validBase, contentAuthenticity: "very_high" };
    expect(() => EnrichmentBaseSchema.parse(input)).toThrow();
  });
});
