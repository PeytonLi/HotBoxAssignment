import type { Tier } from "@hotbox/schema";

const TIER_LABELS: Record<Tier, string> = {
  hot: "Hot",
  strong: "Strong",
  lukewarm: "Lukewarm",
  weak: "Weak",
  spam: "Spam",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={"tier-header tier-" + tier}>{TIER_LABELS[tier]}</span>;
}
