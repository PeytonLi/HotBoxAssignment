"use client";

import type { Tier, IntentCategory } from "@hotbox/schema";
import { INTENT_CATEGORIES, TIERS } from "@hotbox/schema";
import type { LeadFilters } from "@/lib/view-model";

interface Props {
  filters: LeadFilters;
  showHandled: boolean;
  onFiltersChange: (filters: LeadFilters) => void;
  onShowHandledChange: (show: boolean) => void;
}

export function FilterBar({ filters, showHandled, onFiltersChange, onShowHandledChange }: Props) {
  return (
    <div className="filter-bar">
      <input
        type="text"
        placeholder="Search leads..."
        value={filters.search ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
        aria-label="Search leads"
      />
      <div className="filter-row">
        <select
          value={filters.tier ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, tier: (e.target.value || undefined) as Tier | undefined })}
          aria-label="Filter by tier"
        >
          <option value="">All tiers</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filters.intentCategory ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              intentCategory: (e.target.value || undefined) as IntentCategory | undefined,
            })
          }
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {INTENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            checked={showHandled}
            onChange={(e) => onShowHandledChange(e.target.checked)}
          />
          Show handled
        </label>
      </div>
    </div>
  );
}
