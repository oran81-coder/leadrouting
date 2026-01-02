export type MondayBoardId = string;
export type MondayColumnId = string;
export type MondayItemId = string;

export type MondayColumnType =
  | "text"
  | "numbers"
  | "status"
  | "date"
  | "people"
  | "dropdown"
  | "tags"
  | "link";

export interface MondayBoardSummary {
  id: MondayBoardId;
  name: string;
}

export interface MondayColumnSummary {
  id: MondayColumnId;
  title: string;
  type: MondayColumnType;
}

/**
 * Monday item representation (minimal for Phase 1).
 * We deliberately keep it minimal and stable, based on common Monday GraphQL responses.
 *
 * Typical Monday GraphQL: items { id name column_values { id text value type } }
 */
export interface MondayColumnValue {
  id: MondayColumnId;
  /** Human-friendly string (often already normalized by Monday). */
  text?: string | null;
  /**
   * Raw JSON string provided by Monday (stringified JSON). Example:
   * - numbers: {"number":"123"}
   * - date: {"date":"2025-12-19","time":null}
   * - status: {"index":0,"label":"New"}
   */
  value?: string | null;
  /** Sometimes returned by Monday depending on query. */
  type?: MondayColumnType;
}

export interface MondayItem {
  id: MondayItemId;
  name?: string | null;
  /** Optional board id (sometimes not included in item queries). We add it when we know it. */
  boardId?: MondayBoardId;
  created_at?: string;
  updated_at?: string;
  column_values: MondayColumnValue[];
}

export interface MondayBoardSample {
  boardId: MondayBoardId;
  items: MondayItem[];
}
