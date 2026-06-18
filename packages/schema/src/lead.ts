import { z } from "zod";

/** A single recent post on a lead's profile. Lenient defaults so partial data never crashes. */
export const RecentPostSchema = z
  .object({
    caption: z.string().optional().default(""),
    imageDescription: z.string().optional().default(""),
    likeCount: z.number().optional().default(0),
    commentCount: z.number().optional().default(0),
    postedAt: z.string().optional().default(""),
  })
  .passthrough();

export type RecentPost = z.infer<typeof RecentPostSchema>;

/** An inbound Instagram lead: profile + recent posts + the DM they sent. */
export const LeadSchema = z
  .object({
    username: z.string(),
    fullName: z.string().optional().default(""),
    bio: z.string().optional().default(""),
    followerCount: z.number().optional().default(0),
    followingCount: z.number().optional().default(0),
    isVerified: z.boolean().optional().default(false),
    linkInBio: z.string().optional().default(""),
    dm: z.string().optional().default(""),
    recentPosts: z.array(RecentPostSchema).optional().default([]),
    postCount: z.number().optional().default(0),
  })
  .passthrough();

export type Lead = z.infer<typeof LeadSchema>;

export const LeadsFileSchema = z.array(LeadSchema);
export type LeadsFile = z.infer<typeof LeadsFileSchema>;
