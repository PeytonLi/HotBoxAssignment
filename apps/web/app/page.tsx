"use client";

import { useState, useMemo, useEffect } from "react";
import { loadLeadViews } from "@/lib/data";
import { filterEntries } from "@/lib/view-model";
import type { LeadFilters, LeadView } from "@/lib/view-model";
import { FilterBar } from "@/components/filter-bar";
import { QueuePanel } from "@/components/queue-panel";
import { DetailPanel } from "@/components/detail-panel";
import { useTriage } from "@/lib/triage-context";

export default function Page() {
  const [entries, setEntries] = useState<LeadView[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters>({});
  const [showHandled, setShowHandled] = useState(false);
  const { isHandled, setStatus } = useTriage();

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

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      const visible = filtered.filter((entry) => showHandled || !isHandled(entry.username));
      const idx = visible.findIndex((entry) => entry.username === selectedUsername);

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = visible[Math.min(idx + 1, visible.length - 1)];
        if (next) setSelectedUsername(next.username);
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = visible[Math.max(idx - 1, 0)];
        if (prev) setSelectedUsername(prev.username);
      }
      if (e.key === "h" && selectedUsername) void setStatus(selectedUsername, "handled");
      if (e.key === "d" && selectedUsername) void setStatus(selectedUsername, "dismissed");
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [filtered, selectedUsername, showHandled, isHandled, setStatus]);

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
