/**
 * Default Scoring Rules (Phase 1)
 * 
 * Pre-configured rules for intelligent lead routing.
 * These rules can be customized by admins via the Admin UI.
 */

import type { ScoringRule, ScoringRuleSet } from "../contracts/scoring.types";

/**
 * Phase 1 Default Rules
 * Total weight: 100%
 */
export const DEFAULT_SCORING_RULES: ScoringRule[] = [
  // ========================================
  // EXPERTISE RULES (30% total weight)
  // ========================================
  {
    id: "industry_expertise",
    name: "Industry Expertise",
    description: "Match lead to agent with proven success in the same industry",
    weight: 30,
    enabled: true,
    category: "expertise",
    condition: {
      type: "simple",
      field: "lead.industry",
      operator: "notEquals",
      value: null,
    },
    matchScoreCalculation: {
      type: "custom",
      customFunction: "industryMatch", // Returns agent's expertise score for this industry
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // ========================================
  // CAPACITY RULES (20% total weight)
  // ========================================
  {
    id: "agent_availability",
    name: "Agent Availability",
    description: "Prefer agents with lower current workload",
    weight: 20,
    enabled: true,
    category: "capacity",
    condition: {
      type: "simple",
      field: "agent.availability",
      operator: "greaterThan",
      value: 0,
    },
    matchScoreCalculation: {
      type: "custom",
      customFunction: "availabilityScore", // Returns agent.availability (0-1)
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // ========================================
  // PERFORMANCE RULES (25% total weight)
  // ========================================
  {
    id: "conversion_rate",
    name: "Historical Conversion Rate",
    description: "Prefer agents with higher historical success rates",
    weight: 25,
    enabled: true,
    category: "performance",
    condition: {
      type: "simple",
      field: "agent.conversionRate",
      operator: "greaterThan",
      value: 0,
    },
    matchScoreCalculation: {
      type: "custom",
      customFunction: "conversionScore", // Returns agent.conversionRate (0-1)
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // ========================================
  // SPEED RULES (15% total weight)
  // ========================================
  {
    id: "response_time",
    name: "Fast Response Time",
    description: "Prefer agents who respond quickly to leads",
    weight: 15,
    enabled: true,
    category: "performance",
    condition: {
      type: "simple",
      field: "agent.avgResponseTime",
      operator: "greaterThan",
      value: 0,
    },
    matchScoreCalculation: {
      type: "range",
      ratioField: "agent.avgResponseTime",
      rangeMin: 3600,    // 1 hour (worst)
      rangeMax: 300,     // 5 minutes (best)
      scoreMin: 0,
      scoreMax: 1,
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // ========================================
  // MOMENTUM RULES (10% total weight)
  // ========================================
  {
    id: "hot_streak",
    name: "Hot Streak Bonus",
    description: "Bonus for agents on a winning streak",
    weight: 10,
    enabled: true,
    category: "momentum",
    condition: {
      type: "simple",
      field: "agent.hotStreakActive",
      operator: "equals",
      value: true,
    },
    matchScoreCalculation: {
      type: "ratio",
      ratioField: "agent.hotStreakCount",
      ratioMax: 5, // 5+ deals = perfect score
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Create default rule set
 */
export function getDefaultRuleSet(): ScoringRuleSet {
  const totalWeight = DEFAULT_SCORING_RULES.reduce((sum, rule) => sum + rule.weight, 0);
  
  if (totalWeight !== 100) {
    console.warn(`[DefaultRules] Total weight is ${totalWeight}, expected 100`);
  }
  
  return {
    version: 1,
    rules: DEFAULT_SCORING_RULES,
    totalWeight,
    updatedAt: new Date(),
  };
}

/**
 * Validate rule set (total weight = 100)
 */
export function validateRuleSet(ruleSet: ScoringRuleSet): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check total weight
  const totalWeight = ruleSet.rules.reduce((sum, rule) => sum + rule.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    errors.push(`Total weight must equal 100 (current: ${totalWeight})`);
  }
  
  // Check individual rules
  for (const rule of ruleSet.rules) {
    if (rule.weight < 0 || rule.weight > 100) {
      errors.push(`Rule "${rule.name}" has invalid weight: ${rule.weight} (must be 0-100)`);
    }
    
    if (!rule.id || !rule.name) {
      errors.push(`Rule missing required fields (id, name)`);
    }
    
    if (!rule.condition) {
      errors.push(`Rule "${rule.name}" missing condition`);
    }
    
    if (!rule.matchScoreCalculation) {
      errors.push(`Rule "${rule.name}" missing match score calculation`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a custom rule set with modified weights
 * Ensures total weight = 100
 */
export function createCustomRuleSet(weights: Record<string, number>): ScoringRuleSet {
  const rules = DEFAULT_SCORING_RULES.map(rule => ({
    ...rule,
    weight: weights[rule.id] ?? rule.weight,
    updatedAt: new Date(),
  }));
  
  const totalWeight = rules.reduce((sum, rule) => sum + rule.weight, 0);
  
  return {
    version: 1,
    rules,
    totalWeight,
    updatedAt: new Date(),
  };
}

