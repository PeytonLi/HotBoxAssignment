import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { BusinessProfileSchema, LeadsFileSchema, ResultsFileSchema } from "@hotbox/schema";
import { runPipeline } from "./pipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[pipeline] Error: ANTHROPIC_API_KEY is not set");
    process.exit(1);
  }

  const repoRoot = resolve(__dirname, "../../..");
  const dataDir = resolve(repoRoot, "data");

  const [businessRaw, leadsRaw] = await Promise.all([
    readFile(resolve(dataDir, "business.json"), "utf-8"),
    readFile(resolve(dataDir, "leads.json"), "utf-8"),
  ]);

  const business = BusinessProfileSchema.parse(JSON.parse(businessRaw));
  const leads = LeadsFileSchema.parse(JSON.parse(leadsRaw));

  console.log(`[pipeline] Loaded ${leads.length} leads from ${dataDir}`);
  console.log(`[pipeline] Business: ${business.name}`);
  console.log("[pipeline] Starting enrich → score pipeline...\n");

  const client = new Anthropic({ apiKey });
  const startMs = Date.now();

  const results = await runPipeline(leads, business, client, {
    onResult: async (username, result) => {
      const { tier } = result.enrichmentInfo;
      console.log(`  ✓ ${username.padEnd(30)} ${tier.padEnd(10)} (${result.qualityScore})`);
    },
  });

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  const outPath = resolve(repoRoot, "results.json");

  const validated = ResultsFileSchema.parse(results);
  await writeFile(outPath, JSON.stringify(validated, null, 2));

  console.log(`\n[pipeline] Done in ${elapsed}s — ${Object.keys(results).length} leads written to results.json`);

  if (process.env.DATABASE_URL) {
    try {
      const { seed, prisma } = await import("@hotbox/db");
      await seed(prisma, validated);
      console.log(`[pipeline] Seeded ${Object.keys(validated).length} leads into DB`);
    } catch (err) {
      console.warn("[pipeline] DB seed skipped:", (err as Error).message);
    }
  }
}

main().catch((err: unknown) => {
  console.error("[pipeline] Fatal:", err);
  process.exit(1);
});
