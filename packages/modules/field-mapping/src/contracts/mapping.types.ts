import type { MondayBoardId, MondayColumnId, MondayColumnType } from "../../monday-integration/src/contracts/monday.types";

export type InternalFieldId = string;

export type InternalFieldType = "text" | "number" | "status" | "date" | "boolean";

/**
 * Mapping target is always a (boardId, columnId) pair.
 * Multi-board is supported by design.
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
 * Writeback targets define WHERE we write routing results back to Monday.
 * They are configured in the Wizard (admin).
 */
export interface WritebackTargets {
  assignedAgent: BoardColumnRef; // mandatory (people/text/status supported)
  routingStatus?: BoardColumnRef; // optional
  routingReason?: BoardColumnRef; // optional (text)
}

export interface FieldMappingConfig {
  version: number;
  updatedAt: string; // ISO
  mappings: Record<InternalFieldId, BoardColumnRef>;
  fields: InternalFieldDefinition[]; // includes core + custom, with enablement flags
  writebackTargets: WritebackTargets;
}
