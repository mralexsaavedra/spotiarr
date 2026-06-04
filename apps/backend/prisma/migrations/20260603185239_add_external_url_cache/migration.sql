-- CreateTable
CREATE TABLE "ExternalUrlCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "name" TEXT,
    "artistName" TEXT,
    "externalUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ExternalUrlCache_provider_type_name_idx" ON "ExternalUrlCache"("provider", "type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalUrlCache_provider_type_internalId_key" ON "ExternalUrlCache"("provider", "type", "internalId");
