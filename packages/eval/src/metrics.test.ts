import { describe, it, expect } from "vitest";
import {
  tierAccuracy,
  buildConfusionMatrix,
  spearmanRankCorrelation,
  type LabelEntry,
} from "./metrics";
import type { ResultsFile } from "@hotbox/schema";

// ---- synthetic helpers ----

function result(tier: string, score: number) {
  return {
    qualityScore: score,
    summary: "test",
    enrichmentInfo: {
      tier: tier as never,
      intentCategory: "other" as const,
      primaryAsk: "",
      vertical: "",
      audienceFit: { level: "na" as const, reason: "" },
      spamSignals: { isSpam: false, reasons: [] },
      buyingSignals: { urgency: "none" as const, signals: [] },
      language: "en",
      confidence: 0.5,
      scoreRationale: "",
      recommendedAction: "",
    },
  };
}

function label(
  username: string,
  expectedTier: string,
  expectedOrder: number,
): LabelEntry {
  return {
    username,
    expectedTier: expectedTier as never,
    expectedOrder,
    rationale: "test",
  };
}

// ---- tier accuracy ----

describe("tierAccuracy", () => {
  it("returns 1.0 when all labels match", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1),
      label("b", "strong", 2),
      label("c", "spam", 3),
    ];
    const results: ResultsFile = {
      a: result("hot", 90),
      b: result("strong", 75),
      c: result("spam", 5),
    };
    expect(tierAccuracy(labels, results)).toBe(1);
  });

  it("returns 0.0 when none match", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1),
      label("b", "hot", 2),
    ];
    const results: ResultsFile = {
      a: result("spam", 3),
      b: result("weak", 25),
    };
    expect(tierAccuracy(labels, results)).toBe(0);
  });

  it("returns 0.5 for 1/2 correct", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1),
      label("b", "strong", 2),
    ];
    const results: ResultsFile = {
      a: result("hot", 88),
      b: result("lukewarm", 55),
    };
    expect(tierAccuracy(labels, results)).toBe(0.5);
  });

  it("skips labeled leads not present in results", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1),
      label("z", "hot", 2),
    ];
    const results: ResultsFile = {
      a: result("hot", 88),
    };
    expect(tierAccuracy(labels, results)).toBe(1);
  });

  it("returns 0 when no labeled leads are in results", () => {
    const labels: LabelEntry[] = [label("x", "hot", 1)];
    const results: ResultsFile = {};
    expect(tierAccuracy(labels, results)).toBe(0);
  });
});

// ---- confusion matrix ----

describe("buildConfusionMatrix", () => {
  it("returns a 5x5 matrix with all zeros for no matches", () => {
    const matrix = buildConfusionMatrix([], {});
    expect(Object.keys(matrix)).toHaveLength(5);
    for (const row of Object.values(matrix)) {
      expect(Object.values(row).reduce((a, b) => a + b, 0)).toBe(0);
    }
  });

  it("counts correct predictions on the diagonal", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1),
      label("b", "strong", 2),
      label("c", "spam", 3),
    ];
    const results: ResultsFile = {
      a: result("hot", 90),
      b: result("strong", 75),
      c: result("spam", 5),
    };
    const matrix = buildConfusionMatrix(labels, results);
    expect(matrix.hot.hot).toBe(1);
    expect(matrix.strong.strong).toBe(1);
    expect(matrix.spam.spam).toBe(1);
    expect(matrix.hot.strong).toBe(0);
  });

  it("counts mispredictions off-diagonal", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1), // mispredicted as lukewarm
    ];
    const results: ResultsFile = {
      a: result("lukewarm", 50),
    };
    const matrix = buildConfusionMatrix(labels, results);
    expect(matrix.hot.lukewarm).toBe(1);
    expect(matrix.hot.hot).toBe(0);
  });
});

// ---- Spearman ----

describe("spearmanRankCorrelation", () => {
  it("returns 1.0 for perfect monotonic agreement", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1),
      label("b", "hot", 2),
      label("c", "strong", 3),
    ];
    const results: ResultsFile = {
      a: result("hot", 95),
      b: result("hot", 90),
      c: result("strong", 72),
    };
    // rank expected: a=1, b=2, c=3
    // rank predicted: a=1 (95), b=2 (90), c=3 (72)
    expect(spearmanRankCorrelation(labels, results)).toBeCloseTo(1, 5);
  });

  it("returns -1.0 for perfect inverse agreement", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1),
      label("b", "hot", 2),
      label("c", "strong", 3),
    ];
    const results: ResultsFile = {
      a: result("hot", 10),
      b: result("hot", 20),
      c: result("strong", 90),
    };
    // rank expected: a=1, b=2, c=3
    // rank predicted: a=3 (10), b=2 (20), c=1 (90)
    expect(spearmanRankCorrelation(labels, results)).toBeCloseTo(-1, 5);
  });

  it("handles ties in predicted scores with average rank", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1),
      label("b", "hot", 2),
      label("c", "strong", 3),
    ];
    const results: ResultsFile = {
      a: result("hot", 80),
      b: result("hot", 80), // tied with a
      c: result("strong", 50),
    };
    // expected: a=1, b=2, c=3
    // predicted: a=1.5, b=1.5 (avg of 1,2), c=3
    // d: a=0.5 diff, b=-0.5 diff, c=0 diff → sum d^2 = 0.25+0.25+0=0.5
    // rho = 1 - 6*0.5/(3*8) = 1 - 3/24 = 1 - 0.125 = 0.875
    expect(spearmanRankCorrelation(labels, results)).toBeCloseTo(0.875, 5);
  });

  it("returns NaN for <2 labeled leads matched", () => {
    const labels: LabelEntry[] = [label("a", "hot", 1)];
    const results: ResultsFile = { a: result("hot", 80) };
    expect(spearmanRankCorrelation(labels, results)).toBeNaN();
  });

  it("ignores leads not in results", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1),
      label("z", "spam", 2),
    ];
    const results: ResultsFile = {
      a: result("hot", 90),
    };
    // Only 1 lead matched → NaN
    // But the test should verify it doesn't crash
    expect(spearmanRankCorrelation(labels, results)).toBeNaN();
  });

  it("returns 0 for random/no correlation (3 elements)", () => {
    const labels: LabelEntry[] = [
      label("a", "hot", 1),
      label("b", "strong", 2),
      label("c", "spam", 3),
    ];
    const results: ResultsFile = {
      a: result("hot", 50), // pred rank 2
      b: result("strong", 90), // pred rank 1
      c: result("spam", 10), // pred rank 3
    };
    // expected: a=1, b=2, c=3
    // predicted: a=2 (50), b=1 (90), c=3 (10)
    // d^2: a=1, b=1, c=0 → sum=2
    // rho = 1 - 6*2/(3*8) = 1 - 12/24 = 0.5
    expect(spearmanRankCorrelation(labels, results)).toBeCloseTo(0.5, 5);
  });
});
