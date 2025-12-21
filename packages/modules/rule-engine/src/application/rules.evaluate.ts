import type { NormalizedPrimitive } from "../../../../core/src/schema/normalization";
import type { RoutingRule, RuleCondition, Comparator, RuleAction, RuleSet } from "../contracts/rules.types";

export interface ConditionExplain {
  fieldId: string;
  op: Comparator;
  expected: unknown;
  actual: NormalizedPrimitive;
  passed: boolean;
}

export interface RuleExplain {
  ruleId: string;
  ruleName: string;
  priority: number;
  enabled: boolean;
  conditions: ConditionExplain[];
  matched: boolean;
  action?: RuleAction;
}

export interface EvaluateResult {
  matched: boolean;
  selectedRule?: { id: string; name: string; priority: number; action: RuleAction };
  explains: RuleExplain[];
}

function compare(op: Comparator, actual: NormalizedPrimitive, expected: any): boolean {
  // Null actual never matches except explicit eq null
  if (actual === null) {
    if (op === "eq") return expected === null;
    if (op === "neq") return expected !== null;
    return false;
  }

  switch (op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in":
      return Array.isArray(expected) ? expected.includes(actual as any) : false;
    case "contains":
      return typeof actual === "string" && typeof expected === "string" ? actual.includes(expected) : false;
    default:
      return false;
  }
}

function evalCondition(values: Record<string, NormalizedPrimitive>, c: RuleCondition): ConditionExplain {
  const actual = values[c.fieldId] ?? null;
  const passed = compare(c.op, actual, c.value as any);
  return { fieldId: c.fieldId, op: c.op, expected: c.value, actual, passed };
}

export function evaluateRules(values: Record<string, NormalizedPrimitive>, rules: RoutingRule[]): EvaluateResult {
  const enabledRules = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);

  const explains: RuleExplain[] = [];
  let selected: { id: string; name: string; priority: number; action: RuleAction } | undefined;

  for (const r of enabledRules) {
    const conditions = (r.when ?? []).map((c) => evalCondition(values, c));
    const matched = conditions.every((c) => c.passed);

    explains.push({
      ruleId: r.id,
      ruleName: r.name,
      priority: r.priority,
      enabled: r.enabled,
      conditions,
      matched,
      action: matched ? r.then : undefined,
    });

    if (!selected && matched) {
      selected = { id: r.id, name: r.name, priority: r.priority, action: r.then };
      // keep evaluating to provide full explainability list
    }
  }

  return {
    matched: !!selected,
    selectedRule: selected,
    explains,
  };
}

export function evaluateRuleSet(values: Record<string, NormalizedPrimitive>, ruleSet: RuleSet): EvaluateResult {
  return evaluateRules(values, ruleSet.rules ?? []);
}
