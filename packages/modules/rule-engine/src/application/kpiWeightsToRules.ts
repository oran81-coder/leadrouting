/**
 * Convert KPI Weights to Scoring Rules
 * 
 * This module transforms the Admin UI's KPI weight sliders (0-100%)
 * into actual scoring rules that the Scoring Engine can evaluate.
 */

import type { KPIWeights } from "../../../routing-state/src/infrastructure/routingSettings.repo";
import type { ScoringRule } from "../contracts/scoring.types";

/**
 * Convert KPI weights to scoring rules
 * 
 * Each KPI weight (0-100%) becomes a scoring rule with appropriate conditions
 * and weight. The sum of all active weights should ideally equal 100%.
 */
export function kpiWeightsToScoringRules(weights: KPIWeights): ScoringRule[] {
  const rules: ScoringRule[] = [];
  
  // Rule 1: Workload / Availability
  if (weights.workload > 0) {
    rules.push({
      id: "kpi_workload",
      name: "Agent Availability",
      category: "capacity",
      weight: weights.workload,
      condition: { type: "simple", field: "agentProfile.availability", operator: "greaterThan", value: 0 },
      scoringFunction: "availabilityScore",
      explanation: "Agent has available capacity",
    });
  }

  // Rule 2: Historical Conversion Rate
  if (weights.conversionHistorical > 0) {
    rules.push({
      id: "kpi_conversion_historical",
      name: "Historical Conversion Rate",
      category: "performance",
      weight: weights.conversionHistorical,
      condition: { type: "simple", field: "agentProfile.conversionRate", operator: "greaterThan", value: 0 },
      scoringFunction: "conversionScore",
      explanation: "Agent's historical conversion rate",
    });
  }

  // Rule 3: Recent Performance
  if (weights.recentPerformance > 0) {
    rules.push({
      id: "kpi_recent_performance",
      name: "Recent Performance",
      category: "performance",
      weight: weights.recentPerformance,
      condition: { type: "simple", field: "agentProfile.totalLeadsHandled", operator: "greaterThan", value: 0 },
      scoringFunction: "recentPerformanceScore",
      explanation: "Agent's recent win rate",
    });
  }

  // Rule 4: Response Time
  if (weights.responseTime > 0) {
    rules.push({
      id: "kpi_response_time",
      name: "Response Speed",
      category: "performance",
      weight: weights.responseTime,
      condition: { type: "simple", field: "agentProfile.avgResponseTime", operator: "lessThan", value: 86400 },
      scoringFunction: "responseTimeScore",
      explanation: "Agent responds quickly to leads",
    });
  }

  // Rule 5: Average Time to Close
  if (weights.avgTimeToClose > 0) {
    rules.push({
      id: "kpi_avg_time_to_close",
      name: "Sales Cycle Speed",
      category: "performance",
      weight: weights.avgTimeToClose,
      condition: { type: "simple", field: "agentProfile.avgTimeToClose", operator: "lessThan", value: 90 },
      scoringFunction: "timeToCloseScore",
      explanation: "Agent closes deals efficiently",
    });
  }

  // Rule 6: Average Deal Size
  if (weights.avgDealSize > 0) {
    rules.push({
      id: "kpi_avg_deal_size",
      name: "Deal Size Performance",
      category: "revenue",
      weight: weights.avgDealSize,
      condition: { type: "simple", field: "agentProfile.avgDealSize", operator: "greaterThan", value: 0 },
      scoringFunction: "dealSizeScore",
      explanation: "Agent closes high-value deals",
    });
  }

  // Rule 7: Industry Match
  if (weights.industryMatch > 0) {
    rules.push({
      id: "kpi_industry_match",
      name: "Industry Expertise",
      category: "expertise",
      weight: weights.industryMatch,
      condition: { type: "simple", field: "lead.industry", operator: "notEquals", value: null },
      scoringFunction: "industryMatch",
      explanation: "Agent has experience in this industry",
    });
  }

  // Rule 8: Hot Streak / Velocity
  if (weights.hotStreak > 0) {
    rules.push({
      id: "kpi_hot_streak",
      name: "Hot Streak Momentum",
      category: "momentum",
      weight: weights.hotStreak,
      condition: { type: "simple", field: "agentProfile.hotStreakActive", operator: "equals", value: true },
      scoringFunction: "hotStreakScore",
      explanation: "Agent is on a winning streak",
    });
  }

  return rules;
}

/**
 * Validate KPI weights
 * Returns warnings if weights don't sum to 100% or if all are zero
 */
export function validateKPIWeights(weights: KPIWeights): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  const total = 
    weights.workload +
    weights.conversionHistorical +
    weights.recentPerformance +
    weights.responseTime +
    weights.avgTimeToClose +
    weights.avgDealSize +
    weights.industryMatch +
    weights.hotStreak;
  
  if (total === 0) {
    warnings.push("All KPI weights are zero. Scoring will not work.");
    return { ok: false, warnings };
  }
  
  if (Math.abs(total - 100) > 10) {
    warnings.push(`KPI weights sum to ${total}%, recommend adjusting to 100% for optimal scoring.`);
  }
  
  return { ok: true, warnings };
}

