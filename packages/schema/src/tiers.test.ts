import { describe, it, expect } from "vitest";
import { TIERS, TIER_BANDS, clampScore, tierForScore } from "./tiers";

describe("clampScore", () => {
  it("passes through valid integers", () => {
    expect(clampScore(50)).toBe(50);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
  });

  it("clamps out-of-range values into 0..100", () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(150)).toBe(100);
  });

  it("rounds floats to the nearest integer", () => {
    expect(clampScore(72.4)).toBe(72);
    expect(clampScore(72.6)).toBe(73);
  });

  it("treats NaN as 0", () => {
    expect(clampScore(Number.NaN)).toBe(0);
  });
});

describe("tierForScore", () => {
  it("maps band boundaries to the correct tier", () => {
    expect(tierForScore(100)).toBe("hot");
    expect(tierForScore(85)).toBe("hot");
    expect(tierForScore(84)).toBe("strong");
    expect(tierForScore(65)).toBe("strong");
    expect(tierForScore(64)).toBe("lukewarm");
    expect(tierForScore(40)).toBe("lukewarm");
    expect(tierForScore(39)).toBe("weak");
    expect(tierForScore(15)).toBe("weak");
    expect(tierForScore(14)).toBe("spam");
    expect(tierForScore(0)).toBe("spam");
  });

  it("clamps before mapping", () => {
    expect(tierForScore(9999)).toBe("hot");
    expect(tierForScore(-5)).toBe("spam");
  });
});

describe("TIER_BANDS", () => {
  it("is contiguous and covers the full 0..100 range with no gaps", () => {
    // sort tiers by descending min and assert each band starts one above the next
    const ordered = [...TIERS].sort((a, b) => TIER_BANDS[b].min - TIER_BANDS[a].min);
    expect(TIER_BANDS[ordered[0]].max).toBe(100);
    expect(TIER_BANDS[ordered[ordered.length - 1]].min).toBe(0);
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(TIER_BANDS[ordered[i]].min).toBe(TIER_BANDS[ordered[i + 1]].max + 1);
    }
  });
});
