import { describe, it, expect } from "vitest";
import fixture from "./results.fixture.json";
import { ResultsFileSchema } from "./result";

describe("results.fixture.json", () => {
  it("validates against the output contract", () => {
    expect(() => ResultsFileSchema.parse(fixture)).not.toThrow();
  });

  it("spans hot through spam tiers", () => {
    const parsed = ResultsFileSchema.parse(fixture);
    const tiers = new Set(Object.values(parsed).map((r) => r.enrichmentInfo.tier));
    expect(tiers.has("hot")).toBe(true);
    expect(tiers.has("spam")).toBe(true);
  });
});
