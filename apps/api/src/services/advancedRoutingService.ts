/**
 * Advanced Routing Service
 * 
 * Bridges the gap between old RoutingRules and new Scoring Engine.
 * Uses Scoring Engine + Explainability when agent profiles are available,
 * otherwise falls back to simple rule matching.
 */

import { createModuleLogger } from "../infrastructure/logger";
import type { ScoringResult } from "../../../../packages/modules/scoring/src/application/scoring.engine";
import type { RoutingExplanation } from "../../../../packages/modules/explainability/src/application/explainer";
import type { AgentProfile } from "../../../../packages/modules/agent-profiling/src/application/agentProfiler";
import type { NormalizedLead, ScoringRule } from "../../../../packages/modules/rule-engine/src/contracts/scoring.types";

import { computeScores } from "../../../../packages/modules/scoring/src/application/scoring.engine";
import { generateRoutingExplanation } from "../../../../packages/modules/explainability/src/application/explainer";
import { convertKPIWeightsToRules, extractKPIWeightsFromMetricsConfig } from "../../../../packages/modules/scoring/src/application/kpiWeightsToRules";
import { evaluateRuleSet } from "../../../../packages/modules/rule-engine/src/application/rules.evaluate";

import { PrismaAgentAvailabilityRepo } from "../infrastructure/agentAvailability.repo";
import { PrismaCapacitySettingsRepo } from "../infrastructure/capacitySettings.repo";
import { CapacityCalculatorService } from "./capacityCalculator.service";

// Create module-specific logger
const logger = createModuleLogger('AdvancedRouting');

/**
 * Enhanced routing result that includes both old and new formats
 */
export interface EnhancedRoutingResult {
  // New format (Scoring Engine)
  useScoringEngine: boolean;
  scoringResult?: ScoringResult;
  explanation?: RoutingExplanation;
  
  // Old format (for backwards compatibility)
  matched: boolean;
  selectedRule?: {
    id: string;
    name: string;
    priority: number;
    action: { type: string; value: string };
  };
  explains: any;  // Old explanation format
  
  // Recommended assignment
  recommendedAgent?: {
    agentUserId: string;
    agentName?: string;
    score: number;
    confidence: string;
  };
  
  // Alternative agents
  alternatives?: Array<{
    rank: number;
    agentUserId: string;
    agentName?: string;
    score: number;
    scoreDifference: number;
  }>;
}

/**
 * Convert normalized lead values to NormalizedLead format
 */
function convertToNormalizedLead(
  values: Record<string, any>,
  itemId?: string,
  itemName?: string
): NormalizedLead {
  return {
    leadId: itemId || `lead_${Date.now()}`,
    leadName: itemName || values.name || undefined,
    industry: values.industry || undefined,
    dealSize: values.dealSize ? Number(values.dealSize) : undefined,
    source: values.source || undefined,
    createdAt: values.createdAt ? new Date(values.createdAt) : undefined,
    ...values, // Include all other fields
  };
}

/**
 * Execute routing with Scoring Engine (new approach)
 */
