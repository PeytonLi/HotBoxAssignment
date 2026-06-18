import { PrismaClient } from "@prisma/client";

/** Singleton Prisma client – reuse across requests and tests. */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function makeClient(databaseUrl?: string): PrismaClient {
  const opts = databaseUrl
    ? { datasources: { db: { url: databaseUrl } } }
    : undefined;
  return new PrismaClient(opts);
}

/** Default client (reads DATABASE_URL from env). */
export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

/**
 * Create an isolated client for tests (separate SQLite file).
 * Remember to call `$disconnect()` after tests.
 */
export function createTestClient(dbUrl: string): PrismaClient {
  return makeClient(dbUrl);
}
