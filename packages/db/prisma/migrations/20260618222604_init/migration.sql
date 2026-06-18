-- CreateTable
CREATE TABLE "LeadResult" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "qualityScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "enrichmentInfo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Triage" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
