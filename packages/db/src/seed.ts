import type { ResultsFile } from "@hotbox/schema";
import type { PrismaClient } from "@prisma/client";

/**
 * Upsert pipeline output into the LeadResult table.
 * This is the seam the pipeline's `onResult` callback will call at integration.
 *
 * Each LeadResult is upserted by username so repeated pipeline runs are idempotent.
 */
export async function seed(
  prisma: PrismaClient,
  results: ResultsFile,
): Promise<void> {
  const entries = Object.entries(results);

  for (const [username, result] of entries) {
    await prisma.leadResult.upsert({
      where: { username },
      create: {
        username,
        qualityScore: result.qualityScore,
        summary: result.summary,
        enrichmentInfo: JSON.stringify(result.enrichmentInfo),
      },
      update: {
        qualityScore: result.qualityScore,
        summary: result.summary,
        enrichmentInfo: JSON.stringify(result.enrichmentInfo),
      },
    });
  }
}
