/**
 * Initial Data Loader Service
 * 
 * Loads the first 500 leads from Monday.com boards when an organization
 * completes their Field Mapping configuration.
 * 
 * This ensures that agent profiles are calculated based on historical data
 * rather than starting from zero.
 */

import { createModuleLogger } from "../infrastructure/logger";
import { PrismaLeadFactRepo } from "../infrastructure/leadFact.repo";
import { PrismaFieldMappingConfigRepo } from "../../../../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";

const logger = createModuleLogger('InitialDataLoader');

export interface LoadResult {
  success: boolean;
  loaded: number;
  skipped: number;
  errors: number;
  duration: number;
  errorMessages?: string[];
}

/**
 * Fetch 500 latest leads from Monday.com boards
 * Reuses logic from preview.routes.ts for consistency
 */
async function fetchLeadsFromMonday(
  orgId: string,
  boardIds: string[]
): Promise<Array<{ boardId: string; item: any }>> {
  const client = await createMondayClientForOrg(orgId);
  const mondayItems: Array<{ boardId: string; item: any }> = [];

  logger.info(`Fetching 500 latest leads from ${boardIds.length} boards`);

  for (const boardId of boardIds) {
    try {
      const query = `
        query ($boardId: ID!) {
          boards(ids: [$boardId]) {
            items_page(limit: 500) {
              items {
                id
                name
                created_at
                updated_at
                column_values {
                  id
                  text
                  value
                  type
                }
              }
            }
          }
        }
      `;

      const response = await (client as any).query(query, {
        boardId: Number(boardId),
      });

      const items = response?.data?.boards?.[0]?.items_page?.items || [];
      logger.info(`Fetched ${items.length} items from board ${boardId}`);

      for (const item of items) {
        mondayItems.push({
          boardId,
          item,
        });
      }
    } catch (error: any) {
      logger.error(`Failed to fetch items from board ${boardId}:`, error.message);
    }
  }

  // Sort by created_at DESC (newest first)
  mondayItems.sort((a, b) => {
    const dateA = new Date(a.item.created_at || 0).getTime();
    const dateB = new Date(b.item.created_at || 0).getTime();
    return dateB - dateA;
  });

  // Limit to 500 total
  const limited = mondayItems.slice(0, 500);
  logger.info(`Total items after sorting and limiting: ${limited.length}`);

  return limited;
}

/**
 * Parse people column to extract user ID
 */
function parsePeopleUserId(columnValue: any): string | null {
  const raw = columnValue?.value ?? null;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const persons = (parsed?.personsAndTeams ?? parsed?.persons_and_teams ?? []) as any[];
    const first = persons?.[0];
    if (!first) return null;
    return first?.id ? String(first.id) : null;
  } catch {
    return null;
  }
}

/**
 * Find column text value by column ID
 */
function findColumnText(columnValues: any[], columnId?: string | null): string | null {
  if (!columnId) return null;
  const col = columnValues.find((cv: any) => String(cv.id) === String(columnId));
  const text = (col?.text ?? "").trim();
  return text || null;
}

/**
 * Convert Monday.com item to LeadFact format
 */
