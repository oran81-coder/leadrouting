import type { MondayBoardId, MondayColumnId, MondayColumnType } from "../../monday-integration/src/contracts/monday.types";

export type InternalFieldId = string;

export type InternalFieldType = "text" | "number" | "status" | "date" | "boolean" | "computed";

/**
 * Column reference without board (board is now global primaryBoardId).
 * Phase 2: Single Board Architecture
 */
export interface ColumnRef {
  columnId: MondayColumnId;
  columnType?: MondayColumnType;
}

/**
 * Legacy: Mapping target with boardId (kept for backward compatibility).
 * New configs should use ColumnRef + primaryBoardId.
 */
export interface BoardColumnRef {
  boardId: MondayBoardId;
  columnId: MondayColumnId;
  columnType?: MondayColumnType;
}

export interface InternalFieldDefinition {
  id: InternalFieldId;
  label: string;
  type: InternalFieldType;
  required: boolean;
  isCore: boolean;
  isEnabled: boolean; // admin can disable core/custom fields
  description?: string;
  group?: string;
}

/**
 * Status configuration for smart automation
 */
export interface StatusConfig {
  // Status values that indicate "deal won" (for close date calc and conversion rate)
  // Multiple statuses can indicate a successful deal: "Closed Won", "Sale Completed", etc.
  closedWonStatuses: string[]; // e.g., ["Closed Won", "Sale Completed"]
  
  // Optional: Status values that indicate "deal lost" (for conversion rate calc)
  // Real leads that were worked on but lost: "Closed Lost", "Not Interested", "Rejected"
  closedLostStatuses?: string[]; // e.g., ["Closed Lost", "Not Interested", "Rejected"]
  
  // Optional: Status values to exclude from all calculations (noise/non-leads)
  // Not real leads - should be filtered out: "Spam", "Archived", "Test", "Duplicate"
  // Note: "In Treatment" is auto-detected as: (Assigned to Agent) AND NOT (Won/Lost/Excluded)
  excludedStatuses?: string[];
}

/**
 * Writeback targets define WHERE we write routing results back to Monday.
 * They are configured in the Wizard (admin).
 */
export interface WritebackTargets {
  assignedAgent: BoardColumnRef; // mandatory (people/text/status supported)
  routingStatus?: BoardColumnRef; // optional
  routingReason?: BoardColumnRef; // optional (text)
}

/**
 * Field Mapping Configuration (Phase 2: Single Board)
 * Version 2: Simplified for single primary board architecture
 */
export interface FieldMappingConfig {
  version: number;
  updatedAt: string; // ISO
  
  // NEW: Single primary board
  primaryBoardId?: string; // Optional for backward compatibility
  primaryBoardName?: string; // for display
  
  // Mappings: can be either new format (ColumnRef) or legacy (BoardColumnRef)
  mappings: Record<InternalFieldId, BoardColumnRef | ColumnRef>;
  
  fields: InternalFieldDefinition[]; // includes core + custom, with enablement flags
  writebackTargets: WritebackTargets;
  
  // NEW: Status configuration for automation
  statusConfig?: StatusConfig; // Optional for backward compatibility
}
