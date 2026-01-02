console.log("[LeadIntakePoller] MODULE LOADING...");
import { optionalEnv } from "../config/env";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { PrismaLeadFactRepo } from "../infrastructure/leadFact.repo";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { detectLeadChanges, formatChanges } from "./leadUpdateDetector";
import { rescoreProposal } from "./proposalRescorer";
console.log("[LeadIntakePoller] MODULE LOADED SUCCESSFULLY");

/**
 * Helper: Parse people column to extract user ID
 */
function parsePeopleUserId(columnValue: any): string | null {
  const raw = columnValue?.value ?? null;
  if (!raw) return null;

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const persons = (parsed?.personsAndTeams ?? parsed?.persons_and_teams ?? []) as any[];
    const first = persons?.[0];
    if (!first) return null;
    return first?.id ? String(first.id) : null;
  } catch {
    return null;
  }
}

/**
 * Helper: Find column text value by column ID
 */
function findColumnText(columnValues: any[], columnId?: string | null): string | null {
  if (!columnId) return null;
  const col = columnValues.find((cv: any) => String(cv.id) === String(columnId));
  const text = (col?.text ?? "").trim();
  return text || null;
}

/**
 * Save or update full lead data in LeadFact
 */
async function saveLeadToFact(
  orgId: string,
  boardId: string,
  item: any,
  metricsConfig: any,
  leadRepo: PrismaLeadFactRepo
): Promise<void> {
  const columnValues = item.column_values || [];
  const itemId = String(item.id);

  // Extract assigned user
  let assignedUserId: string | null = null;
  if (metricsConfig.assignedPeopleColumnId) {
    const peopleColumn = columnValues.find(
      (cv: any) => String(cv.id) === String(metricsConfig.assignedPeopleColumnId)
    );
    assignedUserId = parsePeopleUserId(peopleColumn);
  }

  // Extract industry
  const industry = findColumnText(columnValues, metricsConfig.industryColumnId);

  // Extract deal amount
  const dealAmountText = findColumnText(columnValues, metricsConfig.dealAmountColumnId);
  const dealAmount = dealAmountText ? parseFloat(dealAmountText.replace(/[^0-9.-]/g, '')) : null;

  // Extract status
  const statusValue = findColumnText(columnValues, metricsConfig.closedWonStatusColumnId);

  // Check if closed won (strict match OR lenient 'Done' match)
  // FIX: Ensure both sides are non-null before comparing to avoid null === null issues
  const isClosedWon = (statusValue && metricsConfig.closedWonStatusValue && statusValue === metricsConfig.closedWonStatusValue) ||
    (statusValue === "Done");

  const closedWonAt = isClosedWon && (item.updated_at || item.created_at)
    ? new Date(item.updated_at || item.created_at)
    : null;

  // Parse dates - use accurate timestamps from Monday if available
  const enteredAt = item.created_at ? new Date(item.created_at) : new Date();
  const updatedAt = item.updated_at ? new Date(item.updated_at) : enteredAt;

  // For firstTouchAt and lastActivityAt, use approximations
  const firstTouchAt = assignedUserId ? enteredAt : null;
  const lastActivityAt = updatedAt;

  const leadData = {
    orgId,
    itemName: item.name || null, // Save item name for display
    assignedUserId,
    industry,
    dealAmount: dealAmount && !isNaN(dealAmount) ? dealAmount : null,
    statusValue,
    nextCallDate: null, // Would need additional mapping
    enteredAt,
    firstTouchAt,
    lastActivityAt,
    closedWonAt,
  };

  // Upsert the lead fact
  await leadRepo.upsert(orgId, boardId, itemId, leadData);
}

function parseBoardIds(raw: string | null | undefined): string[] {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j)) return j.map((x) => String(x)).filter(Boolean);
  } catch { }
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function isUnassignedPeopleValue(raw: any): boolean {
  if (raw == null) return true;
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!v) return true;
    const arr = (v as any).personsAndTeams;
    if (!Array.isArray(arr) || arr.length === 0) return true;
    return false;
  } catch {
    return String(raw).trim().length === 0;
  }
}

async function callExecute(boardId: string, itemId: string, fullItem?: any) {
  const port = process.env.PORT
    ? Number(process.env.PORT)
    : process.env.API_PORT
      ? Number(process.env.API_PORT)
      : 3000;
  const base = optionalEnv("INTERNAL_BASE_URL", `http://localhost:${port}`);
  const headers: Record<string, string> = { "content-type": "application/json" };
  const apiKey = optionalEnv("ROUTING_API_KEY", "");
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(`${base}/routing/execute`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      item: fullItem || {
        boardId,
        itemId
      }
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error ?? `Execute failed (${res.status})`);
  return j;
}

