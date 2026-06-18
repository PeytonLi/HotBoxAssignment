import { createHash } from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Lead } from "@hotbox/schema";

const CACHE_DIR = ".cache";

export function buildCacheKey(lead: Lead, promptVersion: string): string {
  const content = JSON.stringify(lead) + "|" + promptVersion;
  return createHash("sha256").update(content).digest("hex");
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const data = await readFile(join(CACHE_DIR, `${key}.json`), "utf-8");
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
}
