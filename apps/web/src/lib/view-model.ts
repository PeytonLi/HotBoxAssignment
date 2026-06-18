import type { Tier, IntentCategory } from "@hotbox/schema";

export interface LeadView {
  username: string;
  fullName: string;
  qualityScore: number;
  summary: string;
  tier: Tier;
  intentCategory: IntentCategory;
  primaryAsk: string;
  vertical: string;
  bio: string;
  followerCount: number;
  dm: string;
  recentPosts: Array<{
    caption?: string;
    imageDescription?: string;
    likeCount?: number;
    commentCount?: number;
    postedAt?: string;
  }>;
  isVerified: boolean;
  audienceFit: { level: "high" | "medium" | "low" | "na"; reason: string };
  spamSignals: { isSpam: boolean; reasons: string[] };
  buyingSignals: { urgency: "high" | "medium" | "low" | "none"; signals: string[] };
  language: string;
  audienceSize?: number;
  confidence: number;
  scoreRationale: string;
  recommendedAction: string;
  draftReply: string | null;
}

export interface TierGroups {
  hot: LeadView[];
  strong: LeadView[];
  lukewarm: LeadView[];
  weak: LeadView[];
  spam: LeadView[];
}

export interface TierCounts {
  hot: number;
  strong: number;
  lukewarm: number;
  weak: number;
  spam: number;
}

export interface LeadFilters {
  tier?: Tier;
  intentCategory?: IntentCategory;
  search?: string;
}

/** Group entries by their tier, preserving insertion order within each group. */
export function groupByTier(entries: LeadView[]): TierGroups {
  const groups: TierGroups = { hot: [], strong: [], lukewarm: [], weak: [], spam: [] };
  for (const entry of entries) {
    groups[entry.tier].push(entry);
  }
  return groups;
}

/** Sort entries by qualityScore descending (higher score first). */
export function sortByScoreDesc(entries: LeadView[]): LeadView[] {
  return [...entries].sort((a, b) => b.qualityScore - a.qualityScore);
}

/** Count entries in each tier group. */
export function computeTierCounts(groups: TierGroups): TierCounts {
  return {
    hot: groups.hot.length,
    strong: groups.strong.length,
    lukewarm: groups.lukewarm.length,
    weak: groups.weak.length,
    spam: groups.spam.length,
  };
}

function matchesSearch(entry: LeadView, search: string): boolean {
  const term = search.toLowerCase();
  return (
    entry.username.toLowerCase().includes(term) ||
    entry.fullName.toLowerCase().includes(term) ||
    entry.summary.toLowerCase().includes(term) ||
    entry.primaryAsk.toLowerCase().includes(term)
  );
}

/** Filter entries by optional tier, intentCategory, and search text. */
export function filterEntries(entries: LeadView[], filters: LeadFilters): LeadView[] {
  return entries.filter((entry) => {
    if (filters.tier && entry.tier !== filters.tier) return false;
    if (filters.intentCategory && entry.intentCategory !== filters.intentCategory) return false;
    if (filters.search && !matchesSearch(entry, filters.search)) return false;
    return true;
  });
}
