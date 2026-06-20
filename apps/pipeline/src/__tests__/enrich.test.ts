import { describe, it, expect } from "vitest";
import { computeEngagementRate } from "../enrich.js";

describe("computeEngagementRate", () => {
  it("returns avg (likes + comments) per post divided by followerCount", () => {
    const posts = [
      { likeCount: 80, commentCount: 20 },
      { likeCount: 60, commentCount: 40 },
    ];
    // avg engagement per post = (100 + 100) / 2 = 100; rate = 100 / 1000 = 0.1
    expect(computeEngagementRate(posts as any, 1000)).toBeCloseTo(0.1);
  });

  it("returns 0 when posts array is empty", () => {
    expect(computeEngagementRate([], 10000)).toBe(0);
  });

  it("returns 0 when followerCount is 0", () => {
    const posts = [{ likeCount: 100, commentCount: 10 }];
    expect(computeEngagementRate(posts as any, 0)).toBe(0);
  });

  it("treats missing likeCount as 0", () => {
    const posts = [{ commentCount: 50 }];
    // avg = 50 / 1 = 50; rate = 50 / 1000 = 0.05
    expect(computeEngagementRate(posts as any, 1000)).toBeCloseTo(0.05);
  });

  it("treats missing commentCount as 0", () => {
    const posts = [{ likeCount: 100 }];
    expect(computeEngagementRate(posts as any, 1000)).toBeCloseTo(0.1);
  });

  it("rounds to 4 decimal places", () => {
    const posts = [{ likeCount: 1, commentCount: 0 }];
    const rate = computeEngagementRate(posts as any, 3);
    // 1 / 3 = 0.3333..., rounded to 4dp = 0.3333
    expect(rate).toBe(0.3333);
  });
});