function convertMondayItemToLeadFact(
  orgId: string,
  boardId: string,
  item: any,
  mapping: any,
  metricsConfig: any
): any {
  const columnValues = item.column_values || [];

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

  // Check if closed won
  const isClosedWon = statusValue === metricsConfig.closedWonStatusValue;
  const closedWonAt = isClosedWon && (item.updated_at || item.created_at)
    ? new Date(item.updated_at || item.created_at)
    : null;

  // Parse dates
  const enteredAt = item.created_at ? new Date(item.created_at) : new Date();
  const updatedAt = item.updated_at ? new Date(item.updated_at) : enteredAt;

  // For firstTouchAt and lastActivityAt, we'll use approximations
  // In a real scenario, these would come from activity logs
  const firstTouchAt = assignedUserId ? enteredAt : null;
  const lastActivityAt = updatedAt;

  return {
    orgId,
    boardId,
    itemId: String(item.id),
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
}

/**
 * Check if a lead should be loaded
 * Filters out test leads, spam, etc.
 */
function shouldLoadLead(leadFact: any, metricsConfig: any): boolean {
  // Skip if no assigned user (these will be picked up by routing)
  // Actually, we SHOULD load them for historical metrics
  // So we'll include all leads

  // Skip if status is in excluded list (spam, archived, test)
  const excludedStatuses = ['spam', 'archived', 'test', 'deleted'];
  if (leadFact.statusValue && excludedStatuses.includes(leadFact.statusValue.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Main function: Load initial 500 leads into LeadFact
 */
export async function loadInitial500Leads(orgId: string): Promise<LoadResult> {
  const startTime = Date.now();
  let loaded = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  try {
    logger.info(`[${orgId}] Starting initial data load...`);

    // 1. Get mapping configuration
    const mappingRepo = new PrismaFieldMappingConfigRepo();
    const mapping = await mappingRepo.getLatest(orgId);

    if (!mapping) {
      throw new Error('Field mapping not configured');
    }

    // 2. Get metrics configuration
    const metricsConfigRepo = new PrismaMetricsConfigRepo();
    const metricsConfig = await metricsConfigRepo.getOrCreateDefaults(orgId);

    if (!metricsConfig.leadBoardIds || String(metricsConfig.leadBoardIds).trim().length === 0) {
      throw new Error('Lead boards not configured in metrics config');
    }

    const boardIds = String(metricsConfig.leadBoardIds)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    logger.info(`[${orgId}] Found ${boardIds.length} lead boards`);

    // 3. Fetch leads from Monday.com
    const mondayLeads = await fetchLeadsFromMonday(orgId, boardIds);
    logger.info(`[${orgId}] Fetched ${mondayLeads.length} leads from Monday`);

    // 4. Convert and save to LeadFact
    const leadFactRepo = new PrismaLeadFactRepo();

    for (const { boardId, item } of mondayLeads) {
      try {
        // Convert to LeadFact format
        const leadFact = convertMondayItemToLeadFact(
          orgId,
          boardId,
          item,
          mapping,
          metricsConfig
        );

        // Check if should load
        if (!shouldLoadLead(leadFact, metricsConfig)) {
          skipped++;
          continue;
        }

        // Check if already exists
        const existing = await leadFactRepo.get(orgId, boardId, leadFact.itemId);

        if (existing) {
          // Update existing record
          await leadFactRepo.update(orgId, boardId, leadFact.itemId, {
            assignedUserId: leadFact.assignedUserId,
            industry: leadFact.industry,
            dealAmount: leadFact.dealAmount,
            statusValue: leadFact.statusValue,
            closedWonAt: leadFact.closedWonAt,
            lastActivityAt: leadFact.lastActivityAt,
          });
          logger.debug(`[${orgId}] Updated existing lead: ${leadFact.itemId}`);
        } else {
          // Create new record
          await leadFactRepo.create(leadFact);
          logger.debug(`[${orgId}] Created new lead: ${leadFact.itemId}`);
        }

        loaded++;
      } catch (error: any) {
        errors++;
        const errorMsg = `Failed to process lead ${item.id}: ${error.message}`;
        logger.error(errorMsg);
        errorMessages.push(errorMsg);

        // Continue with other leads even if one fails
        continue;
      }
    }

    const duration = Date.now() - startTime;
    logger.info(
      `[${orgId}] Initial data load completed: ` +
      `${loaded} loaded, ${skipped} skipped, ${errors} errors in ${duration}ms`
    );

    return {
      success: true,
      loaded,
      skipped,
      errors,
      duration,
      errorMessages: errors > 0 ? errorMessages : undefined,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`[${orgId}] Initial data load failed:`, error);

    return {
      success: false,
      loaded,
      skipped,
      errors: errors + 1,
      duration,
      errorMessages: [...errorMessages, error.message],
    };
  }
}

/**
 * Trigger agent profile recomputation after loading data
 */
export async function triggerProfileRecompute(orgId: string): Promise<void> {
  try {
    logger.info(`[${orgId}] Triggering agent profile recompute...`);

    // Call the recompute endpoint internally
    // This will be implemented via HTTP call to /agents/profiles/recompute
    const response = await fetch(`http://localhost:3000/agents/profiles/recompute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ROUTING_API_KEY || 'dev_key_123',
      },
      body: JSON.stringify({ orgId }),
    });

    if (!response.ok) {
      throw new Error(`Recompute failed with status ${response.status}`);
    }

    logger.info(`[${orgId}] Agent profile recompute triggered successfully`);
  } catch (error: any) {
    logger.error(`[${orgId}] Failed to trigger profile recompute:`, error.message);
    // Don't throw - this is not critical
  }
}

