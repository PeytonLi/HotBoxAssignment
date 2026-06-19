import { createHash } from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Lead } from "@hotbox/schema";
import type { PrismaClient } from "@prisma/client";

const CACHE_DIR = ".cache";

export function buildCacheKey(lead: Lead, promptVersion: string): string {
  const content = JSON.stringify(lead) + "|" + promptVersion;
  return createHash("sha256").update(content).digest("hex");
}

// DB-backed read: returns null on miss or error
async function readCacheDb<T>(prisma: PrismaClient, key: string): Promise<T | null> {
  try {
    const row = await prisma.cacheEntry.findUnique({ where: { key } });
    if (!row) return null;
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

// DB-backed write
async function writeCacheDb<T>(prisma: PrismaClient, key: string, value: T): Promise<void> {
  await prisma.cacheEntry.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

// Filesystem fallback (original behavior)
async function readCacheFs<T>(key: string): Promise<T | null> {
  try {
    const data = await readFile(join(CACHE_DIR, `${key}.json`), "utf-8");
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

async function writeCacheFs<T>(key: string, value: T): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
}

// Public API — accepts optional Prisma client; falls back to filesystem if omitted
export async function readCache<T>(key: string, prisma?: PrismaClient): Promise<T | null> {
  if (prisma) return readCacheDb<T>(prisma, key);
  return readCacheFs<T>(key);
}

export async function writeCache<T>(key: string, value: T, prisma?: PrismaClient): Promise<void> {
  if (prisma) return writeCacheDb<T>(prisma, key, value);
  return writeCacheFs<T>(key, value);
}
