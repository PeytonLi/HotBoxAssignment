import type { ResultsFile, Tier } from "@hotbox/schema";
import { TIERS } from "@hotbox/schema";

/** A single hand-labeled lead entry. */
export interface LabelEntry {
  username: string;
  expectedTier: Tier;
  expectedOrder: number; // 1 = best (highest value), ascending = worse
  rationale: string;
}

/**
 * Fraction of labeled leads whose predicted tier matches expected.
 * Only counts labeled leads present in `results`; ignores unlabeled leads.
 */
export function tierAccuracy(
  labels: LabelEntry[],
  results: ResultsFile,
): number {
  let correct = 0;
  let total = 0;
  for (const label of labels) {
    const result = results[label.username];
    if (!result) continue;
    total++;
    if (result.enrichmentInfo.tier === label.expectedTier) correct++;
  }
  return total === 0 ? 0 : correct / total;
}

/** A 5×5 matrix: rows = expected tier, cols = predicted tier. */
export type ConfusionMatrix = Record<Tier, Record<Tier, number>>;

/** Build a confusion matrix from labels and results. */
export function buildConfusionMatrix(
  labels: LabelEntry[],
  results: ResultsFile,
): ConfusionMatrix {
  const matrix: ConfusionMatrix = Object.fromEntries(
    TIERS.map((t) => [t, Object.fromEntries(TIERS.map((u) => [u, 0]))]),
  ) as ConfusionMatrix;

  for (const label of labels) {
    const result = results[label.username];
    if (!result) continue;
    matrix[label.expectedTier][result.enrichmentInfo.tier]++;
  }
  return matrix;
}

/**
 * Spearman rank correlation between labeled expectedOrder (lower = better)
 * and predicted qualityScore (higher = better). Handles ties with average rank.
 * Returns NaN when fewer than 2 labeled leads exist in results.
 */
export function spearmanRankCorrelation(
  labels: LabelEntry[],
  results: ResultsFile,
): number {
  const joined = labels
    .filter((l) => results[l.username] != null)
    .map((l) => ({
      username: l.username,
      expectedRank: l.expectedOrder,
      predictedScore: results[l.username]!.qualityScore,
    }));

  if (joined.length < 2) return Number.NaN;

  // Expected: lower order = higher rank. Sort ascending by order, assign rank 1 to best.
  const byExpected = [...joined].sort(
    (a, b) => a.expectedRank - b.expectedRank,
  );

  // Predicted: higher score = higher rank. Sort descending by score.
  const byPredicted = [...joined].sort(
    (a, b) => b.predictedScore - a.predictedScore,
  );

  // Assign expected ranks (no ties — we assign strict 1..n since order is unique).
  const rankMap = new Map<string, number>();
  for (let i = 0; i < byExpected.length; i++) {
    rankMap.set(byExpected[i].username + "_exp", i + 1);
  }

  // Assign predicted ranks with tie handling (average rank).
  let i = 0;
  while (i < byPredicted.length) {
    let j = i;
    while (
      j < byPredicted.length &&
      byPredicted[j].predictedScore === byPredicted[i].predictedScore
    ) {
      j++;
    }
    const avgRank = (i + 1 + j) / 2; // average of positions in 1-based indexing
    for (let k = i; k < j; k++) {
      rankMap.set(byPredicted[k].username + "_pred", avgRank);
    }
    i = j;
  }

  // Compute Spearman's rho
  const n = joined.length;
  let sumDSquared = 0;
  for (const item of joined) {
    const expRank = rankMap.get(item.username + "_exp")!;
    const predRank = rankMap.get(item.username + "_pred")!;
    sumDSquared += (expRank - predRank) ** 2;
  }

  return 1 - (6 * sumDSquared) / (n * (n * n - 1));
}
