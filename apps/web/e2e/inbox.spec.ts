import { test, expect } from "@playwright/test";

// Reset triage state before each test to ensure independence
async function resetTriageState(page: import("@playwright/test").Page) {
  // Set all leads back to unhandled via the API
  const leads = [
    "matt.lifts.heavy",
    "lifting.layla28",
    "briannatfitness",
    "nadia.skn",
    "cryptoking_gains2024",
  ];
  for (const username of leads) {
    try {
      await fetch(`http://localhost:3099/api/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, status: "unhandled" }),
      });
    } catch {
      // Ignore errors during reset
    }
  }
}

test.beforeEach(async ({ page }) => {
  await resetTriageState(page);
});

test.describe("Inbox loads correctly", () => {
  test("page title and layout are present", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Apex Fuel — Lead Triage");
    await expect(page.locator(".queue-panel")).toBeVisible();
    await expect(page.locator(".detail-panel")).toBeVisible();
  });

  test("tiers are grouped with correct counts", async ({ page }) => {
    await page.goto("/");
    const hotHeader = page.locator(".tier-header.tier-hot");
    await expect(hotHeader).toBeVisible();
    await expect(page.locator(".tier-header.tier-strong")).toBeVisible();
    await expect(page.locator(".tier-header.tier-lukewarm")).toBeVisible();
    await expect(page.locator(".tier-header.tier-weak")).toBeVisible();
    await expect(page.locator(".tier-header.tier-spam")).toBeVisible();
    await expect(hotHeader.locator(".tier-count")).toHaveText("1");
    await expect(page.locator(".tier-header.tier-strong .tier-count")).toHaveText("1");
    await expect(page.locator(".tier-header.tier-lukewarm .tier-count")).toHaveText("1");
    await expect(page.locator(".tier-header.tier-weak .tier-count")).toHaveText("1");
    await expect(page.locator(".tier-header.tier-spam .tier-count")).toHaveText("1");
  });

  test("spam tier is auto-collapsed", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".tier-header.tier-spam")).toBeVisible();
    const spamRow = page.locator(".queue-row").filter({ hasText: "Crypto King" });
    await expect(spamRow).not.toBeVisible();
  });

  test("ordering is score-desc within each tier", async ({ page }) => {
    await page.goto("/");
    const firstVisibleRow = page.locator(".queue-panel .queue-row").first();
    await expect(firstVisibleRow).toContainText("Matt R.");
    await expect(firstVisibleRow.locator(".score-badge")).toHaveText("91");
  });
});

test.describe("Detail panel", () => {
  test("clicking a hot lead shows DM, enrichment, rationale, and draft", async ({ page }) => {
    await page.goto("/");
    const mattRow = page.locator(".queue-row").filter({ hasText: "Matt R." });
    await mattRow.click();
    const detailPanel = page.locator(".detail-panel");
    await expect(detailPanel.locator(".detail-dm")).toBeVisible();
    await expect(detailPanel.locator(".detail-dm")).toContainText(
      "stuck at the same bench and squat",
    );
    await expect(detailPanel.locator(".detail-name")).toHaveText("Matt R.");
    await expect(detailPanel.locator(".detail-username")).toContainText("matt.lifts.heavy");
    await expect(
      detailPanel.locator(".detail-section-title").filter({ hasText: "Enrichment" }),
    ).toBeVisible();
    await expect(detailPanel).toContainText("Bullseye for the #1 goal (coaching)");
    await expect(
      detailPanel.locator(".detail-section-title").filter({ hasText: "Draft Reply" }),
    ).toBeVisible();
    await expect(detailPanel.locator(".draft-reply-box")).toContainText("hey Matt!");
  });

  test("copy draft button is present on qualified lead", async ({ page }) => {
    await page.goto("/");
    await page.locator(".queue-row").filter({ hasText: "Matt R." }).click();
    const copyButton = page.locator(".copy-button");
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toHaveText("Copy");
  });

  test("spam lead has no draft reply", async ({ page }) => {
    await page.goto("/");
    await page.locator(".tier-header.tier-spam").click();
    const cryptoRow = page.locator(".queue-row").filter({ hasText: "Crypto King" });
    await expect(cryptoRow).toBeVisible();
    await cryptoRow.click();
    const detailPanel = page.locator(".detail-panel");
    await expect(
      detailPanel.locator(".detail-section-title").filter({ hasText: "Draft Reply" }),
    ).not.toBeVisible();
  });
});

test.describe("Triage persistence", () => {
  test("mark handled persists across reload", async ({ page }) => {
    await page.goto("/");
    await page.locator(".queue-row").filter({ hasText: "Matt R." }).click();
    await page.locator(".triage-btn.handle").click();
    await expect(page.locator(".triage-btn.undo")).toBeVisible();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.locator(".filter-row input[type='checkbox']").check();
    const mattRowAfter = page.locator(".queue-row").filter({ hasText: "Matt R." });
    await expect(mattRowAfter).toBeVisible();
    await expect(mattRowAfter).toHaveClass(/handled/);
  });

  test("handled leads hidden by default, visible with toggle", async ({ page }) => {
    await page.goto("/");
    await page.locator(".queue-row").filter({ hasText: "Matt R." }).click();
    await page.locator(".triage-btn.handle").click();
    await expect(page.locator(".queue-row").filter({ hasText: "Matt R." })).not.toBeVisible();
    await page.locator(".filter-row input[type='checkbox']").check();
    const mattRow = page.locator(".queue-row").filter({ hasText: "Matt R." });
    await expect(mattRow).toBeVisible();
    await expect(mattRow).toHaveClass(/handled/);
  });

  test("undo handled restores unhandled status", async ({ page }) => {
    await page.goto("/");
    await page.locator(".queue-row").filter({ hasText: "Matt R." }).click();
    await page.locator(".triage-btn.handle").click();
    await page.locator(".triage-btn.undo").click();
    await expect(page.locator(".triage-btn.handle")).toBeVisible();
    await expect(page.locator(".queue-row").filter({ hasText: "Matt R." })).toBeVisible();
  });
});

test.describe("Filter and search", () => {
  test("filter by tier shows only matching leads", async ({ page }) => {
    await page.goto("/");
    const tierSelect = page.locator("select[aria-label='Filter by tier']");
    await tierSelect.selectOption("hot");
    await expect(page.locator(".queue-row").filter({ hasText: "Matt R." })).toBeVisible();
    await tierSelect.selectOption("spam");
    await page.locator(".tier-header.tier-spam").click();
    await expect(page.locator(".queue-row").filter({ hasText: "Crypto King" })).toBeVisible();
    await expect(page.locator(".queue-row").filter({ hasText: "Matt R." })).not.toBeVisible();
  });

  test("filter by intent category narrows results", async ({ page }) => {
    await page.goto("/");
    const categorySelect = page.locator("select[aria-label='Filter by category']");
    await categorySelect.selectOption("coaching_inquiry");
    await expect(page.locator(".queue-row").filter({ hasText: "Matt R." })).toBeVisible();
    await expect(page.locator(".queue-row").filter({ hasText: "Layla M." })).not.toBeVisible();
  });

  test("search narrows the queue by text", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[aria-label='Search leads']");
    await searchInput.fill("protein");
    await expect(page.locator(".queue-row").filter({ hasText: "Layla M." })).toBeVisible();
    await expect(page.locator(".queue-row").filter({ hasText: "Matt R." })).not.toBeVisible();
    await searchInput.fill("coaching");
    await expect(page.locator(".queue-row").filter({ hasText: "Matt R." })).toBeVisible();
  });

  test("combining tier filter and search works", async ({ page }) => {
    await page.goto("/");
    await page.locator("select[aria-label='Filter by tier']").selectOption("strong");
    await expect(page.locator(".queue-row").filter({ hasText: "Layla M." })).toBeVisible();
    await page.locator("input[aria-label='Search leads']").fill("coaching");
    await expect(page.locator(".queue-row").filter({ hasText: "Matt R." })).not.toBeVisible();
    await expect(page.locator(".queue-row").filter({ hasText: "Layla M." })).not.toBeVisible();
  });
});

test.describe("Posts toggle", () => {
  test("recent posts can be expanded and collapsed", async ({ page }) => {
    await page.goto("/");
    await page.locator(".queue-row").filter({ hasText: "Matt R." }).click();
    const postsToggle = page.locator(".posts-toggle");
    await expect(postsToggle).toContainText("Show (3)");
    await postsToggle.click();
    await expect(postsToggle).toContainText("Hide");
    await expect(page.locator(".post-item")).toHaveCount(3);
    await postsToggle.click();
    await expect(postsToggle).toContainText("Show (3)");
    await expect(page.locator(".post-item")).toHaveCount(0);
  });
});
