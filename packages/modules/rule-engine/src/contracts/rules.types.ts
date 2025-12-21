export type RuleId = string;

export type Comparator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";

export interface RuleCondition {
  fieldId: string; // internal field id (schema)
  op: Comparator;
  value: string | number | boolean | Array<string | number | boolean> | null;
}

export interface RuleAction {
  type: "assign_agent_pool" | "assign_agent_id";
  /**
   * If assign_agent_pool: value is pool id/name (string)
   * If assign_agent_id: value is agent internal id (string)
   */
  value: string;
}

export interface RoutingRule {
  id: RuleId;
  name: string;
  description?: string;
  priority: number; // lower number = higher priority
  enabled: boolean;
  when: RuleCondition[];
  then: RuleAction;
}

export interface RuleSet {
  version: number;
  updatedAt: string; // ISO
  rules: RoutingRule[];
  // weights belong to rule engine domain; not part of mapping wizard
  weights?: Record<string, number>; // fieldId -> weight
}
