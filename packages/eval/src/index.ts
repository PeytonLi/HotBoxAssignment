import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ResultsFile } from "@hotbox/schema";
import { TIERS } from "@hotbox/schema";
import {
  tierAccuracy,
  buildConfusionMatrix,
  spearmanRankCorrelation,
  type LabelEntry,
} from "./metrics";

// --------------- helpers ---------------

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadLabels(): LabelEntry[] {
  const path = resolve(__dirname, "labels.json");
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as LabelEntry[];
}

function loadResults(): ResultsFile {
  // Try the project-root results.json first, then the schema fixture.
  const candidates = [
    resolve(process.cwd(), "results.json"),
    resolve(
      __dirname,
      "../../../packages/schema/src/results.fixture.json",
    ),
    // also try relative to cwd in case we're in a monorepo root
    resolve(process.cwd(), "packages/schema/src/results.fixture.json"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      console.error(`[eval] reading results from ${candidate}`);
      const raw = readFileSync(candidate, "utf-8");
      return JSON.parse(raw) as ResultsFile;
    }
  }

  throw new Error(
    "No results.json found. Run the pipeline first, or ensure the fixture exists in packages/schema.",
  );
}

// --------------- formatting ---------------

function pad(s: string, n: number): string {
  return s.padEnd(n).slice(0, n);
}

function printConfusionMatrix(matrix: Record<string, Record<string, number>>) {
  const tiers = TIERS as readonly string[];
  const colW = 10;

  // header
  let line = pad("", colW);
  for (const t of tiers) line += pad(t, colW);
  console.log(line);

  for (const actual of tiers) {
    let row = pad(actual, colW);
    for (const pred of tiers) {
      row += pad(String(matrix[actual][pred]), colW);
    }
    console.log(row);
  }
}

function printScorecard(labels: LabelEntry[], results: ResultsFile) {
  const labeledInResults = labels.filter((l) => results[l.username]);
  const accuracy = tierAccuracy(labels, results);
  const matrix = buildConfusionMatrix(labels, results);
  const spearman = spearmanRankCorrelation(labels, results);

  console.log("╔══════════════════════════════════════╗");
  console.log("║         EVAL SCORECARD              ║");
  console.log("╚══════════════════════════════════════╝");
  console.log();
  console.log(
    `Leads evaluated:  ${labeledInResults.length} / ${labels.length} labeled`,
  );
  console.log(`Tier accuracy:    ${(accuracy * 100).toFixed(1)}%`);
  console.log();

  console.log("Confusion matrix (rows=expected, cols=predicted):");
  printConfusionMatrix(matrix);
  console.log();

  if (!Number.isNaN(spearman)) {
    console.log(`Rank correlation (Spearman ρ): ${spearman.toFixed(4)}`);
    if (spearman < 0.5) {
      console.log(
        "⚠  Low correlation — rubric disagrees with labels. See disagreements below.",
      );
    }
  } else {
    console.log(
      "Rank correlation (Spearman ρ): N/A (need ≥2 labeled leads in results)",
    );
  }
  console.log();

  // ---- Biggest disagreements ----
  const disagreements = labeledInResults
    .map((l) => ({
      username: l.username,
      expectedTier: l.expectedTier,
      predictedTier: results[l.username]!.enrichmentInfo.tier,
      predictedScore: results[l.username]!.qualityScore,
      rationale: l.rationale,
    }))
    .filter((d) => d.expectedTier !== d.predictedTier)
    .sort((a, b) => b.predictedScore - a.predictedScore);

  if (disagreements.length > 0) {
    console.log(
      `Biggest disagreements (predicted tier ≠ expected tier):`,
    );
    for (const d of disagreements) {
      console.log(
        `  ${d.username}: expected ${d.expectedTier}, got ${d.predictedTier} (score ${d.predictedScore})`,
      );
      console.log(`    rationale: ${d.rationale}`);
    }
    console.log();
    console.log(
      "Use the list above to tune the scoring prompt until agreement improves.",
    );
  } else {
    console.log(
      "No disagreements — all labeled leads match expected tiers. 🎉",
    );
  }
}

// --------------- main ---------------

function main() {
  const labels = loadLabels();
  const results = loadResults();
  printScorecard(labels, results);
}

main();
