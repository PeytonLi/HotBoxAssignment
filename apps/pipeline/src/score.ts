import Anthropic from "@anthropic-ai/sdk";
import { ScoreOutputSchema } from "@hotbox/schema";
import { CLAUDE_MODEL } from "@hotbox/config";
import type { BusinessProfile, EnrichmentBase, Lead, ScoreOutput } from "@hotbox/schema";

const TOOL_NAME = "score_lead";

const TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description:
    "Score a lead's expected value to this specific business and produce action guidance.",
  input_schema: {
    type: "object" as const,
    properties: {
      qualityScore: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Expected value score 0-100. MUST be an integer within the chosen tier's band.",
      },
      summary: {
        type: "string",
        description: "One sentence: who they are + what they're asking",
      },
      tier: {
        type: "string",
        enum: ["hot", "strong", "lukewarm", "weak", "spam"],
        description:
          "Quality tier — choose this FIRST based on expected value to this business:\n• hot (85-100): ready to convert on a priority goal\n• strong (65-84): strong-fit prospect, needs nurture\n• lukewarm (40-64): real but lower-value or off-priority\n• weak (15-39): poor fit / wrong vertical / not a customer\n• spam (0-14): spam / scam / selling TO the business",
      },
      scoreRationale: {
        type: "string",
        description: "One line explaining WHY this specific score (trust + explainability)",
      },
      recommendedAction: {
        type: "string",
        description: "One line on what the operator should do next",
      },
      draftReply: {
        type: ["string", "null"],
        description:
          "Ready-to-send DM in the business's casual voice. Provide ONLY for hot/strong/lukewarm tiers. Must be null for weak/spam.",
      },
    },
    required: ["qualityScore", "summary", "tier", "scoreRationale", "recommendedAction"],
  },
};

export async function scoreLead(
  lead: Lead,
  enrichment: EnrichmentBase,
  business: BusinessProfile,
  client: Anthropic,
): Promise<ScoreOutput> {
  const prompt = `You are scoring an inbound lead's expected value to this specific business.

BUSINESS PROFILE:
${JSON.stringify(business, null, 2)}

LEAD ENRICHMENT (derived from profile + posts + DM — treat this as complete):
${JSON.stringify(enrichment, null, 2)}

LEAD'S DM (verbatim):
${lead.dm}

SCORING INSTRUCTIONS:
1. Read the business profile fields — use "goals" ordering, "idealCustomer", and "commonSpam" as your rubric. Do NOT hardcode any specific industry name.
2. Choose a TIER first (based on expected value to this business), then pick an integer within that tier's band.
3. qualityScore MUST be an integer within the tier's band (hot 85-100, strong 65-84, lukewarm 40-64, weak 15-39, spam 0-14).
4. Follower count ≠ value. Score expected value to this business, not social popularity.
5. draftReply: write one only for hot/strong/lukewarm tiers in the business's casual, direct voice. Return null for weak/spam.`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    temperature: 0,
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("scoreLead: no tool_use block in response");
  }

  return ScoreOutputSchema.parse(block.input);
}
