import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup() {
  const dbPath = path.resolve(__dirname, "..", "prisma", "test-e2e.db");
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const journal = dbPath + "-journal";
  if (fs.existsSync(journal)) {
    fs.unlinkSync(journal);
  }

  const dbUrl = `file:${dbPath}`;
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const schemaPath = path.resolve(repoRoot, "packages", "db", "prisma", "schema.prisma");

  console.log(`[e2e setup] DATABASE_URL=${dbUrl}`);
  console.log(`[e2e setup] schema=${schemaPath}`);

  // Run prisma db push from the repo root using pnpm to get the local prisma version
  execSync(`pnpm --filter @hotbox/db db:push`, {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "inherit",
    cwd: repoRoot,
  });

  const envTestPath = path.resolve(__dirname, "..", ".env.test");
  fs.writeFileSync(envTestPath, `DATABASE_URL="${dbUrl}"\n`);
  console.log(`[e2e setup] Wrote ${envTestPath}`);
}

export default globalSetup;
