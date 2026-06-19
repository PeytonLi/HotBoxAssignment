import type { TriageState, TriageStatus, TriageStore } from "@hotbox/schema";

/**
 * Client-side TriageStore that fetches the /api/triage routes.
 *
 * Swap this in for localStorageTriageStore to persist triage decisions server-side:
 *
 *   const store = typeof window === "undefined"
 *     ? inMemoryTriageStore()
 *     : apiTriageStore();
 */
export function apiTriageStore(): TriageStore {
  return {
    async getAll(): Promise<TriageState> {
      const response = await fetch("/api/triage");
      if (!response.ok) {
        throw new Error(`GET /api/triage failed: ${response.status}`);
      }
      return (await response.json()) as TriageState;
    },

    async setStatus(username: string, status: TriageStatus): Promise<void> {
      const secret = process.env.NEXT_PUBLIC_TRIAGE_API_SECRET;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (secret) headers["Authorization"] = `Bearer ${secret}`;

      const response = await fetch("/api/triage", {
        method: "POST",
        headers,
        body: JSON.stringify({ username, status }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? `POST /api/triage failed: ${response.status}`);
      }
    },
  };
}
