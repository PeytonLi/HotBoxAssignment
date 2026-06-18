"use client";

import { useState, useMemo } from "react";
import type { LeadView } from "@/lib/view-model";
import { groupByTier, sortByScoreDesc, computeTierCounts } from "@/lib/view-model";
import { TIERS, type Tier } from "@hotbox/schema";
import { QueueRow } from "./queue-row";
import { useTriage } from "@/lib/triage-context";

const TIER_LABELS: Record<Tier, string> = {
  hot: "Hot",
  strong: "Strong",
  lukewarm: "Lukewarm",
  weak: "Weak",
  spam: "Spam",
};

interface Props {
  entries: LeadView[];
  selectedUsername: string | null;
  onSelect: (username: string) => void;
  showHandled: boolean;
}

export function QueuePanel({ entries, selectedUsername, onSelect, showHandled }: Props) {
  const { isHandled } = useTriage();
  const [collapsedTiers, setCollapsedTiers] = useState<Set<Tier>>(new Set(["spam"]));

  const grouped = useMemo(() => {
    const filtered = showHandled ? entries : entries.filter((e) => !isHandled(e.username));
    const sorted = sortByScoreDesc(filtered);
    const groups = groupByTier(sorted);
    for (const tier of TIERS) {
      groups[tier] = sortByScoreDesc(groups[tier]);
    }
    return groups;
  }, [entries, showHandled, isHandled]);

  const counts = useMemo(() => computeTierCounts(grouped), [grouped]);

  const toggleTier = (tier: Tier) => {
    setCollapsedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

  return (
    <div className="queue-scroll">
      {TIERS.map((tier) => {
        const leads = grouped[tier];
        if (leads.length === 0) return null;
        const isCollapsed = collapsedTiers.has(tier);

        return (
          <div key={tier}>
            <div
              className={"tier-header tier-" + tier}
              onClick={() => toggleTier(tier)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") toggleTier(tier); }}
            >
              <span>
                {TIER_LABELS[tier]}{" "}
                <span className="tier-count">{counts[tier]}</span>
              </span>
              <span>{isCollapsed ? "+" : "−"}</span>
            </div>
            {!isCollapsed &&
              leads.map((lead) => (
                <QueueRow
                  key={lead.username}
                  lead={lead}
                  isSelected={lead.username === selectedUsername}
                  isHandled={isHandled(lead.username)}
                  onClick={() => onSelect(lead.username)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
