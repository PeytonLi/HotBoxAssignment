import type { TriageState, TriageStatus, TriageStore } from "@hotbox/schema";
import type { PrismaClient } from "@prisma/client";

/**
 * Prisma/SQLite-backed TriageStore implementing the @hotbox/schema contract.
 *
 * Usage:
 *   const store = prismaTriageStore(prisma);
 *   await store.getAll();          // => { "alice": "handled", ... }
 *   await store.setStatus("bob", "dismissed");
 */
export function prismaTriageStore(prisma: PrismaClient): TriageStore {
  return {
    async getAll(): Promise<TriageState> {
      const rows = await prisma.triage.findMany();
      const state: TriageState = {};
      for (const row of rows) {
        state[row.username] = row.status as TriageStatus;
      }
      return state;
    },

    async setStatus(username: string, status: TriageStatus): Promise<void> {
      await prisma.triage.upsert({
        where: { username },
        create: { username, status },
        update: { status },
      });
    },
  };
}
