/**
 * KPI Weights to Scoring Rules Converter
 * 
 * Converts the KPI weights from Admin UI into ScoringRules for the Scoring Engine.
 * This bridges the gap between user-friendly weight sliders and the rule evaluation system.
 */

import type { ScoringRule, ScoringRuleCondition, MatchScoreCalculation } from "../../../rule-engine/src/contracts/scoring.types";

/**
 * KPI weights from Admin UI (matches AdminScreen.tsx state)
 */
export interface KPIWeights {
  workload: number;              // 0-100
  conversionHistorical: number;  // 0-100
  recentPerformance: number;     // 0-100
  responseTime: number;          // 0-100
  avgTimeToClose: number;        // 0-100
  avgDealSize: number;           // 0-100
  industryMatch: number;         // 0-100
  hotStreak: number;             // 0-100
}

/**
 * Default weights (matches initial state in AdminScreen.tsx)
 */
export const DEFAULT_KPI_WEIGHTS: KPIWeights = {
  workload: 20,
  conversionHistorical: 25,
  recentPerformance: 15,
  responseTime: 10,
  avgTimeToClose: 10,
  avgDealSize: 10,
  industryMatch: 5,
  hotStreak: 5,
};

/**
 * Validate that weights sum to 100 (or close to it)
 */
export function validateWeights(weights: KPIWeights): { valid: boolean; total: number; error?: string } {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

  // Allow small variance (±2%) for rounding
  if (total < 98 || total > 102) {
    return {
      valid: false,
      total,
      error: `Weights must sum to 100 (current: ${total})`,
    };
  }

  return { valid: true, total };
}

/**
 * Convert KPI weights to ScoringRules
 * 
 * Each weight becomes a ScoringRule that evaluates the corresponding metric.
 */
