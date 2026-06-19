import { NextResponse } from "next/server";
import type { EnrichmentInfo } from "@hotbox/schema";
import { loadLeadViews } from "@/lib/data";
import type { LeadView } from "@/lib/view-model";

/**
 * Read scored leads from the database when one is configured.
 *
 * The DB is the single source of truth for *scoring* (qualityScore, summary, and the
 * enrichmentInfo blob), so results survive serverless deploys where results.json isn't on
 * disk and stay consistent across multiple web instances. But `LeadView` also needs profile
 * fields (fullName, bio, dm, recentPosts, isVerified) that are NOT stored in the DB — so we
 * merge the DB scoring onto the file-read base per username rather than building LeadViews
 * purely from DB rows.
 *
 * Returns null (caller falls back to the file source) when there is no DB, the DB is empty,
 * or the read fails.
 */
async function loadFromDb(): Promise<LeadView[] | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { prisma } = await import("@hotbox/db");
    const rows = await prisma.leadResult.findMany({
      orderBy: [{ qualityScore: "desc" }],
    });
    if (rows.length === 0) return null; // DB present but empty — fall back to the file source

    const baseByUsername = new Map(loadLeadViews().map((lead) => [lead.username, lead]));

    return rows.flatMap((row): LeadView[] => {
      const base = baseByUsername.get(row.username);
      if (!base) return []; // no profile data for this lead (not in the lead source) — skip

      const e = JSON.parse(row.enrichmentInfo) as EnrichmentInfo;
      return [
        {
          ...base, // profile fields: fullName, bio, followerCount, dm, recentPosts, isVerified
          qualityScore: row.qualityScore,
          summary: row.summary,
          tier: e.tier,
          intentCategory: e.intentCategory,
          primaryAsk: e.primaryAsk,
          vertical: e.vertical,
          audienceFit: e.audienceFit,
          spamSignals: e.spamSignals,
          buyingSignals: e.buyingSignals,
          language: e.language,
          audienceSize: e.audienceSize,
          confidence: e.confidence,
          scoreRationale: e.scoreRationale,
          recommendedAction: e.recommendedAction,
          draftReply: e.draftReply ?? null,
        },
      ];
    });
  } catch (error) {
    console.warn("GET /api/results: DB read failed, falling back to file:", error);
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const dbLeads = await loadFromDb();
    if (dbLeads) return NextResponse.json(dbLeads);

    // Fallback: local dev / no DB configured — serve the file (fixture) source.
    return NextResponse.json(loadLeadViews());
  } catch (error) {
    console.error("GET /api/results error:", error);
    // An empty inbox is better than a 500 on a fresh deployment with no data.
    return NextResponse.json([]);
  }
}