async function executeWithScoringEngine(
  orgId: string,
  lead: NormalizedLead,
  agentProfiles: AgentProfile[],
  kpiWeights: any
): Promise<{ scoringResult: ScoringResult; explanation: RoutingExplanation; warnings: string[] }> {
  const warnings: string[] = [];
  
  // 1. Get availability settings
  const availabilityRepo = new PrismaAgentAvailabilityRepo();
  const availabilityMap = new Map<string, boolean>();
  
  for (const agent of agentProfiles) {
    const isAvailable = await availabilityRepo.isAgentAvailable(orgId, agent.agentUserId);
    availabilityMap.set(agent.agentUserId, isAvailable);
  }
  
  // 2. Get capacity settings and calculate current capacity
  const capacityRepo = new PrismaCapacitySettingsRepo();
  const capacityCalculator = new CapacityCalculatorService();
  const capacitySettings = await capacityRepo.getOrCreateDefaults(orgId);
  
  const agentUserIds = agentProfiles.map(a => a.agentUserId);
  const capacityMap = await capacityCalculator.calculateAllAgentsCapacity(
    orgId,
    agentUserIds,
    {
      dailyLimit: capacitySettings.dailyLimit,
      weeklyLimit: capacitySettings.weeklyLimit,
      monthlyLimit: capacitySettings.monthlyLimit
    }
  );
  
  // 3. Filter out excluded and over-capacity agents
  const eligibleProfiles = agentProfiles.filter(agent => {
    const isAvailable = availabilityMap.get(agent.agentUserId);
    const capacityStatus = capacityMap.get(agent.agentUserId);
    
    if (!isAvailable) {
      logger.info(`Agent ${agent.agentUserId} excluded - not available`);
      return false;
    }
    
    if (capacityStatus?.hasCapacityIssue) {
      const warning = capacityCalculator.getCapacityWarning(capacityStatus, {
        dailyLimit: capacitySettings.dailyLimit,
        weeklyLimit: capacitySettings.weeklyLimit,
        monthlyLimit: capacitySettings.monthlyLimit
      });
      
      logger.warn(`Agent ${agent.agentUserId} has capacity issue: ${warning}`);
      warnings.push(`Agent ${agent.agentName || agent.agentUserId}: ${warning}`);
      
      // Agent still included but marked with warning
      // They will appear in results but with capacity warning
    }
    
    return true;
  });
  
  if (eligibleProfiles.length === 0) {
    logger.error('No eligible agents after availability/capacity filtering');
    throw new Error('No agents available for routing');
  }
  
  logger.info('Agent eligibility check', {
    total: agentProfiles.length,
    eligible: eligibleProfiles.length,
    excluded: agentProfiles.length - eligibleProfiles.length,
    warnings: warnings.length
  });
  
  // Convert KPI weights to ScoringRules
  const scoringRules = convertKPIWeightsToRules(kpiWeights, lead);
  
  logger.info('Using Scoring Engine', {
    rulesCount: scoringRules.length,
    agentsCount: eligibleProfiles.length,
    leadId: lead.leadId,
  });
  
  // Compute scores for eligible agents only
  const scoringResult = computeScores(lead, eligibleProfiles, scoringRules);
  
  // Add capacity warnings to result
  if (scoringResult.recommendedAgent) {
    const capacityStatus = capacityMap.get(scoringResult.recommendedAgent.agentUserId);
    if (capacityStatus?.hasCapacityIssue) {
      const warning = capacityCalculator.getCapacityWarning(capacityStatus, {
        dailyLimit: capacitySettings.dailyLimit,
        weeklyLimit: capacitySettings.weeklyLimit,
        monthlyLimit: capacitySettings.monthlyLimit
      });
      warnings.unshift(`⚠️ Recommended agent: ${warning}`);
    }
  }
  
  // Build agent profiles map for explainability
  const agentProfilesMap = new Map(eligibleProfiles.map(a => [a.agentUserId, a]));
  
  // Generate explanation
  const explanation = generateRoutingExplanation(
    lead,
    scoringResult,
    agentProfilesMap,
    "scored"
  );
  
  // Add warnings to explanation
  if (warnings.length > 0) {
    explanation.warnings = [...(explanation.warnings || []), ...warnings];
  }
  
  return { scoringResult, explanation, warnings };
}

/**
 * Execute routing with old rule engine (fallback)
 */
function executeWithRuleEngine(normalizedValues: Record<string, any>, rules: any): any {
  logger.info('Using legacy Rule Engine (fallback)');
  return evaluateRuleSet(normalizedValues, rules);
}

/**
 * Main routing execution function
 * Decides whether to use Scoring Engine or fallback to old rules
 */
