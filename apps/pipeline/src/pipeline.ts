import pLimit from "p-limit";
import type Anthropic from "@anthropic-ai/sdk";
import { LeadResultSchema } from "@hotbox/schema";
import type { BusinessProfile, Lead, LeadResult } from "@hotbox/schema";
import { enrichLead } from "./enrich.js";
import { scoreLead } from "./score.js";
import { assembleLead, makeErrorResult } from "./assemble.js";
import { buildCacheKey, readCache, writeCache } from "./cache.js";
import type { PrismaClient } from "@prisma/client";

const PROMPT_VERSION = "v1";
const MAX_RETRIES = 2;
const CONCURRENCY = 5;

export interface PipelineOptions {
  onResult?: (username: string, result: LeadResult) => Promise<void>;
  prisma?: PrismaClient;
}

async function processLead(
  lead: Lead,
  business: BusinessProfile,
  client: Anthropic,
  options: PipelineOptions,
): Promise<LeadResult> {
  const cacheKey = buildCacheKey(lead, PROMPT_VERSION);
  const cached = await readCache<LeadResult>(cacheKey, options.prisma);
  if (cached) {
    const parsed = LeadResultSchema.safeParse(cached);
    if (parsed.success) return parsed.data;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const enrichment = await enrichLead(lead, client);
      const score = await scoreLead(lead, enrichment, business, client);
      const result = assembleLead(enrichment, score);
      LeadResultSchema.parse(result);
      await writeCache(cacheKey, result, options.prisma);
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  return makeErrorResult(lead, lastError);
}

export async function runPipeline(
  leads: Lead[],
  business: BusinessProfile,
  client: Anthropic,
  options: PipelineOptions = {},
): Promise<Record<string, LeadResult>> {
  const limit = pLimit(CONCURRENCY);
  const results: Record<string, LeadResult> = {};

  await Promise.all(
    leads.map((lead) =>
      limit(async () => {
        const result = await processLead(lead, business, client, options);
        results[lead.username] = result;
        if (options.onResult) {
          await options.onResult(lead.username, result);
        }
      }),
    ),
  );

  return results;
}
