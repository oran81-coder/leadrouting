-- Clean up potential duplicates before adding unique constraint
-- This migration ensures data integrity before adding performance indexes

-- 1. Find and delete duplicate AgentMetricsSnapshot entries (keep the latest)
DELETE FROM AgentMetricsSnapshot
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY orgId, agentUserId, windowDays 
      ORDER BY computedAt DESC
    ) as rn
    FROM AgentMetricsSnapshot
  )
  WHERE rn = 1
);

-- 2. Add indexes for LeadFact (timestamp-based queries)
CREATE INDEX IF NOT EXISTS "LeadFact_orgId_closedWonAt_idx" ON "LeadFact"("orgId", "closedWonAt");
CREATE INDEX IF NOT EXISTS "LeadFact_orgId_enteredAt_idx" ON "LeadFact"("orgId", "enteredAt");
CREATE INDEX IF NOT EXISTS "LeadFact_orgId_firstTouchAt_idx" ON "LeadFact"("orgId", "firstTouchAt");
CREATE INDEX IF NOT EXISTS "LeadFact_orgId_assignedUserId_enteredAt_idx" ON "LeadFact"("orgId", "assignedUserId", "enteredAt");
CREATE INDEX IF NOT EXISTS "LeadFact_orgId_assignedUserId_closedWonAt_idx" ON "LeadFact"("orgId", "assignedUserId", "closedWonAt");

-- 3. Add indexes for AgentMetricsSnapshot
CREATE INDEX IF NOT EXISTS "AgentMetricsSnapshot_orgId_agentUserId_windowDays_idx" ON "AgentMetricsSnapshot"("orgId", "agentUserId", "windowDays");
CREATE INDEX IF NOT EXISTS "AgentMetricsSnapshot_orgId_windowDays_idx" ON "AgentMetricsSnapshot"("orgId", "windowDays");

-- 4. Add unique constraint for AgentMetricsSnapshot (after cleanup)
CREATE UNIQUE INDEX IF NOT EXISTS "AgentMetricsSnapshot_orgId_agentUserId_windowDays_key" ON "AgentMetricsSnapshot"("orgId", "agentUserId", "windowDays");

