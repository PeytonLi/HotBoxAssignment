"use client";

import { useState, useMemo, useEffect } from "react";
import { loadLeadViews } from "@/lib/data";
import { filterEntries } from "@/lib/view-model";
import type { LeadFilters, LeadView } from "@/lib/view-model";
import { FilterBar } from "@/components/filter-bar";
import { QueuePanel } from "@/components/queue-panel";
import { DetailPanel } from "@/components/detail-panel";

export default function Page() {
  const [entries, setEntries] = useState<LeadView[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters>({});
  const [showHandled, setShowHandled] = useState(false);

  useEffect(() => {
    fetch("/api/results")
      .then((r) => (r.ok ? (r.json() as Promise<LeadView[]>) : Promise.reject(r.status)))
      .then(setEntries)
      .catch(() => setEntries(loadLeadViews()));
  }, []);

  const filtered = useMemo(
    () => filterEntries(entries, filters),
    [entries, filters],
  );

  const selectedLead = useMemo(
    () => entries.find((e) => e.username === selectedUsername) ?? null,
    [entries, selectedUsername],
  );

  return (
    <div className="app-layout">
      <div className="queue-panel">
        <FilterBar
          filters={filters}
          showHandled={showHandled}
          onFiltersChange={setFilters}
          onShowHandledChange={setShowHandled}
        />
        <QueuePanel
          entries={filtered}
          selectedUsername={selectedUsername}
          onSelect={setSelectedUsername}
          showHandled={showHandled}
        />
      </div>
      <DetailPanel lead={selectedLead} />
    </div>
  );
}
