import type { Tier } from "@hotbox/schema";

export function ScoreBadge({ score, tier }: { score: number; tier: Tier }) {
  return <span className={"score-badge tier-" + tier}>{score}</span>;
}
