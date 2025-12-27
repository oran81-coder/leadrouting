/**
 * Scoring Engine (Phase 1)
 * 
 * Aggregates rule evaluation results into final agent scores.
 * Handles tie-breaking, gating filters, and ranking.
 */

import { SCORE, RANK, CONFIDENCE, GATING } from "./scoring.constants";
import type { AgentProfile } from "../../../agent-profiling/src/application/agentProfiler";
import { isAgentEligible, compareAgents } from "../../../agent-profiling/src/application/agentProfiler";
import type {
  ScoringRule,
  NormalizedLead,
  AgentRuleEvaluation,
} from "../../../rule-engine/src/contracts/scoring.types";
import { evaluateRulesForAgents } from "../../../rule-engine/src/application/ruleEvaluator";

/**
 * Final agent score with ranking
 */
export interface AgentScore {
  agentUserId: string;
  agentName?: string;
  
  // Scoring
  totalScore: number;          // Sum of all rule contributions (0-100 scale)
  normalizedScore: number;     // Scaled to 0-100
  rank: number;                // 1 = best match
  
  // Rule breakdown
  ruleContributions: AgentRuleEvaluation;
  
  // Tie-breaking info
  tieBreakUsed: boolean;
  tieBreakReason?: string;
  
  // Gating
  eligible: boolean;
  ineligibleReason?: string;
}

/**
 * Complete scoring result for a lead
 */
export interface ScoringResult {
  leadId: string;
  leadName?: string;
  
  // Scores
  scores: AgentScore[];
  
  // Winner
  recommendedAgent: AgentScore | null;
  alternativeAgents: AgentScore[];  // Top 3 alternatives
  
  // Metadata
  totalAgentsEvaluated: number;
  eligibleAgents: number;
  rulesApplied: number;
  computedAt: Date;
}

/**
 * Gating filters configuration
 */
export interface GatingFilters {
  requireAvailability?: boolean;        // Default: true
  requireMinConversionRate?: number;    // Optional: 0-1
  requireMinIndustryScore?: number;     // Optional: 0-100
  excludeHighBurnout?: boolean;         // Default: false
  maxBurnoutScore?: number;             // Default: 100
}

const DEFAULT_GATING: GatingFilters = {
  requireAvailability: GATING.REQUIRE_AVAILABILITY,
  excludeHighBurnout: GATING.EXCLUDE_HIGH_BURNOUT,
  maxBurnoutScore: SCORE.MAX,
};

/**
 * Apply gating filters to agents
 * Returns only eligible agents
 */
export function applyGatingFilters(
  agents: AgentProfile[],
  lead: NormalizedLead,
  filters: GatingFilters = {}
): Array<{ agent: AgentProfile; ineligibleReason?: string }> {
  const cfg = { ...DEFAULT_GATING, ...filters };
  
  return agents.map(agent => {
    // Check basic eligibility (from agent profiling)
    const basicEligibility = isAgentEligible(agent);
    if (!basicEligibility.eligible) {
      return { agent, ineligibleReason: basicEligibility.reason };
    }
    
    // Check availability requirement
    if (cfg.requireAvailability && agent.availability <= 0) {
      return { agent, ineligibleReason: "No availability" };
    }
    
    // Check minimum conversion rate
    if (cfg.requireMinConversionRate !== undefined) {
      if (agent.conversionRate === null || agent.conversionRate < cfg.requireMinConversionRate) {
        return { agent, ineligibleReason: `Conversion rate below minimum (${cfg.requireMinConversionRate})` };
      }
    }
    
    // Check industry expertise
    if (cfg.requireMinIndustryScore !== undefined && lead.industry) {
      const industryScore = agent.industryScores[lead.industry];
      if (!industryScore || industryScore < cfg.requireMinIndustryScore) {
        return { agent, ineligibleReason: `Industry expertise below minimum for ${lead.industry}` };
      }
    }
    
    // Check burnout
    if (cfg.excludeHighBurnout && agent.burnoutScore > (cfg.maxBurnoutScore ?? 90)) {
      return { agent, ineligibleReason: `High burnout score (${agent.burnoutScore})` };
    }
    
    // Agent passed all filters
    return { agent };
  });
}

/**
 * Normalize scores to 0-100 scale
 */
function normalizeScores(scores: number[]): number[] {
  if (scores.length === 0) return [];
  
  const maxScore = Math.max(...scores);
  if (maxScore === 0) return scores.map(() => 0);
  
  return scores.map(score => (score / maxScore) * SCORE.MAX);
}

/**
 * Handle tie-breaking when scores are equal
 */
function resolveTie(
  score1: AgentScore,
  score2: AgentScore,
  agents: Map<string, AgentProfile>
): number {
  const agent1 = agents.get(score1.agentUserId);
  const agent2 = agents.get(score2.agentUserId);
  
  if (!agent1 || !agent2) return 0;
  
  const comparison = compareAgents(agent1, agent2);
  
  if (comparison !== 0) {
    // Record tie-break reason
    const winner = comparison < 0 ? score1 : score2;
    winner.tieBreakUsed = true;
    
    if (agent1.availability !== agent2.availability) {
      winner.tieBreakReason = "Higher availability";
    } else if (agent1.currentActiveLeads !== agent2.currentActiveLeads) {
      winner.tieBreakReason = "Lower workload";
    } else if (agent1.conversionRate !== agent2.conversionRate) {
      winner.tieBreakReason = "Better conversion rate";
    } else if (agent1.hotStreakActive !== agent2.hotStreakActive) {
      winner.tieBreakReason = "Hot streak active";
    }
  }
  
  return comparison;
}

