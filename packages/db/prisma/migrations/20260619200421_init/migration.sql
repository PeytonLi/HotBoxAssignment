/*
  Warnings:

  - Added the required column `intentCategory` to the `LeadResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tier` to the `LeadResult` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeadResult" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "qualityScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "intentCategory" TEXT NOT NULL,
    "enrichmentInfo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LeadResult" ("createdAt", "enrichmentInfo", "qualityScore", "summary", "updatedAt", "username") SELECT "createdAt", "enrichmentInfo", "qualityScore", "summary", "updatedAt", "username" FROM "LeadResult";
DROP TABLE "LeadResult";
ALTER TABLE "new_LeadResult" RENAME TO "LeadResult";
CREATE INDEX "LeadResult_tier_idx" ON "LeadResult"("tier");
CREATE INDEX "LeadResult_intentCategory_idx" ON "LeadResult"("intentCategory");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Triage_status_idx" ON "Triage"("status");
