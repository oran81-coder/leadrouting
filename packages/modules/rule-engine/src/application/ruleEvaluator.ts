/**
 * Rule Evaluation Engine (Phase 1)
 * 
 * Evaluates scoring rules to determine how well agents match leads.
 * All evaluation is deterministic and explainable.
 */

import type { AgentProfile } from "../../../../agent-profiling/src/application/agentProfiler";
import type {
  ScoringRule,
  ScoringRuleCondition,
  NormalizedLead,
  RuleEvaluationContext,
  RuleEvaluationResult,
  AgentRuleEvaluation,
  MatchScoreCalculation,
  RuleOperator,
} from "../contracts/scoring.types";

/**
 * Evaluate a condition against context
 * Returns true if condition is met
 */
export function evaluateCondition(
  condition: ScoringRuleCondition,
  context: RuleEvaluationContext
): { matched: boolean; details: string } {
  if (condition.type === "compound") {
    return evaluateCompoundCondition(condition, context);
  }

  return evaluateSimpleCondition(condition, context);
}

/**
 * Evaluate simple condition (single field comparison)
 */
function evaluateSimpleCondition(
  condition: ScoringRuleCondition,
  context: RuleEvaluationContext
): { matched: boolean; details: string } {
  if (!condition.field || !condition.operator) {
    return { matched: false, details: "Invalid condition: missing field or operator" };
  }

  // Get field value from context
  const actualValue = getFieldValue(condition.field, context);
  const expectedValue = condition.value;

  // Evaluate operator
  const matched = evaluateOperator(
    condition.operator,
    actualValue,
    expectedValue
  );

  const details = `${condition.field} ${condition.operator} ${JSON.stringify(expectedValue)} (actual: ${JSON.stringify(actualValue)})`;

  return { matched, details };
}

/**
 * Evaluate compound condition (AND/OR logic)
 */
function evaluateCompoundCondition(
  condition: ScoringRuleCondition,
  context: RuleEvaluationContext
): { matched: boolean; details: string } {
  if (!condition.conditions || condition.conditions.length === 0) {
    return { matched: false, details: "No sub-conditions" };
  }

  const results = condition.conditions.map(c => evaluateCondition(c, context));

  let matched: boolean;
  if (condition.logic === "OR") {
    matched = results.some(r => r.matched);
  } else { // AND (default)
    matched = results.every(r => r.matched);
  }

  const details = `${condition.logic || "AND"}(${results.map(r => r.details).join(", ")})`;

  return { matched, details };
}

/**
 * Get field value from context
 * Supports dot notation: "lead.industry", "agent.availability"
 */
function getFieldValue(field: string, context: RuleEvaluationContext): any {
  const parts = field.split(".");

  if (parts[0] === "lead") {
    let value: any = context.lead;
    for (let i = 1; i < parts.length; i++) {
      value = value?.[parts[i]];
    }
    return value;
  }

  if (parts[0] === "agent") {
    let value: any = context.agent;
    for (let i = 1; i < parts.length; i++) {
      // Special handling for nested objects
      if (parts[i] === "industryScores" && i + 1 < parts.length) {
        // agent.industryScores.SaaS
        return context.agent.industryScores[parts[i + 1]];
      }
      value = value?.[parts[i]];
    }
    return value;
  }

  return undefined;
}

/**
 * Evaluate operator comparison
 */
function evaluateOperator(
  operator: RuleOperator,
  actual: any,
  expected: any
): boolean {
  // Handle null/undefined
  if (actual === null || actual === undefined) {
    if (operator === "equals") return expected === null || expected === undefined;
    if (operator === "notEquals") return expected !== null && expected !== undefined;
    return false;
  }

  switch (operator) {
    case "equals":
      return actual === expected;

    case "notEquals":
      return actual !== expected;

    case "greaterThan":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;

    case "lessThan":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;

    case "greaterOrEqual":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;

    case "lessOrEqual":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;

    case "contains":
      if (typeof actual !== "string" || typeof expected !== "string") return false;
      return actual.toLowerCase().includes(expected.toLowerCase());

    case "in":
      if (!Array.isArray(expected)) return false;
      return expected.includes(actual);

    case "notIn":
      if (!Array.isArray(expected)) return false;
      return !expected.includes(actual);

    default:
      return false;
  }
}

/**
 * Calculate match score based on rule configuration
 */
export function calculateMatchScore(
  rule: ScoringRule,
  context: RuleEvaluationContext
): number {
  const calc = rule.matchScoreCalculation;

  switch (calc.type) {
    case "fixed":
      return calc.fixedValue ?? 1;

    case "ratio":
      if (!calc.ratioField || !calc.ratioMax) return 0;
      const value = getFieldValue(calc.ratioField, context);
      if (typeof value !== "number") return 0;
      return Math.min(1, Math.max(0, value / calc.ratioMax));

    case "inverse_ratio":
      if (!calc.ratioField || !calc.ratioMax) return 0;
      const invValue = getFieldValue(calc.ratioField, context);
      if (typeof invValue !== "number") return 0;
      // Lower is better. 0 => 1.0 score, Max => 0.0 score
      return Math.min(1, Math.max(0, 1 - (invValue / calc.ratioMax)));

    case "range":
      if (calc.rangeMin === undefined || calc.rangeMax === undefined) return 0;
      if (calc.scoreMin === undefined || calc.scoreMax === undefined) return 0;
      if (!calc.ratioField) return 0;

      const rangeValue = getFieldValue(calc.ratioField, context);
      if (typeof rangeValue !== "number") return 0;

      // Linear interpolation
      const normalized = (rangeValue - calc.rangeMin) / (calc.rangeMax - calc.rangeMin);
      const clamped = Math.min(1, Math.max(0, normalized));
      return calc.scoreMin + (calc.scoreMax - calc.scoreMin) * clamped;

    case "custom":
      return calculateCustomScore(calc.customFunction || "", context);

    default:
      return 0;
  }
}

