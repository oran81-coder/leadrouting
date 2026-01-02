/**
 * Lead Update Detector
 * 
 * Detects changes in mapped fields for existing leads and triggers re-scoring.
 * Compares current Monday.com data with stored LeadFact data.
 */

import { createModuleLogger } from "../infrastructure/logger";
import { PrismaLeadFactRepo } from "../infrastructure/leadFact.repo";
import { PrismaFieldMappingConfigRepo } from "../../../../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";

const logger = createModuleLogger('LeadUpdateDetector');

/**
 * Mapped field names that trigger re-scoring when changed
 */
const CRITICAL_FIELDS = [
  'industry',
  'dealSize',
  'dealAmount',
  'source',
  'status',
  'priority',
  'region',
  'company',
];

/**
 * Detected change in a lead
 */
export interface LeadChange {
  fieldName: string;
  oldValue: any;
  newValue: any;
}

/**
 * Result of change detection
 */
export interface ChangeDetectionResult {
  hasChanges: boolean;
  changes: LeadChange[];
  requiresRescoring: boolean;
}

/**
 * Compare Monday.com item data with stored LeadFact data
 * Returns detected changes in mapped fields
 */
export async function detectLeadChanges(
  orgId: string,
  boardId: string,
  itemId: string,
  mondayItem: any
): Promise<ChangeDetectionResult> {
  const leadFactRepo = new PrismaLeadFactRepo();
  const mappingRepo = new PrismaFieldMappingConfigRepo();
  const metricsRepo = new PrismaMetricsConfigRepo();

  // Get existing LeadFact
  const existingLead = await leadFactRepo.get(orgId, boardId, itemId);
  if (!existingLead) {
    logger.debug(`No existing LeadFact for ${boardId}/${itemId} - treating as new lead`);
    return {
      hasChanges: false,
      changes: [],
      requiresRescoring: false,
    };
  }

  // Get mapping config
  const mapping = await mappingRepo.getLatest(orgId);
  if (!mapping) {
    logger.warn(`No mapping config for org ${orgId}`);
    return {
      hasChanges: false,
      changes: [],
      requiresRescoring: false,
    };
  }

  // Get metrics config for additional field mappings
  const metricsConfig = await metricsRepo.getOrCreateDefaults(orgId);

  // Extract column values from Monday item
  const columnValues = mondayItem.column_values || [];
  const cvMap = new Map<string, any>();
  for (const cv of columnValues) {
    cvMap.set(cv.id, cv);
  }

  const changes: LeadChange[] = [];

  // Helper to get column text
  const getColumnText = (columnId?: string | null): string | null => {
    if (!columnId) return null;
    const cv = cvMap.get(String(columnId));
    const text = (cv?.text ?? "").trim();
    return text || null;
  };

  // Helper to parse deal amount
  const parseDealAmount = (text: string | null): number | null => {
    if (!text) return null;
    const parsed = parseFloat(text.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? null : parsed;
  };

  // Check industry change
  const currentIndustry = getColumnText(metricsConfig.industryColumnId);
  if (currentIndustry !== existingLead.industry) {
    changes.push({
      fieldName: 'industry',
      oldValue: existingLead.industry,
      newValue: currentIndustry,
    });
  }

  // Check deal amount change
  const dealAmountText = getColumnText(metricsConfig.dealAmountColumnId);
  const currentDealAmount = parseDealAmount(dealAmountText);
  if (currentDealAmount !== existingLead.dealAmount) {
    changes.push({
      fieldName: 'dealAmount',
      oldValue: existingLead.dealAmount,
      newValue: currentDealAmount,
    });
  }

  // Check status change
  const currentStatus = getColumnText(metricsConfig.closedWonStatusColumnId);
  if (currentStatus !== existingLead.statusValue) {
    changes.push({
      fieldName: 'status',
      oldValue: existingLead.statusValue,
      newValue: currentStatus,
    });
  }

  // Check for changes in other mapped fields
  for (const [fieldId, ref] of Object.entries(mapping.mappings ?? {})) {
    const columnId = (ref as any).columnId;
    if (!columnId) continue;

    const currentValue = getColumnText(columnId);
    const existingValue = (existingLead as any)[fieldId];

    // Skip if values are the same
    if (currentValue === existingValue) continue;

    // Skip if both are null/empty
    if (!currentValue && !existingValue) continue;

    // Add change
    changes.push({
      fieldName: fieldId,
      oldValue: existingValue,
      newValue: currentValue,
    });
  }

  // Determine if re-scoring is required
  const requiresRescoring = changes.some(change =>
    CRITICAL_FIELDS.includes(change.fieldName)
  );

  logger.info(`Change detection for ${boardId}/${itemId}`, {
    hasChanges: changes.length > 0,
    changesCount: changes.length,
    requiresRescoring,
    changes: changes.map(c => `${c.fieldName}: ${c.oldValue} -> ${c.newValue}`),
  });

  return {
    hasChanges: changes.length > 0,
    changes,
    requiresRescoring,
  };
}

/**
 * Format changes for display/logging
 */
export function formatChanges(changes: LeadChange[]): string {
  if (changes.length === 0) return "No changes";

  return changes
    .map(c => `${c.fieldName}: "${c.oldValue || 'null'}" → "${c.newValue || 'null'}"`)
    .join(", ");
}

