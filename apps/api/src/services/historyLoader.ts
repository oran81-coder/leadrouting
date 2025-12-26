/**
 * History Loader Service
 * 
 * Loads historical lead data from Monday.com boards and converts to LeadFact records
 * for agent profiling and metrics calculation.
 */

import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { PrismaLeadFactRepo } from "../infrastructure/leadFact.repo";
import { PrismaFieldMappingConfigRepo } from "../../../../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";
import { log } from "../../../../packages/core/src/shared/logger";
import type { MondayItem } from "../../../../packages/modules/monday-integration/src/contracts/monday.types";

const ORG_ID = "org_1";

interface LoadHistoryOptions {
  limitPerBoard?: number;
  forceReload?: boolean;
}

interface LoadHistoryResult {
  ok: boolean;
  message: string;
  boards: number;
  itemsLoaded: number;
  itemsUpdated: number;
  errors: string[];
}

/**
 * Parse Monday.com people column value to extract user ID
 */
function parsePeopleUserId(col: any): string | null {
  try {
    const raw = col?.value;
    if (!raw) return null;
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;

    // Expected Monday people value:
    // { "personsAndTeams":[{"id":123456,"kind":"person"}], ... }
    const pts = obj?.personsAndTeams;
    if (Array.isArray(pts) && pts.length) {
      const id = pts[0]?.id ?? pts[0];
      return id != null ? String(id) : null;
    }

    // Fallback formats (defensive)
    const ids = obj?.personsAndTeamsIds;
    if (Array.isArray(ids) && ids.length) return String(ids[0]);

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse date from Monday.com date column
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Extract column value by column ID
 */
function getColumnValue(item: MondayItem, columnId: string): any {
  const col = item.column_values?.find((c) => String(c.id) === String(columnId));
  return col;
}

/**
 * Get text value from column
 */
function getColumnText(item: MondayItem, columnId: string): string | null {
  const col = getColumnValue(item, columnId);
  const text = col?.text?.trim();
  return text || null;
}

/**
 * Load historical lead data from Monday.com and store in LeadFact table
 */
export async function loadHistoricalLeads(
  options: LoadHistoryOptions = {}
): Promise<LoadHistoryResult> {
  const { limitPerBoard = 500, forceReload = false } = options;
  
  log.info("[historyLoader] Starting historical lead data load", { limitPerBoard, forceReload });

  const result: LoadHistoryResult = {
    ok: true,
    message: "",
    boards: 0,
    itemsLoaded: 0,
    itemsUpdated: 0,
    errors: [],
  };

  try {
    // 1. Get Field Mapping configuration
    const mappingRepo = new PrismaFieldMappingConfigRepo();
    const mapping = await mappingRepo.getLatest(ORG_ID);

    log.info("[historyLoader] Retrieved mapping", { mapping: JSON.stringify(mapping).substring(0, 200) });

    if (!mapping) {
      throw new Error("Field Mapping not configured. Please complete Field Mapping Wizard first.");
    }

    // Extract board ID - prioritize primaryBoardId, fallback to writebackTargets
    let primaryBoardId = mapping.primaryBoardId;
    
    if (!primaryBoardId && mapping.writebackTargets?.assignedAgent) {
      const writeback = mapping.writebackTargets.assignedAgent as any;
      primaryBoardId = writeback.boardId;
      log.info("[historyLoader] Using boardId from writebackTargets.assignedAgent as fallback", { primaryBoardId });
    }
    
    log.info("[historyLoader] Extracted primaryBoardId", { primaryBoardId });
    
    if (!primaryBoardId) {
      throw new Error("Primary board ID not configured. Please re-save Field Mapping from the wizard.");
    }

    const boardIds = [primaryBoardId];
    log.info("[historyLoader] Loading from boards", { boardIds });

    // 2. Create Monday.com client
    const client = await createMondayClientForOrg(ORG_ID);

    // 3. Fetch board samples
    const samples = await client.fetchBoardSamples(boardIds as any, limitPerBoard);
    result.boards = samples.length;

    log.info("[historyLoader] Fetched samples", { 
      boards: samples.length,
      totalItems: samples.reduce((sum, b) => sum + (b.items?.length || 0), 0)
    });

    // 4. Process each board's items
    const leadRepo = new PrismaLeadFactRepo();
    const now = new Date();

    for (const boardSample of samples) {
      const boardId = String(boardSample.boardId);
      const items = boardSample.items || [];

      log.info(`[historyLoader] Processing board ${boardId}`, { itemCount: items.length });

      for (const item of items) {
        try {
          const itemId = String(item.id);

          // Get existing record if any
          const existing = await leadRepo.get(boardId, itemId);

          // Skip if already loaded and not forcing reload
          if (existing && !forceReload) {
            log.debug(`[historyLoader] Skipping existing item ${itemId}`);
            continue;
          }

          // Extract values based on field mapping
          const mappings = mapping.mappings || {};
          const statusConfig = mapping.statusConfig || {};

          // Get assigned agent (people column)
          let assignedUserId: string | null = null;
          const assignedAgentMapping = mappings.assigned_agent;
          if (assignedAgentMapping?.columnId) {
            const peopleCol = getColumnValue(item, assignedAgentMapping.columnId);
            assignedUserId = parsePeopleUserId(peopleCol);
          }

          // Get industry
          const industry = mappings.lead_industry?.columnId
            ? getColumnText(item, mappings.lead_industry.columnId)
            : null;

          // Get deal amount
          let dealAmount: number | null = null;
          const dealAmountMapping = mappings.lead_deal_size;
          if (dealAmountMapping?.columnId) {
            const amountText = getColumnText(item, dealAmountMapping.columnId);
            if (amountText) {
              const parsed = Number(amountText.replace(/[^\d.]/g, ""));
              dealAmount = Number.isFinite(parsed) ? parsed : null;
            }
          }

          // Get status value
          const statusMapping = mappings.deal_status;
          const statusValue = statusMapping?.columnId
            ? getColumnText(item, statusMapping.columnId)
            : null;

          // Get next call date
          const nextCallMapping = mappings.next_call_date;
          const nextCallDate = nextCallMapping?.columnId
            ? getColumnText(item, nextCallMapping.columnId)
            : null;

          // Determine timestamps
          const enteredAt = existing?.enteredAt || parseDate(item.created_at as string) || now;

          // Check if closed won
          let closedWonAt: Date | null = existing?.closedWonAt || null;
          const closedWonStatuses = statusConfig.closedWonStatuses || [];
          if (statusValue && closedWonStatuses.includes(statusValue) && !closedWonAt) {
            // Assume closed at item update time (best guess)
            closedWonAt = parseDate(item.updated_at as string) || now;
          }

          // First touch and last activity (simplified for historical load)
          const firstTouchAt = existing?.firstTouchAt || (nextCallDate ? enteredAt : null);
          const lastActivityAt = existing?.lastActivityAt || parseDate(item.updated_at as string) || now;

          // Upsert LeadFact
          await leadRepo.upsert(boardId, itemId, {
            assignedUserId,
            industry,
            dealAmount,
            statusValue,
            nextCallDate,
            enteredAt,
            firstTouchAt,
            lastActivityAt,
            closedWonAt,
          });

          if (existing) {
            result.itemsUpdated++;
          } else {
            result.itemsLoaded++;
          }

          if ((result.itemsLoaded + result.itemsUpdated) % 10 === 0) {
            log.info(`[historyLoader] Progress: ${result.itemsLoaded + result.itemsUpdated} items processed`);
          }
        } catch (itemError: any) {
          const msg = `Failed to process item ${item.id}: ${itemError.message}`;
          log.error("[historyLoader] Item processing error", { itemId: item.id, error: itemError.message });
          result.errors.push(msg);
        }
      }
    }

    result.message = `Successfully loaded ${result.itemsLoaded} new items and updated ${result.itemsUpdated} existing items from ${result.boards} board(s)`;
    log.info("[historyLoader] Completed", result);

    return result;
  } catch (error: any) {
    log.error("[historyLoader] Failed to load historical leads", { error: error.message, stack: error.stack });
    result.ok = false;
    result.message = `Failed to load historical leads: ${error.message}`;
    result.errors.push(error.message);
    return result;
  }
}