/**
 * Compute final agent scores
 */
export function computeScores(
  lead: NormalizedLead,
  agents: AgentProfile[],
  rules: ScoringRule[],
  gatingFilters?: GatingFilters
): ScoringResult {
  const startTime = Date.now();
  
  // Apply gating filters
  const filtered = applyGatingFilters(agents, lead, gatingFilters);
  const eligibleAgents = filtered.filter(f => !f.ineligibleReason).map(f => f.agent);
  const ineligibleAgents = filtered.filter(f => f.ineligibleReason);
  
  // Evaluate rules for eligible agents
  const evaluations = evaluateRulesForAgents(lead, eligibleAgents, rules);
  
  // Create agent map for tie-breaking
  const agentMap = new Map(agents.map(a => [a.agentUserId, a]));
  
  // Build scores
  let scores: AgentScore[] = evaluations.map(agentEval => ({
    agentUserId: agentEval.agentUserId,
    agentName: agentMap.get(agentEval.agentUserId)?.agentName,
    totalScore: agentEval.totalContribution,
    normalizedScore: 0, // Will be calculated after
    rank: 0,            // Will be assigned after sorting
    ruleContributions: agentEval,
    tieBreakUsed: false,
    eligible: true,
  }));
  
  // Add ineligible agents (score = 0)
  scores = scores.concat(
    ineligibleAgents.map(({ agent, ineligibleReason }) => ({
      agentUserId: agent.agentUserId,
      agentName: agent.agentName,
      totalScore: 0,
      normalizedScore: 0,
      rank: RANK.INELIGIBLE,
      ruleContributions: {
        agentUserId: agent.agentUserId,
        results: [],
        totalContribution: 0,
        rulesApplied: 0,
        rulesSkipped: rules.length,
      },
      tieBreakUsed: false,
      eligible: false,
      ineligibleReason,
    }))
  );
  
  // Normalize scores
  const rawScores = scores.filter(s => s.eligible).map(s => s.totalScore);
  const normalizedValues = normalizeScores(rawScores);
  let normalizedIndex = 0;
  for (const score of scores) {
    if (score.eligible) {
      score.normalizedScore = normalizedValues[normalizedIndex++];
    }
  }
  
  // Sort by score (with tie-breaking)
  scores.sort((a, b) => {
    // Ineligible agents always last
    if (!a.eligible && b.eligible) return 1;
    if (a.eligible && !b.eligible) return -1;
    if (!a.eligible && !b.eligible) return 0;
    
    // Compare normalized scores
    if (Math.abs(a.normalizedScore - b.normalizedScore) > SCORE.EPSILON) {
      return b.normalizedScore - a.normalizedScore;
    }
    
    // Tie-breaking
    return resolveTie(a, b, agentMap);
  });
  
  // Assign ranks
  scores.forEach((score, index) => {
    score.rank = index + 1;
  });
  
  // Determine recommended agent (rank 1)
  const recommendedAgent = scores.length > 0 && scores[0].eligible ? scores[0] : null;
  
  // Get alternatives (ranks 2-4)
  const alternativeAgents = scores
    .filter((s, i) => i > 0 && i <= RANK.MAX_ALTERNATIVES && s.eligible)
    .slice(0, RANK.MAX_ALTERNATIVES);
  
  // Count rules applied
  const rulesApplied = recommendedAgent
    ? recommendedAgent.ruleContributions.rulesApplied
    : 0;
  
  console.log(`[ScoringEngine] Computed scores in ${Date.now() - startTime}ms`);
  
  return {
    leadId: lead.leadId,
    leadName: lead.leadName,
    scores,
    recommendedAgent,
    alternativeAgents,
    totalAgentsEvaluated: agents.length,
    eligibleAgents: eligibleAgents.length,
    rulesApplied,
    computedAt: new Date(),
  };
}

/**
 * Get score summary for UI display
 */
export function getScoreSummary(score: AgentScore): {
  score: string;
  rank: string;
  topRules: string[];
  confidence: "high" | "medium" | "low";
} {
  const topRules = score.ruleContributions.results
    .filter(r => r.applied)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(r => `${r.ruleName}: ${r.contribution.toFixed(1)}pts`);
  
  let confidence: "high" | "medium" | "low" = "medium";
  if (score.normalizedScore >= CONFIDENCE.HIGH_THRESHOLD) confidence = "high";
  if (score.normalizedScore < CONFIDENCE.MEDIUM_THRESHOLD) confidence = "low";
  
  return {
    score: `${score.normalizedScore.toFixed(1)}/100`,
    rank: `#${score.rank}`,
    topRules,
    confidence,
  };
}

/**
 * Random fallback when no eligible agents
 * Used in auto-assign mode only
 */
export function selectRandomFallback(agents: AgentProfile[]): AgentScore | null {
  if (agents.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * agents.length);
  const agent = agents[randomIndex];
  
  return {
    agentUserId: agent.agentUserId,
    agentName: agent.agentName,
    totalScore: 0,
    normalizedScore: 0,
    rank: 1,
    ruleContributions: {
      agentUserId: agent.agentUserId,
      results: [],
      totalContribution: 0,
      rulesApplied: 0,
      rulesSkipped: 0,
    },
    tieBreakUsed: false,
    eligible: true,
    ineligibleReason: undefined,
  };
}