export function convertKPIWeightsToRules(weights: KPIWeights, lead?: any): ScoringRule[] {
  const now = new Date();
  const rules: ScoringRule[] = [];

  // Rule 1: Workload / Availability
  if (weights.workload > 0) {
    rules.push({
      id: "kpi_workload",
      name: "Agent Availability",
      description: "Agents with lower workload and higher availability are preferred",
      weight: weights.workload,
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
        customFunction: "availabilityScore",
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Rule 2: Conversion Rate - Historical
  if (weights.conversionHistorical > 0) {
    rules.push({
      id: "kpi_conversion_historical",
      name: "Historical Conversion Rate",
      description: "Agents with higher historical conversion rates are preferred",
      weight: weights.conversionHistorical,
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
        customFunction: "conversionScore",
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Rule 3: Recent Performance
  // Note: For Phase 1, we'll use same as historical. Phase 2 can add time-windowed metrics.
  if (weights.recentPerformance > 0) {
    rules.push({
      id: "kpi_recent_performance",
      name: "Recent Performance",
      description: "Agents with strong recent performance (last 30 days)",
      weight: weights.recentPerformance,
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
        customFunction: "conversionScore",
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Rule 4: Response Time
  if (weights.responseTime > 0) {
    rules.push({
      id: "kpi_response_time",
      name: "Response Time",
      description: "Agents who respond quickly to leads",
      weight: weights.responseTime,
      enabled: true,
      category: "performance",
      condition: {
        type: "simple",
        field: "agent.avgResponseTime",
        operator: "notEquals",
        value: null,
      },
      matchScoreCalculation: {
        type: "inverse_ratio",
        ratioField: "agent.avgResponseTime",
        ratioMax: 86400, // 24 hours in seconds (lower is better, so we invert)
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Rule 5: Average Time to Close
  // Similar to response time - lower is better
  if (weights.avgTimeToClose > 0) {
    rules.push({
      id: "kpi_avg_time_to_close",
      name: "Time to Close",
      description: "Agents who close deals faster",
      weight: weights.avgTimeToClose,
      enabled: true,
      category: "performance",
      condition: {
        type: "simple",
        field: "agent.totalLeadsConverted", // keep checking if they have converted leads
        operator: "greaterThan",
        value: 0,
      },
      matchScoreCalculation: {
        type: "inverse_ratio",
        ratioField: "agent.avgTimeToClose",
        ratioMax: 2592000, // 30 days in seconds
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Rule 6: Average Deal Size
  if (weights.avgDealSize > 0) {
    rules.push({
      id: "kpi_avg_deal_size",
      name: "Average Deal Size",
      description: "Agents who close larger deals",
      weight: weights.avgDealSize,
      enabled: true,
      category: "performance",
      condition: {
        type: "simple",
        field: "agent.avgDealSize",
        operator: "greaterThan",
        value: 0,
      },
      matchScoreCalculation: {
        type: "ratio",
        ratioField: "agent.avgDealSize",
        ratioMax: 100000, // $100k as max reference
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Rule 7: Industry Match
  if (weights.industryMatch > 0) {
    rules.push({
      id: "kpi_industry_match",
      name: "Industry Expertise",
      description: "Agents with experience in the lead's industry",
      weight: weights.industryMatch,
      enabled: true,
      category: "expertise",
      condition: {
        type: "compound",
        logic: "OR",
        conditions: [
          { type: "simple", field: "lead.industry", operator: "notEquals", value: null },
          { type: "simple", field: "lead.lead_industry", operator: "notEquals", value: null },
        ],
      },
      matchScoreCalculation: {
        type: "custom",
        customFunction: "industryMatch",
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Rule 8: Hot Streak
  if (weights.hotStreak > 0) {
    rules.push({
      id: "kpi_hot_streak",
      name: "Hot Streak",
      description: "Agents on a winning streak",
      weight: weights.hotStreak,
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
        ratioMax: 10, // 10 wins = perfect score
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  return rules.filter(r => r.enabled);
}

/**
 * Normalize weights to ensure they sum to 100
 */
export function normalizeWeights(weights: KPIWeights): KPIWeights {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

  if (total === 0) {
    return DEFAULT_KPI_WEIGHTS;
  }

  if (Math.abs(total - 100) < 0.01) {
    return weights; // Already normalized
  }

  // Scale all weights proportionally
  const factor = 100 / total;
  return {
    workload: Math.round(weights.workload * factor),
    conversionHistorical: Math.round(weights.conversionHistorical * factor),
    recentPerformance: Math.round(weights.recentPerformance * factor),
    responseTime: Math.round(weights.responseTime * factor),
    avgTimeToClose: Math.round(weights.avgTimeToClose * factor),
    avgDealSize: Math.round(weights.avgDealSize * factor),
    industryMatch: Math.round(weights.industryMatch * factor),
    hotStreak: Math.round(weights.hotStreak * factor),
  };
}

/**
 * Get KPI weights from MetricsConfig (stored in database)
 * Returns default if not configured
 */
export function extractKPIWeightsFromMetricsConfig(config: any): KPIWeights {
  // 1. Try to read from JSON field (legacy/override)
  if (config?.kpiWeights) {
    // If it's a string (from DB), parse it
    const parsed = typeof config.kpiWeights === 'string'
      ? JSON.parse(config.kpiWeights)
      : config.kpiWeights;

    return {
      ...DEFAULT_KPI_WEIGHTS,
      ...parsed,
    };
  }

  // 2. Try to read from individual columns (Phase 2)
  if (config && typeof config.weightDomainExpertise === 'number') {
    return {
      workload: config.weightAvailability ?? DEFAULT_KPI_WEIGHTS.workload,
      conversionHistorical: config.weightConversionHistorical ?? DEFAULT_KPI_WEIGHTS.conversionHistorical,
      recentPerformance: config.weightRecentPerformance ?? DEFAULT_KPI_WEIGHTS.recentPerformance,
      responseTime: config.weightResponseTime ?? DEFAULT_KPI_WEIGHTS.responseTime,
      avgTimeToClose: config.weightAvgTimeToClose ?? DEFAULT_KPI_WEIGHTS.avgTimeToClose,
      avgDealSize: config.weightAvgDealSize ?? DEFAULT_KPI_WEIGHTS.avgDealSize,
      industryMatch: config.weightDomainExpertise ?? DEFAULT_KPI_WEIGHTS.industryMatch, // Mapping: domainExpertise -> industryMatch
      hotStreak: config.weightHotAgent ?? DEFAULT_KPI_WEIGHTS.hotStreak, // Mapping: hotAgent -> hotStreak
    };
  }

  // 3. Fallback to defaults
  return DEFAULT_KPI_WEIGHTS;
}

