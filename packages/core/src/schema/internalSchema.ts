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
export type InternalValueType = "text" | "number" | "status" | "date" | "boolean" | "computed";

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
  { 
    id: "lead_source", 
    label: "Lead Source", 
    entity: "lead", 
    type: "status", 
    required: true, 
    isCore: true, 
    active: true, 
    group: "Lead",
    description: "Source/campaign of the lead"
  },
  { 
    id: "lead_industry", 
    label: "Industry", 
    entity: "lead", 
    type: "status", 
    required: false, 
    isCore: true, 
    active: true, 
    group: "Lead",
    description: "Industry/vertical of the lead"
  },
  { 
    id: "lead_deal_size", 
    label: "Deal Size / Amount", 
    entity: "lead", 
    type: "number", 
    required: false, 
    isCore: true, 
    active: true, 
    group: "Lead",
    description: "Potential deal value"
  },
  { 
    id: "lead_created_at", 
    label: "Created At (Auto)", 
    entity: "lead", 
    type: "date", 
    required: false, 
    isCore: true, 
    active: true, 
    group: "Lead",
    description: "Automatically captured from Monday item creation time"
  },
  { 
    id: "assigned_agent", 
    label: "Assigned Agent", 
    entity: "lead", 
    type: "text", 
    required: false, 
    isCore: true, 
    active: true, 
    group: "Lead",
    description: "Current agent handling this lead (used for performance tracking and availability calculation)"
  },
  { 
    id: "next_call_date", 
    label: "Next Call Date (Optional)", 
    entity: "lead", 
    type: "date", 
    required: false, 
    isCore: true, 
    active: true, 
    group: "Lead",
    description: "Optional: Next scheduled contact date (if column exists)"
  },
  { 
    id: "first_contact_at", 
    label: "First Contact (Auto-Detected)", 
    entity: "lead", 
    type: "computed", 
    required: false, 
    isCore: true, 
    active: true, 
    group: "Lead",
    description: "Auto-detected from Updates/Activity Log. Used to calculate Response Time KPI."
  },

  // Agent core
  { 
    id: "agent_domain", 
    label: "Agent Domain Expertise", 
    entity: "agent", 
    type: "computed", 
    required: false, 
    isCore: true, 
    active: true, 
    group: "Agent",
    description: "Auto-learned from historical performance by Industry. System tracks conversion rates and identifies agent expertise domains."
  },
  { 
    id: "agent_availability", 
    label: "Availability (Auto-Calculated)", 
    entity: "agent", 
    type: "computed", 
    required: false, 
    isCore: true, 
    active: true, 
    group: "Agent",
    description: "Calculated automatically from leads in-treatment count and daily quota"
  },
  // NOTE: agent_workload removed - will be managed manually in Outcomes UI

  // Deal core
  { 
    id: "deal_status", 
    label: "Deal Status", 
    entity: "deal", 
    type: "status", 
    required: true, 
    isCore: true, 
    active: true, 
    group: "Deal",
    description: "Current status of the deal"
  },
  { 
    id: "deal_won_status_column", 
    label: "Deal Won Status Column", 
    entity: "deal", 
    type: "status", 
    required: false, 
    isCore: true, 
    active: true, 
    group: "Deal",
    description: "Column containing 'Deal Won' status (can be same as Deal Status or a separate column)"
  },
  { 
    id: "deal_close_date", 
    label: "Close Date (Optional Column)", 
    entity: "deal", 
    type: "date", 
    required: false, 
    isCore: true, 
    active: true, 
    group: "Deal",
    description: "Optional: If column exists, use it. Otherwise, use status change timestamp"
  },
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
