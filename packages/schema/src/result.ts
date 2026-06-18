import { z } from "zod";
import { EnrichmentInfoSchema } from "./enrichment";

/**
 * THE OUTPUT CONTRACT. Top level is exactly { qualityScore, summary, enrichmentInfo } per
 * username — every extra field nests under enrichmentInfo. Do not add top-level keys.
 */
export const LeadResultSchema = z.object({
  qualityScore: z.number().int().min(0).max(100),
  summary: z.string(),
  enrichmentInfo: EnrichmentInfoSchema,
});
export type LeadResult = z.infer<typeof LeadResultSchema>;

/** The shape written to results.json: a map of username -> LeadResult. */
export const ResultsFileSchema = z.record(z.string(), LeadResultSchema);
export type ResultsFile = z.infer<typeof ResultsFileSchema>;
