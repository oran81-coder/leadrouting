/**
 * Phase 1: Scoring Rules for Agent Matching
 * 
 * Unlike routing rules (which determine IF to route), scoring rules determine
 * HOW WELL an agent matches a lead. Each rule contributes points based on match quality.
 * 
 * Key Concepts:
 * - Rules are weighted (0-100 scale)
 * - Each rule evaluates a condition and contributes: weight * matchScore
 * - Match score is 0-1 (0 = no match, 1 = perfect match)
 * - Final agent score = sum of all contributions
 */

import type { AgentProfile } from "../../../../agent-profiling/src/application/agentProfiler";

export type ScoringRuleId = string;

/**
 * Comparison operators for rule conditions
 */
export type RuleOperator = 
  | "equals"           // Exact match
  | "notEquals"        // Not equal
  | "greaterThan"      // >
  | "lessThan"         // <
  | "greaterOrEqual"   // >=
  | "lessOrEqual"      // <=
  | "contains"         // String contains (case insensitive)
  | "in"               // Value in array
  | "notIn";           // Value not in array

/**
 * Rule condition that must be true for rule to apply
 */
export interface ScoringRuleCondition {
  type: "simple" | "compound";
  
  // Simple condition
  field?: string;               // e.g., "lead.industry" or "agent.availability"
  operator?: RuleOperator;
  value?: any;
  
  // Compound condition
  logic?: "AND" | "OR";
  conditions?: ScoringRuleCondition[];
}

/**
 * How to calculate match score when condition is met
 */
export interface MatchScoreCalculation {
  type: "fixed" | "ratio" | "range" | "custom";
  
  // Fixed score (always same)
  fixedValue?: number;  // 0-1
  
  // Ratio (divide actual by max)
  ratioField?: string;  // Field to get value from
  ratioMax?: number;    // Maximum value for normalization
  
  // Range mapping
  rangeMin?: number;
  rangeMax?: number;
  scoreMin?: number;    // 0-1
  scoreMax?: number;    // 0-1
  
  // Custom function name (for special cases)
  customFunction?: string;
}

/**
 * Scoring Rule Definition
 * Determines how much an agent should be preferred for a lead
 */
export interface ScoringRule {
  id: ScoringRuleId;
  name: string;
  description: string;
  
  // Rule properties
  weight: number;              // 0-100 (importance of this rule)
  enabled: boolean;
  category: "performance" | "capacity" | "expertise" | "momentum" | "other";
  
  // Condition (when does this rule apply?)
  condition: ScoringRuleCondition;
  
  // Scoring (how much to contribute?)
  matchScoreCalculation: MatchScoreCalculation;
  
  // Metadata
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Collection of all scoring rules
 */
export interface ScoringRuleSet {
  version: number;
  rules: ScoringRule[];
  totalWeight: number;  // Should equal 100
  updatedAt: Date;
}

/**
 * Normalized lead data for rule evaluation
 */
export interface NormalizedLead {
  // Lead properties
  leadId: string;
  leadName?: string;
  industry?: string;
  dealSize?: number;
  source?: string;
  createdAt?: Date;
  
  // Custom fields (from field mapping)
  [key: string]: any;
}

/**
 * Context for rule evaluation
 */
export interface RuleEvaluationContext {
  lead: NormalizedLead;
  agent: AgentProfile;
  timestamp: Date;
}

/**
 * Result of evaluating a single rule
 */
export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  category: string;
  weight: number;
  
  // Evaluation outcome
  applied: boolean;           // Did rule condition match?
  matchScore: number;         // 0-1 (quality of match)
  contribution: number;       // weight * matchScore
  
  // Explanation
  explanation: string;
  conditionDetails: string;
  
  // Debug info
  evaluationTimeMs?: number;
}

/**
 * Result of evaluating all rules for one agent
 */
export interface AgentRuleEvaluation {
  agentUserId: string;
  results: RuleEvaluationResult[];
  totalContribution: number;
  rulesApplied: number;
  rulesSkipped: number;
}

