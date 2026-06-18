"use client";

import { TriageProvider } from "@/lib/triage-context";
import { inMemoryTriageStore, type TriageStore } from "@hotbox/schema";
import { apiTriageStore } from "../../app/api/triage/client";
import type { ReactNode } from "react";

let store: TriageStore | null = null;

function getStore(): TriageStore {
  if (!store) {
    store = typeof window === "undefined"
      ? inMemoryTriageStore()
      : apiTriageStore();
  }
  return store;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return <TriageProvider store={getStore()}>{children}</TriageProvider>;
}
