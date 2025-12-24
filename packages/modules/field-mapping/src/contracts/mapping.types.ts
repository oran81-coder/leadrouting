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
  // Status values that indicate "lead in treatment" (for availability calc)
  inTreatmentStatuses: string[]; // e.g., ["Relevant", "In Treatment", "No Answer"]
  
  // Status value that indicates "deal won" (for close date calc)
  closedWonStatus: string; // e.g., "Sale Completed"
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
