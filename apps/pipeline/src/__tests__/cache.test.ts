import { describe, it, expect } from "vitest";
import { buildCacheKey, readCache, writeCache } from "../cache.js";
import type { Lead } from "@hotbox/schema";
import { rm } from "fs/promises";

const testLead: Lead = {
  username: "test.user",
  fullName: "Test User",
  bio: "tester",
  followerCount: 100,
  followingCount: 50,
  isVerified: false,
  linkInBio: "",
  dm: "hello",
  recentPosts: [],
  postCount: 0,
};

describe("buildCacheKey", () => {
  it("returns a 64-char hex string", () => {
    expect(buildCacheKey(testLead, "v1")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is stable — same input produces same key", () => {
    expect(buildCacheKey(testLead, "v1")).toBe(buildCacheKey(testLead, "v1"));
  });

  it("changes when the DM changes", () => {
    const modified = { ...testLead, dm: "different dm" };
    expect(buildCacheKey(testLead, "v1")).not.toBe(buildCacheKey(modified, "v1"));
  });

  it("changes when the promptVersion changes", () => {
    expect(buildCacheKey(testLead, "v1")).not.toBe(buildCacheKey(testLead, "v2"));
  });
});

describe("readCache / writeCache", () => {
  it("returns null for a missing key", async () => {
    const result = await readCache("nonexistent-key-xyz-12345");
    expect(result).toBeNull();
  });

  it("reads back exactly what was written", async () => {
    const key = "test-key-" + Date.now();
    const value = { foo: "bar", num: 42 };
    await writeCache(key, value);
    const result = await readCache<typeof value>(key);
    expect(result).toEqual(value);
    await rm(`.cache/${key}.json`).catch(() => {});
  });
});
