/** Operator triage state for a lead in the inbox. */
export const TRIAGE_STATUSES = ["unhandled", "handled", "dismissed"] as const;
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];

/** username -> status. Absent usernames are treated as "unhandled". */
export type TriageState = Record<string, TriageStatus>;

/**
 * Pluggable triage persistence. The Web UI codes against this interface; Setup ships the
 * localStorage + in-memory impls, and the DB agent provides an API/Prisma-backed impl with
 * the same contract (see "@hotbox/schema/testing").
 */
export interface TriageStore {
  getAll(): Promise<TriageState>;
  setStatus(username: string, status: TriageStatus): Promise<void>;
}

/** In-memory store — for tests and as the contract reference impl. */
export function inMemoryTriageStore(initial: TriageState = {}): TriageStore {
  const state: TriageState = { ...initial };
  return {
    async getAll() {
      return { ...state };
    },
    async setStatus(username, status) {
      state[username] = status;
    },
  };
}

/** Browser-backed store. SSR-safe: no-ops to empty state when window is unavailable. */
export function localStorageTriageStore(key = "hotbox.triage"): TriageStore {
  const read = (): TriageState => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(key) ?? "{}") as TriageState;
    } catch {
      return {};
    }
  };
  const write = (state: TriageState): void => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(state));
  };
  return {
    async getAll() {
      return read();
    },
    async setStatus(username, status) {
      const state = read();
      state[username] = status;
      write(state);
    },
  };
}