export async function executeAdvancedRouting(
  orgId: string,
  normalizedValues: Record<string, any>,
  itemId: string | null,
  itemName: string | null,
  agentProfiles: AgentProfile[],
  metricsConfig: any,
  legacyRules: any
): Promise<EnhancedRoutingResult> {
  // Decision: Use Scoring Engine if we have agent profiles
  const useScoringEngine = agentProfiles && agentProfiles.length > 0;
  
  // Log warning if no agent profiles found
  if (!useScoringEngine) {
    logger.warn('No agent profiles found - falling back to legacy rule engine', {
      recommendedAction: 'Run POST /agents/profiles/recompute',
    });
  }
  
  if (useScoringEngine) {
    try {
      // Extract KPI weights from metrics config
      const kpiWeights = extractKPIWeightsFromMetricsConfig(metricsConfig);
      
      // Convert to NormalizedLead
      const lead = convertToNormalizedLead(normalizedValues, itemId || undefined, itemName || undefined);
      
      // Execute with Scoring Engine
      const { scoringResult, explanation, warnings } = await executeWithScoringEngine(
        orgId,
        lead,
        agentProfiles,
        kpiWeights
      );
      
      // Build result in both formats
      const result: EnhancedRoutingResult = {
        useScoringEngine: true,
        scoringResult,
        explanation,
        
        // New format
        recommendedAgent: scoringResult.recommendedAgent ? {
          agentUserId: scoringResult.recommendedAgent.agentUserId,
          agentName: scoringResult.recommendedAgent.agentName,
          score: Math.round(scoringResult.recommendedAgent.normalizedScore),
          confidence: explanation.recommendedAgent?.confidence || "medium",
        } : undefined,
        
        alternatives: explanation.alternatives.map(alt => ({
          rank: alt.rank,
          agentUserId: alt.agentUserId,
          agentName: alt.agentName,
          score: alt.score,
          scoreDifference: alt.scoreDifference,
        })),
        
        // Old format (for backwards compatibility)
        matched: !!scoringResult.recommendedAgent,
        selectedRule: scoringResult.recommendedAgent ? {
          id: "scoring_engine",
          name: "Scoring Engine Match",
          priority: 1,
          action: {
            type: "assign_agent_id",
            value: scoringResult.recommendedAgent.agentUserId,
          },
        } : undefined,
        explains: {
          explanation: explanation.summary,
          topAgent: explanation.recommendedAgent,
          alternatives: explanation.alternatives,
          breakdown: explanation.breakdown,
          totalAgentsEvaluated: explanation.totalAgentsEvaluated,
          eligibleAgents: explanation.eligibleAgents,
          warnings, // Add warnings here
        },
      };
      
      return result;
      
    } catch (error: any) {
      logger.error('Scoring Engine failed - falling back to legacy', {
        error: error.message,
        stack: error.stack,
      });
      // Fall through to legacy mode
    }
  }
  
  // Fallback: Use legacy rule engine
  const legacyResult = executeWithRuleEngine(normalizedValues, legacyRules);
  
  return {
    useScoringEngine: false,
    matched: legacyResult.matched,
    selectedRule: legacyResult.selectedRule,
    explains: legacyResult.explains,
  };
}

/**
 * Format explainability for storage in database
 * Converts RoutingExplanation to JSON-serializable format
 */
export function formatExplainabilityForStorage(explanation?: RoutingExplanation): any {
  if (!explanation) return null;
  
  return {
    summary: explanation.summary,
    topAgent: explanation.recommendedAgent,
    leadSummary: explanation.leadSummary,
    breakdown: {
      primaryReasons: explanation.breakdown.primaryReasons,
      secondaryFactors: explanation.breakdown.secondaryFactors,
      gatingSummary: explanation.breakdown.gatingSummary,
    },
    alternatives: explanation.alternatives,
    totalAgentsEvaluated: explanation.totalAgentsEvaluated,
    eligibleAgents: explanation.eligibleAgents,
    decisionMode: explanation.decisionMode,
    warnings: explanation.warnings,
  };
}

