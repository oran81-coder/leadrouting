/**
 * Internal Schema (Phase 1)
 * - Deterministic, rule-based system
 * - Monday.com is the only data source
 *
 * Notes:
 * - Core fields are the initial built-in fields, but in Phase 1 the admin may remove them (Option B).
 * - Custom fields can be created/removed by admin.
 * - Field weights are NOT part of schema/mapping; weights belong to the Rule Engine.
 */

export type EntityType = "lead" | "agent" | "deal";

// Supported value types that we validate during mapping + normalization
export type InternalValueType = "text" | "number" | "status" | "date" | "boolean";

export interface FieldDefinition {
  /** Stable internal identifier (snake_case). Used as the key in normalized entities. */
  id: string;
  /** Human-readable name to show in Admin UI */
  label: string;
  entity: EntityType;
  type: InternalValueType;

  /** Required means: routing cannot be enabled unless mapped + valid for this field (when active). */
  required: boolean;

  /** Core means: shipped by default. In Option B, core fields may still be removed (active=false). */
  isCore: boolean;

  /** Whether field is currently enabled/active. Admin can disable (remove) any field in Option B. */
  active: boolean;

  /** Optional metadata for UI grouping and help text */
  description?: string;
  group?: string;
}

/**
 * Admin-configurable schema. This is what the system loads to render:
 * - mapping wizard internal field list
 * - validation rules (required + active)
 * - normalization expectations (type)
 */
export interface InternalSchema {
  version: number;
  updatedAt: string; // ISO string
  fields: FieldDefinition[];
}

/**
 * Normalized entities:
 * - We keep a flexible shape keyed by field id, because schema is admin-configurable.
 * - Each entity MUST have a stable internal id to support audit logging.
 */
export type NormalizedValues = Record<string, unknown>;

export interface NormalizedLead {
  entity: "lead";
  internalLeadId: string;
  values: NormalizedValues; // keys are Internal Field IDs for entity=lead
}

export interface NormalizedAgent {
  entity: "agent";
  internalAgentId: string;
  values: NormalizedValues; // keys are Internal Field IDs for entity=agent
}

export interface NormalizedDeal {
  entity: "deal";
  internalDealId: string;
  values: NormalizedValues; // keys are Internal Field IDs for entity=deal
}

export interface NormalizedSnapshot {
  schemaVersion: number;
  leads: NormalizedLead[];
  agents: NormalizedAgent[];
  deals: NormalizedDeal[];
}

/**
 * Default Core Fields (initial examples)
 * These are examples from PRD; they can be edited/disabled by admin in Option B.
 * Adjust labels/descriptions as needed for your org.
 */
export const DEFAULT_CORE_FIELDS: FieldDefinition[] = [
  // Lead core
  { id: "lead_source", label: "Lead Source", entity: "lead", type: "status", required: true, isCore: true, active: true, group: "Lead" },
  { id: "lead_industry", label: "Industry", entity: "lead", type: "status", required: false, isCore: true, active: true, group: "Lead" },
  { id: "lead_deal_size", label: "Deal Size / Amount", entity: "lead", type: "number", required: false, isCore: true, active: true, group: "Lead" },
  { id: "lead_created_at", label: "Created At", entity: "lead", type: "date", required: true, isCore: true, active: true, group: "Lead" },

  // Agent core
  { id: "agent_domain", label: "Domain", entity: "agent", type: "status", required: false, isCore: true, active: true, group: "Agent" },
  { id: "agent_availability", label: "Availability", entity: "agent", type: "status", required: true, isCore: true, active: true, group: "Agent" },
  { id: "agent_workload", label: "Workload", entity: "agent", type: "number", required: false, isCore: true, active: true, group: "Agent" },

  // Deal core
  { id: "deal_status", label: "Deal Status", entity: "deal", type: "status", required: true, isCore: true, active: true, group: "Deal" },
  { id: "deal_close_date", label: "Close Date", entity: "deal", type: "date", required: false, isCore: true, active: true, group: "Deal" },
  { id: "deal_amount", label: "Deal Amount", entity: "deal", type: "number", required: false, isCore: true, active: true, group: "Deal" },
];

export function buildDefaultSchema(): InternalSchema {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    fields: DEFAULT_CORE_FIELDS,
  };
}

export function getActiveFields(schema: InternalSchema): FieldDefinition[] {
  return schema.fields.filter((f) => f.active);
}

export function getActiveFieldsByEntity(schema: InternalSchema, entity: EntityType): FieldDefinition[] {
  return getActiveFields(schema).filter((f) => f.entity === entity);
}

export function getRequiredActiveFields(schema: InternalSchema): FieldDefinition[] {
  return schema.fields.filter((f) => f.active && f.required);
}