export function startLeadIntakePoller() {
  const seconds = Number(optionalEnv("LEAD_INTAKE_POLL_SECONDS", "120"));
  const limitPerBoard = Number(optionalEnv("LEAD_INTAKE_LIMIT_PER_BOARD", "500"));

  console.log(`[LeadIntakePoller] Initializing... seconds=${seconds}, limitPerBoard=${limitPerBoard}`);

  if (!seconds || seconds < 15) {
    console.log(`[LeadIntakePoller] ❌ DISABLED - seconds=${seconds} (must be >= 15)`);
    return;
  }

  console.log(`[LeadIntakePoller] ✅ ENABLED - polling every ${seconds} seconds`);

  const tick = async () => {
    try {
      console.log(`[LeadIntakePoller] 🔄 Tick starting...`);

      const cfgRepo = new PrismaMetricsConfigRepo();
      const envOrgId = process.env.DEFAULT_ORG_ID;

      let orgId = envOrgId;
      let metricsConfig = null;

      if (orgId) {
        metricsConfig = await cfgRepo.get(orgId);
      }

      // If not in env or no config found for env org, try auto-detection
      if (!orgId || !metricsConfig) {
        const allConfigs = await (cfgRepo as any).prisma.metricsConfig.findMany({
          where: { leadBoardIds: { not: "" } },
          take: 1
        });
        if (allConfigs.length > 0) {
          orgId = allConfigs[0].orgId;
          metricsConfig = allConfigs[0];
          console.log(`[LeadIntakePoller] 💡 Auto-detected active Org ID: ${orgId}`);
        }
      }

      if (!orgId) {
        console.log(`[LeadIntakePoller] ℹ️ Poller idle: No Org ID found and none auto-detected.`);
        return;
      }

      if (!metricsConfig) {
        metricsConfig = await cfgRepo.getOrCreateDefaults(orgId);
      }

      const boardIds = parseBoardIds(metricsConfig.leadBoardIds);
      if (boardIds.length === 0) {
        console.log(`[LeadIntakePoller] ℹ️ Poller idle for org ${orgId}: No board IDs configured.`);
        return;
      }

      console.log(`[LeadIntakePoller] 🔄 Polling boards [${boardIds.join(", ")}] for Org ${orgId}...`);

      const assignedColId = String(metricsConfig.assignedPeopleColumnId ?? "").trim();
      const client = await createMondayClientForOrg(orgId);
      if (!client) {
        console.error(`[LeadIntakePoller] ❌ Failed to create Monday client for Org ${orgId}`);
        return;
      }

      const samples = await (client as any).fetchBoardSamples(boardIds, limitPerBoard);
      const leadRepo = new PrismaLeadFactRepo();

      if (!samples || samples.length === 0) {
        console.log(`[LeadIntakePoller] ⚠️ No data returned from Monday.com for boards: ${boardIds.join(', ')}`);
        return;
      }

      console.log(`[LeadIntakePoller] Fetched ${samples.length} boards from Monday.com`);

      let processedCount = 0;
      let unassignedCount = 0;
      let routingCallCount = 0;

      for (const b of samples || []) {
        const bid = String((b as any).boardId);
        for (const it of (b as any).items || []) {
          try {
            processedCount++;
            const itemId = String(it.id);
            const itemName = String(it.name || "Unnamed Item");

            console.log(`[LeadIntakePoller] 🔍 Trace: Processing item "${itemName}" (${itemId}) from board ${bid}`);

            const colVals = it.column_values || [];
            const assignedCol = assignedColId ? colVals.find((c: any) => String(c.id) === assignedColId) : null;
            const assignedValue = assignedCol ? assignedCol.value : null;
            const isUnassigned = !assignedColId ? true : isUnassignedPeopleValue(assignedValue);

            // Detect changes in mapped fields before updating
            const changeDetection = await detectLeadChanges(orgId, bid, itemId, it);

            // Save or update full lead data in LeadFact
            const existing = await leadRepo.get(orgId, bid, itemId);
            const isNewLead = !existing?.enteredAt;

            // Always update LeadFact with latest data (handles field updates)
            await saveLeadToFact(orgId, bid, it, metricsConfig, leadRepo);

            if (isNewLead) {
              console.log(`[LeadIntakePoller] ✨ New lead saved to LeadFact: ${itemName} (${itemId})`);
            } else if (changeDetection.hasChanges) {
              console.log(`[LeadIntakePoller] 🔄 Updated lead in LeadFact: ${itemName} (${itemId})`);
              console.log(`[LeadIntakePoller]    Changes: ${formatChanges(changeDetection.changes)}`);

              if (changeDetection.requiresRescoring) {
                try {
                  const rescoreResult = await rescoreProposal(orgId, bid, itemId, it, changeDetection.changes);
                  if (rescoreResult) {
                    console.log(`[LeadIntakePoller] ♻️ Re-scored proposal ${rescoreResult.proposalId}`);
                  }
                } catch (rescoreError: any) {
                  console.error(`[LeadIntakePoller] ❌ Re-scoring failed for ${itemName}:`, rescoreError.message);
                }
              }
            }

            // Skip assigned leads for routing
            if (!isUnassigned) {
              continue;
            }

            unassignedCount++;

            // Check if this lead already has a routing proposal or was already routed
            if (existing?.assignedUserId) {
              continue;
            }

            console.log(`[LeadIntakePoller] 🎯 Calling routing for unassigned lead: ${itemName} (${itemId})`);
            const fullItem = { ...it, boardId: bid, itemId: itemId };
            await callExecute(bid, itemId, fullItem);
            routingCallCount++;
            console.log(`[LeadIntakePoller] ✅ Routing executed successfully for: ${itemName}`);
          } catch (itemError) {
            console.error(`[LeadIntakePoller] ❌ Error processing item ${it.id}:`, itemError);
            // Continue to next item
          }
        }
      }

      console.log(`[LeadIntakePoller] 📊 Summary: processed=${processedCount}, unassigned=${unassignedCount}, routingCalls=${routingCallCount}`);
    } catch (err) {
      console.error(`[LeadIntakePoller] ❌ Tick failed:`, err);
      // retry next tick
    }
  };

  console.log(`[LeadIntakePoller] ⏰ First tick in 2.5 seconds, then every ${seconds} seconds`);
  setTimeout(() => void tick(), 2500);
  setInterval(() => void tick(), seconds * 1000);
}
