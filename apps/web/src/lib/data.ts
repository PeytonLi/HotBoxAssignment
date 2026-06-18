import fixtureResults from "@hotbox/schema/fixture";
import type { LeadResult } from "@hotbox/schema";
import type { LeadView } from "./view-model";

/**
 * Small lead fixture matching the results.fixture.json usernames.
 * In production this would come from the leads input file or a database.
 */
const LEAD_FIXTURE: Record<string, {
  fullName: string;
  bio: string;
  followerCount: number;
  dm: string;
  recentPosts: Array<{
    caption?: string;
    imageDescription?: string;
    likeCount?: number;
    commentCount?: number;
    postedAt?: string;
  }>;
  isVerified: boolean;
}> = {
  "matt.lifts.heavy": {
    fullName: "Matt R.",
    bio: "just a dude trying to get strong 🏋️ | 28 | ohio",
    followerCount: 134,
    isVerified: false,
    dm: "hey so i've been stuck at the same bench and squat for like 5 months now and nothing i try is moving the needle. i've watched probably every youtube video at this point lol. i'm at the place where i think i actually need someone to tell me what i'm doing wrong and hold me accountable. what does your coaching actually look like month to month? like how involved are you with programming and checking form?",
    recentPosts: [
      { caption: "finally hit 225 on squat after being stuck at 205...", imageDescription: "a man in a squat rack at a mid-size gym", likeCount: 9, commentCount: 2, postedAt: "4d ago" },
      { caption: "sunday morning check in. coffee...", imageDescription: "a white ceramic mug on a kitchen counter", likeCount: 6, commentCount: 3, postedAt: "2w ago" },
      { caption: "took my dog cooper to the park...", imageDescription: "a medium sized brown lab mix running", likeCount: 11, commentCount: 1, postedAt: "3w ago" },
    ],
  },
  "lifting.layla28": {
    fullName: "Layla M.",
    bio: "powerlifter | meet prep mode | chicago",
    followerCount: 847,
    isVerified: false,
    dm: "hey! i have a meet this saturday and i really wanna try the strawberry protein but i need it before the weekend. do you have it in stock right now and can it get here by friday?",
    recentPosts: [
      { caption: "meet week energy 💪 3 days out", imageDescription: "a woman at a powerlifting gym", likeCount: 28, commentCount: 7, postedAt: "2d ago" },
      { caption: "deadlift PR 285 let's gooo", imageDescription: "barbell loaded with plates on a platform", likeCount: 42, commentCount: 12, postedAt: "5d ago" },
    ],
  },
  "briannatfitness": {
    fullName: "Brianna T.",
    bio: "fitness + nutrition | mom of 2",
    followerCount: 371,
    isVerified: false,
    dm: "hi i ordered the chocolate whey like two weeks ago and i still haven't gotten a shipping confirmation. can you check on that for me?",
    recentPosts: [
      { caption: "post-workout smoothie with chocolate whey", imageDescription: "a blender with a smoothie", likeCount: 15, commentCount: 3, postedAt: "1w ago" },
    ],
  },
  "nadia.skn": {
    fullName: "Nadia K.",
    bio: "skincare + self-care | hyperpigmentation warrior",
    followerCount: 2870,
    isVerified: false,
    dm: "hi! i've been struggling with stubborn hyperpigmentation for years. do you have a product for that? i saw your page and thought you might have something.",
    recentPosts: [
      { caption: "my morning skincare routine ✨", imageDescription: "an array of skincare products on a vanity", likeCount: 89, commentCount: 22, postedAt: "1d ago" },
      { caption: "before and after hyperpigmentation progress", imageDescription: "close-up of cheek skin before and after", likeCount: 134, commentCount: 41, postedAt: "4d ago" },
    ],
  },
  "cryptoking_gains2024": {
    fullName: "Crypto King",
    bio: "💰 FREE crypto airdrops | click link in bio | get rich quick 🚀",
    followerCount: 47,
    isVerified: false,
    dm: "🔥 CONGRATS! Your page has been selected for an exclusive crypto airdrop! Claim your $500 in $GAINS tokens now by clicking the link in our bio. This is a limited time offer!! 🚀💰",
    recentPosts: [],
  },
};

export type { LeadResult };

/** Load results from the fixture. In production this reads results.json. */
export function loadResults(): Record<string, LeadResult> {
  return fixtureResults as Record<string, LeadResult>;
}

/** Combine results with lead data into LeadView entries, sorted by score desc. */
export function loadLeadViews(): LeadView[] {
  const results = loadResults();
  const entries: LeadView[] = [];

  for (const [username, result] of Object.entries(results)) {
    const lead = LEAD_FIXTURE[username];
    if (!lead) continue;

    entries.push({
      username,
      fullName: lead.fullName,
      qualityScore: result.qualityScore,
      summary: result.summary,
      tier: result.enrichmentInfo.tier,
      intentCategory: result.enrichmentInfo.intentCategory,
      primaryAsk: result.enrichmentInfo.primaryAsk,
      vertical: result.enrichmentInfo.vertical,
      bio: lead.bio,
      followerCount: lead.followerCount,
      dm: lead.dm,
      recentPosts: lead.recentPosts,
      isVerified: lead.isVerified,
      audienceFit: result.enrichmentInfo.audienceFit,
      spamSignals: result.enrichmentInfo.spamSignals,
      buyingSignals: result.enrichmentInfo.buyingSignals,
      language: result.enrichmentInfo.language,
      audienceSize: result.enrichmentInfo.audienceSize,
      confidence: result.enrichmentInfo.confidence,
      scoreRationale: result.enrichmentInfo.scoreRationale,
      recommendedAction: result.enrichmentInfo.recommendedAction,
      draftReply: result.enrichmentInfo.draftReply ?? null,
    });
  }

  return entries;
}