/**
 * Custom scoring functions for special cases
 */
function calculateCustomScore(
  functionName: string,
  context: RuleEvaluationContext
): number {
  switch (functionName) {
    case "industryMatch":
      // Match agent's industry score for lead's industry
      const industry = context.lead.industry;
      if (!industry) return 0;
      const score = context.agent.industryScores[industry];
      return score ? score / 100 : 0; // Convert 0-100 to 0-1

    case "availabilityScore":
      return context.agent.availability;

    case "conversionScore":
      return context.agent.conversionRate ?? 0;

    default:
      console.warn(`Unknown custom function: ${functionName}`);
      return 0;
  }
}

/**
 * Generate human-readable explanation for rule evaluation
 */
export function generateExplanation(
  rule: ScoringRule,
  context: RuleEvaluationContext,
  matched: boolean,
  matchScore: number
): string {
  if (!matched) {
    return `Rule not applied - condition not met`;
  }

  // Build contextual explanation
  switch (rule.category) {
    case "expertise":
      const industry = context.lead.industry;
      const score = industry ? context.agent.industryScores[industry] : null;
      if (score) {
        return `Strong ${industry} expertise (${score}/100 score)`;
      }
      return `Industry match`;

    case "capacity":
      const availability = (context.agent.availability * 100).toFixed(0);
      return `${availability}% available (${context.agent.currentActiveLeads} active leads)`;

    case "performance":
      if (context.agent.conversionRate) {
        const rate = (context.agent.conversionRate * 100).toFixed(1);
        return `${rate}% conversion rate (${context.agent.totalLeadsConverted}/${context.agent.totalLeadsHandled} deals)`;
      }
      return `Historical performance`;

    case "momentum":
      if (context.agent.hotStreakActive) {
        return `Hot streak: ${context.agent.hotStreakCount} recent wins`;
      }
      return `Performance momentum`;

    default:
      return rule.description || rule.name;
  }
}

/**
 * Evaluate a single rule for an agent
 */
export function evaluateRule(
  rule: ScoringRule,
  context: RuleEvaluationContext
): RuleEvaluationResult {
  const startTime = Date.now();

  // Check if rule is enabled
  if (!rule.enabled) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      weight: rule.weight,
      applied: false,
      matchScore: 0,
      contribution: 0,
      explanation: "Rule disabled",
      conditionDetails: "N/A",
      evaluationTimeMs: Date.now() - startTime,
    };
  }

  // Evaluate condition
  const { matched, details } = evaluateCondition(rule.condition, context);

  if (!matched) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      weight: rule.weight,
      applied: false,
      matchScore: 0,
      contribution: 0,
      explanation: "Condition not met",
      conditionDetails: details,
      evaluationTimeMs: Date.now() - startTime,
    };
  }

  // Calculate match score
  const matchScore = calculateMatchScore(rule, context);
  const contribution = rule.weight * matchScore;

  // Generate explanation
  const explanation = generateExplanation(rule, context, matched, matchScore);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    weight: rule.weight,
    applied: true,
    matchScore,
    contribution,
    explanation,
    conditionDetails: details,
    evaluationTimeMs: Date.now() - startTime,
  };
}

/**
 * Evaluate all rules for an agent
 */
export function evaluateRulesForAgent(
  lead: NormalizedLead,
  agent: AgentProfile,
  rules: ScoringRule[]
): AgentRuleEvaluation {
  const context: RuleEvaluationContext = {
    lead,
    agent,
    timestamp: new Date(),
  };

  const results = rules.map(rule => evaluateRule(rule, context));

  const totalContribution = results.reduce((sum, r) => sum + r.contribution, 0);
  const rulesApplied = results.filter(r => r.applied).length;
  const rulesSkipped = results.length - rulesApplied;

  return {
    agentUserId: agent.agentUserId,
    results,
    totalContribution,
    rulesApplied,
    rulesSkipped,
  };
}

/**
 * Evaluate rules for multiple agents
 * Returns evaluations sorted by total contribution (highest first)
 */
export function evaluateRulesForAgents(
  lead: NormalizedLead,
  agents: AgentProfile[],
  rules: ScoringRule[]
): AgentRuleEvaluation[] {
  const evaluations = agents.map(agent =>
    evaluateRulesForAgent(lead, agent, rules)
  );

  // Sort by contribution (highest first)
  evaluations.sort((a, b) => b.totalContribution - a.totalContribution);

  return evaluations;
}

