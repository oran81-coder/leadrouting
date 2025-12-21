-- CreateTable
CREATE TABLE "InternalSchemaVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT
);

-- CreateTable
CREATE TABLE "FieldMappingConfigVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RuleSetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT
);

-- CreateTable
CREATE TABLE "RoutingState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledAt" DATETIME,
    "enabledBy" TEXT,
    "schemaVersion" INTEGER,
    "mappingVersion" INTEGER,
    "rulesVersion" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RoutingSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'MANUAL_APPROVAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RoutingProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "normalizedValues" TEXT NOT NULL,
    "selectedRule" TEXT,
    "action" TEXT,
    "explainability" TEXT,
    "decidedAt" DATETIME,
    "decidedBy" TEXT,
    "decisionNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RoutingApply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MondayUserCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MondayCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "tokenEnc" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT 'https://api.monday.com/v2',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IndustryWatchState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lastIndustry" TEXT,
    "lastCheckedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MetricsConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "conversionWindowDays" INTEGER NOT NULL DEFAULT 30,
    "avgDealWindowDays" INTEGER NOT NULL DEFAULT 90,
    "responseWindowDays" INTEGER NOT NULL DEFAULT 30,
    "hotStreakWindowHours" INTEGER NOT NULL DEFAULT 72,
    "hotStreakMinDeals" INTEGER NOT NULL DEFAULT 1,
    "burnoutWinDecayHours" INTEGER NOT NULL DEFAULT 336,
    "burnoutActivityDecayHours" INTEGER NOT NULL DEFAULT 168,
    "weightIndustryPerf" INTEGER NOT NULL DEFAULT 25,
    "weightConversion" INTEGER NOT NULL DEFAULT 20,
    "weightAvgDeal" INTEGER NOT NULL DEFAULT 15,
    "weightHotStreak" INTEGER NOT NULL DEFAULT 10,
    "weightResponseSpeed" INTEGER NOT NULL DEFAULT 15,
    "weightBurnout" INTEGER NOT NULL DEFAULT 10,
    "weightAvailabilityCap" INTEGER NOT NULL DEFAULT 5,
    "leadBoardIds" TEXT NOT NULL,
    "intakeColumnId" TEXT,
    "intakeValue" TEXT,
    "contactedStatusColumnId" TEXT,
    "contactedStatusValue" TEXT,
    "nextCallDateColumnId" TEXT,
    "closedWonStatusColumnId" TEXT,
    "closedWonStatusValue" TEXT,
    "dealAmountColumnId" TEXT,
    "industryColumnId" TEXT,
    "enableIndustryPerf" BOOLEAN NOT NULL DEFAULT true,
    "enableConversion" BOOLEAN NOT NULL DEFAULT true,
    "enableAvgDealSize" BOOLEAN NOT NULL DEFAULT true,
    "enableHotStreak" BOOLEAN NOT NULL DEFAULT true,
    "enableResponseSpeed" BOOLEAN NOT NULL DEFAULT true,
    "enableBurnout" BOOLEAN NOT NULL DEFAULT true,
    "enableAvailabilityCap" BOOLEAN NOT NULL DEFAULT true,
    "assignedPeopleColumnId" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadFact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "industry" TEXT,
    "dealAmount" REAL,
    "statusValue" TEXT,
    "nextCallDate" TEXT,
    "enteredAt" DATETIME,
    "firstTouchAt" DATETIME,
    "lastActivityAt" DATETIME,
    "closedWonAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentMetricsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "agentUserId" TEXT NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedCount" INTEGER NOT NULL DEFAULT 0,
    "closedWonCount" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" REAL NOT NULL DEFAULT 0,
    "avgDealSize" REAL NOT NULL DEFAULT 0,
    "dealsAmountSum" REAL NOT NULL DEFAULT 0,
    "medianResponseMinutes" INTEGER NOT NULL DEFAULT 0,
    "hotDealsCount" INTEGER NOT NULL DEFAULT 0,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "hoursSinceLastWin" INTEGER NOT NULL DEFAULT 999999,
    "hoursSinceLastActivity" INTEGER NOT NULL DEFAULT 999999,
    "burnoutScore" REAL NOT NULL DEFAULT 0,
    "industryPerfJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "InternalSchemaVersion_orgId_idx" ON "InternalSchemaVersion"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalSchemaVersion_orgId_version_key" ON "InternalSchemaVersion"("orgId", "version");

-- CreateIndex
CREATE INDEX "FieldMappingConfigVersion_orgId_idx" ON "FieldMappingConfigVersion"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldMappingConfigVersion_orgId_version_key" ON "FieldMappingConfigVersion"("orgId", "version");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "RuleSetVersion_orgId_idx" ON "RuleSetVersion"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleSetVersion_orgId_version_key" ON "RuleSetVersion"("orgId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingState_orgId_key" ON "RoutingState"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingSettings_orgId_key" ON "RoutingSettings"("orgId");

-- CreateIndex
CREATE INDEX "RoutingProposal_orgId_status_createdAt_idx" ON "RoutingProposal"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RoutingProposal_orgId_boardId_itemId_idx" ON "RoutingProposal"("orgId", "boardId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingProposal_orgId_idempotencyKey_key" ON "RoutingProposal"("orgId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "RoutingApply_orgId_appliedAt_idx" ON "RoutingApply"("orgId", "appliedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingApply_orgId_proposalId_key" ON "RoutingApply"("orgId", "proposalId");

-- CreateIndex
CREATE INDEX "MondayUserCache_orgId_email_idx" ON "MondayUserCache"("orgId", "email");

-- CreateIndex
CREATE INDEX "MondayUserCache_orgId_name_idx" ON "MondayUserCache"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MondayUserCache_orgId_userId_key" ON "MondayUserCache"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MondayCredential_orgId_key" ON "MondayCredential"("orgId");

-- CreateIndex
CREATE INDEX "IndustryWatchState_orgId_boardId_idx" ON "IndustryWatchState"("orgId", "boardId");

-- CreateIndex
CREATE UNIQUE INDEX "IndustryWatchState_orgId_boardId_itemId_key" ON "IndustryWatchState"("orgId", "boardId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricsConfig_orgId_key" ON "MetricsConfig"("orgId");

-- CreateIndex
CREATE INDEX "LeadFact_orgId_boardId_idx" ON "LeadFact"("orgId", "boardId");

-- CreateIndex
CREATE INDEX "LeadFact_orgId_assignedUserId_idx" ON "LeadFact"("orgId", "assignedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadFact_orgId_boardId_itemId_key" ON "LeadFact"("orgId", "boardId", "itemId");

-- CreateIndex
CREATE INDEX "AgentMetricsSnapshot_orgId_agentUserId_idx" ON "AgentMetricsSnapshot"("orgId", "agentUserId");
