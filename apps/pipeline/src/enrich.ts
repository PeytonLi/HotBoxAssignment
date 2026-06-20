import Anthropic from "@anthropic-ai/sdk";
import { EnrichmentBaseSchema } from "@hotbox/schema";
import { CLAUDE_MODEL } from "@hotbox/config";
import type { EnrichmentBase, Lead } from "@hotbox/schema";

/** Average (likes + comments) per post divided by followerCount. Returns 0 for no posts or 0 followers. */
export function computeEngagementRate(
  posts: Pick<Lead["recentPosts"][number], "likeCount" | "commentCount">[],
  followerCount: number,
): number {
  if (posts.length === 0 || followerCount === 0) return 0;
  const total = posts.reduce(
    (sum, p) => sum + (p.likeCount ?? 0) + (p.commentCount ?? 0),
    0,
  );
  const avg = total / posts.length;
  return Math.round((avg / followerCount) * 10000) / 10000;
}

// Schema for what the tool actually returns — engagementRate is computed by us, not the LLM
const LlmEnrichmentSchema = EnrichmentBaseSchema.omit({ engagementRate: true });

const TOOL_NAME = "extract_enrichment";

const TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description:
    "Extract structured enrichment information from an inbound lead's profile, recent posts, and DM. This is the COMPLETE carrier of post-derived signal into scoring — capture every relevant detail.",
  input_schema: {
    type: "object" as const,
    properties: {
      intentCategory: {
        type: "string",
        enum: [
          "coaching_inquiry",
          "product_purchase",
          "product_question",
          "reorder",
          "support",
          "collab_inbound",
          "service_pitch",
          "scam",
          "off_vertical",
          "other",
        ],
        description: "Universal inbound taxonomy — what kind of message this is",
      },
      primaryAsk: {
        type: "string",
        description: "Short statement of what they actually want",
      },
      vertical: {
        type: "string",
        description: "Their content niche (fitness / skincare / marketing-agency / crypto / etc)",
      },
      audienceFit: {
        type: "object",
        properties: {
          level: { type: "string", enum: ["high", "medium", "low", "na"] },
          reason: { type: "string" },
        },
        required: ["level", "reason"],
        description: "How well this person matches a typical buyer or partner for a business",
      },
      spamSignals: {
        type: "object",
        properties: {
          isSpam: { type: "boolean" },
          reasons: { type: "array", items: { type: "string" } },
        },
        required: ["isSpam", "reasons"],
      },
      buyingSignals: {
        type: "object",
        properties: {
          urgency: { type: "string", enum: ["high", "medium", "low", "none"] },
          signals: {
            type: "array",
            items: { type: "string" },
            description: "Specific evidence of buying intent (deadlines, explicit asks, etc)",
          },
        },
        required: ["urgency", "signals"],
      },
      language: { type: "string", description: "Language code (en, es, etc)" },
      audienceSize: {
        type: "number",
        description: "followerCount from profile (passthrough)",
      },
      isVerified: { type: "boolean" },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "0..1 confidence in the enrichment given available data",
      },
      contentAuthenticity: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "Whether the follower count appears consistent with observed engagement. Use the pre-computed engagement rate provided in the prompt: high = engagement plausible for follower tier (micro >3%, macro >0.5%); medium = slightly below typical; low = near-zero engagement relative to followers (likely inflated/bought).",
      },
    },
    required: [
      "intentCategory",
      "primaryAsk",
      "vertical",
      "audienceFit",
      "spamSignals",
      "buyingSignals",
      "language",
      "confidence",
      "contentAuthenticity",
    ],
  },
};

export async function enrichLead(lead: Lead, client: Anthropic): Promise<EnrichmentBase> {
  const engagementRate = computeEngagementRate(lead.recentPosts, lead.followerCount);

  const postsText = lead.recentPosts
    .map(
      (p, i) =>
        `Post ${i + 1} (${p.postedAt}): ${p.caption}\n  [Image: ${p.imageDescription}] | Likes: ${p.likeCount} | Comments: ${p.commentCount}`,
    )
    .join("\n\n");

  const prompt = `You are analyzing an inbound DM for a business. Extract enrichment info about this lead.

PROFILE:
Username: @${lead.username}
Name: ${lead.fullName}
Bio: ${lead.bio}
Followers: ${lead.followerCount} | Following: ${lead.followingCount}
Verified: ${lead.isVerified}
Link in bio: ${lead.linkInBio || "none"}
Total posts: ${lead.postCount}

RECENT POSTS:
${postsText || "(no posts available)"}

DM RECEIVED:
${lead.dm}

PRE-COMPUTED SIGNAL:
Engagement rate: ${engagementRate.toFixed(4)} (avg likes+comments per post ÷ followers)
Benchmarks: micro-accounts (<10k) healthy >0.03; macro-accounts (>100k) healthy >0.005

IMPORTANT: This enrichment is the COMPLETE carrier of every post-derived signal into downstream scoring — the scorer will NOT see the posts. Extract audience fit, vertical, authenticity, urgency, and any time-sensitive details (e.g. "has a meet Saturday") fully. Use the pre-computed engagement rate above to set contentAuthenticity.`;

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
    throw new Error("enrichLead: no tool_use block in response");
  }

  // engagementRate is computed by us (deterministic); merge it with LLM-provided fields
  const llmFields = LlmEnrichmentSchema.parse(block.input);
  return EnrichmentBaseSchema.parse({ ...llmFields, engagementRate });
}
