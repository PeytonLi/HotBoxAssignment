import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { triageStoreContract } from "@hotbox/schema/testing";
import { createTestClient } from "./prismaClient";
import { prismaTriageStore } from "./prismaTriageStore";
import { seed } from "./seed";
import { PrismaClient } from "@prisma/client";
import type { ResultsFile } from "@hotbox/schema";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const DB_DIR = resolve(__dirname, "..");
const TEST_DB_PATH = resolve(DB_DIR, "test.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

let prisma: PrismaClient;

function cleanDb() {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
  // Also clean WAL and SHM files
  const wal = TEST_DB_PATH + "-wal";
  const shm = TEST_DB_PATH + "-shm";
  if (existsSync(wal)) unlinkSync(wal);
  if (existsSync(shm)) unlinkSync(shm);
}

beforeAll(() => {
  cleanDb();
  execSync("npx prisma db push --skip-generate --force-reset --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    cwd: DB_DIR,
    stdio: "pipe",
  });
  prisma = createTestClient(TEST_DB_URL);
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanDb();
});

beforeEach(async () => {
  await prisma.triage.deleteMany();
});

// ─── TriageStore contract ────────────────────────────────────────────
triageStoreContract("prisma", () => prismaTriageStore(prisma));

// ─── Seed tests ──────────────────────────────────────────────────────
describe("seed()", () => {
  const fixture: ResultsFile = {
    alice: {
      qualityScore: 85,
      summary: "Alice wants coaching",
      enrichmentInfo: {
        intentCategory: "coaching_inquiry",
        primaryAsk: "How does coaching work?",
        vertical: "fitness",
        audienceFit: { level: "high", reason: "Active lifter" },
        spamSignals: { isSpam: false, reasons: [] },
        buyingSignals: { urgency: "high", signals: ["wants to start ASAP"] },
        language: "en",
        audienceSize: 500,
        isVerified: false,
        confidence: 0.9,
        engagementRate: 0.05,
        contentAuthenticity: "high" as const,
        tier: "hot",
        scoreRationale: "Coaching intent matches #1 goal",
        recommendedAction: "Send coaching overview",
        draftReply: "Hey Alice! Here's how coaching works...",
      },
    },
  };

  it("upserts a lead result from the fixture", async () => {
    await seed(prisma, fixture);

    const record = await prisma.leadResult.findUnique({
      where: { username: "alice" },
    });
    expect(record).not.toBeNull();
    expect(record!.qualityScore).toBe(85);
    expect(record!.summary).toBe("Alice wants coaching");

    const parsed = JSON.parse(record!.enrichmentInfo);
    expect(parsed.intentCategory).toBe("coaching_inquiry");
    expect(parsed.tier).toBe("hot");
  });

  it("upsert is idempotent (re-running seed doesn't duplicate)", async () => {
    await seed(prisma, fixture);
    await seed(prisma, fixture);

    const count = await prisma.leadResult.count({
      where: { username: "alice" },
    });
    expect(count).toBe(1);
  });

  it("stores enrichmentInfo as valid JSON with all scored fields", async () => {
    await seed(prisma, fixture);

    const record = await prisma.leadResult.findUnique({
      where: { username: "alice" },
    });
    const parsed = JSON.parse(record!.enrichmentInfo);
    expect(parsed).toHaveProperty("tier");
    expect(parsed).toHaveProperty("scoreRationale");
    expect(parsed).toHaveProperty("draftReply");
  });
});
