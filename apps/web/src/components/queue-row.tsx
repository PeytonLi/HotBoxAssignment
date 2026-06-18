import type { LeadView } from "@/lib/view-model";
import { ScoreBadge } from "./score-badge";
import { CategoryChip } from "./category-chip";
import { UrgencyFlag } from "./urgency-flag";

interface Props {
  lead: LeadView;
  isSelected: boolean;
  isHandled: boolean;
  onClick: () => void;
}

export function QueueRow({ lead, isSelected, isHandled, onClick }: Props) {
  const rowClass = [
    "queue-row",
    isSelected && "selected",
    isHandled && "handled",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rowClass} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}>
      <div className="queue-row-top">
        <ScoreBadge score={lead.qualityScore} tier={lead.tier} />
        <span className="queue-row-name">{lead.fullName}</span>
        <CategoryChip category={lead.intentCategory} />
        <UrgencyFlag urgency={lead.buyingSignals.urgency} />
      </div>
      <div className="queue-row-username">@{lead.username}</div>
      <div className="queue-row-summary">{lead.summary}</div>
    </div>
  );
}
