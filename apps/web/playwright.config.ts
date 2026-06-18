import { defineConfig } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 3099;

// Absolute path to the test database — must match global-setup.ts
const dbPath = path.resolve(__dirname, "prisma", "test-e2e.db");
const dbUrl = `file:${dbPath}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,

  use: {
    baseURL: `http://localhost:${port}`,
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
  },

  globalSetup: "./e2e/global-setup.ts",

  webServer: {
    command: `npx next dev --port ${port}`,
    port,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
    },
    cwd: __dirname,
  },

  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
