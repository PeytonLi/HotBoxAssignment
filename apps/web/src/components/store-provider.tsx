"use client";

import { TriageProvider } from "@/lib/triage-context";
import { localStorageTriageStore, type TriageStore } from "@hotbox/schema";
import type { ReactNode } from "react";

let store: TriageStore | null = null;

function getStore(): TriageStore {
  if (!store) store = localStorageTriageStore();
  return store;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return <TriageProvider store={getStore()}>{children}</TriageProvider>;
}
