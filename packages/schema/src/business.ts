import { z } from "zod";

/**
 * The business profile the pipeline qualifies leads against. Kept loose + passthrough so a
 * swapped business profile (different fields/shape) still parses — generalization lives here.
 */
export const BusinessProfileSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    offerings: z.string().optional(),
    idealCustomer: z.string().optional(),
    goals: z.string().optional(),
    commonSpam: z.string().optional(),
    location: z.string().optional(),
  })
  .passthrough();

export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;
