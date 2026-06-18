"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { TriageStore, TriageStatus, TriageState } from "@hotbox/schema";

interface TriageContextValue {
  statuses: TriageState;
  setStatus: (username: string, status: TriageStatus) => Promise<void>;
  isHandled: (username: string) => boolean;
}

const TriageContext = createContext<TriageContextValue | null>(null);

export function TriageProvider({ store, children }: { store: TriageStore; children: ReactNode }) {
  const [statuses, setStatuses] = useState<TriageState>({});

  useEffect(() => {
    store.getAll().then(setStatuses);
  }, [store]);

  const setStatus = useCallback(
    async (username: string, status: TriageStatus) => {
      await store.setStatus(username, status);
      setStatuses((prev) => ({ ...prev, [username]: status }));
    },
    [store],
  );

  const isHandled = useCallback(
    (username: string) => {
      const s = statuses[username];
      return s === "handled" || s === "dismissed";
    },
    [statuses],
  );

  return (
    <TriageContext.Provider value={{ statuses, setStatus, isHandled }}>
      {children}
    </TriageContext.Provider>
  );
}

export function useTriage(): TriageContextValue {
  const ctx = useContext(TriageContext);
  if (!ctx) throw new Error("useTriage must be used within a TriageProvider");
  return ctx;
}
