/**
 * Routing Engine - Phase 2
 * Calculates agent match scores based on 8 configurable KPIs
 * 
 * Core algorithm: Weighted sum of normalized KPI scores
 * Each KPI contributes: (KPI_score × KPI_weight) / 100
 */

import { calculateAgentDomainProfile, getDomainExpertise } from '../../../agent-profiling/src/application/agentDomain.learner';
import { calculateAgentAvailability } from '../../../monday-integration/src/application/availability.calculator';
import {
  calculateAvgTimeToClose,
  calculateRecentPerformance,
  calculateHotAgent,
  normalizeDealSize,
  normalizeResponseTime,
  normalizeTimeToClose,
  normalizeConversionRate,
  normalizeAvailability,
  normalizeHotAgent,
} from './kpi.calculators';
import { PrismaLeadFactRepo } from '../../../../../apps/api/src/infrastructure/leadFact.repo';

export interface LeadContext {
  industry: string;
  dealSize?: number;
  source?: string;
  createdAt: Date;
}

export interface KPIWeights {
  domainExpertise: number;      // 0-100
  availability: number;          // 0-100
  conversionHistorical: number;  // 0-100
  recentPerformance: number;     // 0-100
  avgDealSize: number;           // 0-100
  responseTime: number;          // 0-100
  avgTimeToClose: number;        // 0-100
  hotAgent: number;              // 0-100
}

export interface KPISettings {
  hotAgentMinDeals: number;
  hotAgentWindowDays: number;
  recentPerfWindowDays: number;
  dailyLeadThreshold: number;
  statusConfig: {
    closedWonStatuses: string[];
    closedLostStatuses?: string[];
    excludedStatuses?: string[];
  };
}

export interface AgentScore {
  agentUserId: string;
  agentName?: string;
  totalScore: number; // 0-100 (weighted sum)
  breakdown: ScoreBreakdown;
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ScoreBreakdown {
  domainExpertise: KPIScore;
  availability: KPIScore;
  conversionHistorical: KPIScore;
  recentPerformance: KPIScore;
  avgDealSize: KPIScore;
  responseTime: KPIScore;
  avgTimeToClose: KPIScore;
  hotAgent: KPIScore;
}

export interface KPIScore {
  rawScore: number;   // 0-100 (normalized)
  weight: number;     // 0-100 (%)
  points: number;     // contribution to total
  rawValue?: any;     // original value (for display)
}

/**
 * Calculate routing scores for all available agents
 * 
 * @param lead - Lead context (industry, deal size, etc.)
 * @param availableAgents - List of agent user IDs
 * @param orgId - Organization ID
 * @param weights - KPI weights configuration
 * @param settings - Additional settings (hot agent config, etc.)
 * @returns Array of agent scores, sorted by total score (highest first)
 */
export async function calculateAgentScores(
  lead: LeadContext,
  availableAgents: string[],
  orgId: string,
  weights: KPIWeights,
  settings: KPISettings
): Promise<AgentScore[]> {
  const scores: AgentScore[] = [];
  const leadRepo = new PrismaLeadFactRepo();
  
  // Calculate scores for each agent
  for (const agentUserId of availableAgents) {
    try {
      // Fetch agent historical data
      const allLeads = await leadRepo.listByAgent(orgId, agentUserId);
      const closedLeads = allLeads.filter(l => l.closedWonAt);
      
      // 1. Domain Expertise (0-100)
      const domainProfile = await calculateAgentDomainProfile(agentUserId, orgId, 5);
      const domainExpertise = getDomainExpertise(domainProfile, lead.industry, 0) || 0; // min score 0 (not 50)
      
      // 2. Availability (0-100)
      const availabilityData = await calculateAgentAvailability(
        agentUserId,
        orgId,
        settings.statusConfig,
        settings.dailyLeadThreshold
      );
      const availabilityScore = normalizeAvailability(availabilityData.score);
      
      // 3. Conversion Rate - Historical (all-time)
      const totalLeads = allLeads.length;
      const totalConverted = closedLeads.length;
      const historicalConversionRate = totalLeads > 0 ? totalConverted / totalLeads : 0;
      const conversionHistoricalScore = normalizeConversionRate(historicalConversionRate);
      
      // 4. Recent Performance (30-day conversion)
      const recentConversionRate = await calculateRecentPerformance(
        agentUserId,
        orgId,
        settings.recentPerfWindowDays
      );
      const recentPerformanceScore = normalizeConversionRate(recentConversionRate);
      
      // 5. Average Deal Size
      const dealAmounts = closedLeads
        .map(l => l.dealAmount)
        .filter((amt): amt is number => amt != null && amt > 0);
      const avgDealSize = dealAmounts.length > 0
        ? dealAmounts.reduce((sum, amt) => sum + amt, 0) / dealAmounts.length
        : 0;
      const dealSizeScore = normalizeDealSize(avgDealSize, 100000); // target: $100k
      
      // 6. Response Time (median minutes from assignment to first touch)
      const responseTimes = allLeads
        .filter(l => l.enteredAt && l.firstTouchAt)
        .map(l => {
          const diff = l.firstTouchAt!.getTime() - l.enteredAt!.getTime();
          return diff / (1000 * 60); // convert to minutes
        })
        .filter(min => min >= 0);
      
      const medianResponseTime = responseTimes.length > 0
        ? median(responseTimes)
        : 0;
      const responseTimeScore = normalizeResponseTime(medianResponseTime, 120); // target: 2 hours
      
      // 7. Average Time to Close
      const avgTimeToClose = await calculateAvgTimeToClose(agentUserId, orgId);
      const timeToCloseScore = normalizeTimeToClose(avgTimeToClose, 30); // target: 30 days
      
      // 8. Hot Agent (recent momentum)
      const hotData = await calculateHotAgent(
        agentUserId,
        orgId,
        settings.hotAgentMinDeals,
        settings.hotAgentWindowDays
      );
      const hotAgentScore = normalizeHotAgent(hotData.isHot);
      
      // Calculate weighted breakdown
      const breakdown: ScoreBreakdown = {
        domainExpertise: {
          rawScore: domainExpertise,
          weight: weights.domainExpertise,
          points: (domainExpertise * weights.domainExpertise) / 100,
          rawValue: { score: domainExpertise, industry: lead.industry },
        },
        availability: {
          rawScore: availabilityScore,
          weight: weights.availability,
          points: (availabilityScore * weights.availability) / 100,
          rawValue: availabilityData,
        },
        conversionHistorical: {
          rawScore: conversionHistoricalScore,
          weight: weights.conversionHistorical,
          points: (conversionHistoricalScore * weights.conversionHistorical) / 100,
          rawValue: { rate: historicalConversionRate, converted: totalConverted, total: totalLeads },
        },
        recentPerformance: {
          rawScore: recentPerformanceScore,
          weight: weights.recentPerformance,
          points: (recentPerformanceScore * weights.recentPerformance) / 100,
          rawValue: { rate: recentConversionRate, windowDays: settings.recentPerfWindowDays },
        },
        avgDealSize: {
          rawScore: dealSizeScore,
          weight: weights.avgDealSize,
          points: (dealSizeScore * weights.avgDealSize) / 100,
          rawValue: { amount: avgDealSize, deals: dealAmounts.length },
        },
        responseTime: {
          rawScore: responseTimeScore,
          weight: weights.responseTime,
          points: (responseTimeScore * weights.responseTime) / 100,
          rawValue: { medianMinutes: medianResponseTime, samples: responseTimes.length },
        },
        avgTimeToClose: {
          rawScore: timeToCloseScore,
          weight: weights.avgTimeToClose,
          points: (timeToCloseScore * weights.avgTimeToClose) / 100,
          rawValue: { avgDays: avgTimeToClose },
        },
        hotAgent: {
          rawScore: hotAgentScore,
          weight: weights.hotAgent,
          points: (hotAgentScore * weights.hotAgent) / 100,
          rawValue: hotData,
        },
      };
      
      // Calculate total score
      const totalScore = Object.values(breakdown).reduce((sum, kpi) => sum + kpi.points, 0);
      
      scores.push({
        agentUserId,
        totalScore: Math.round(totalScore * 10) / 10, // 1 decimal place
        breakdown,
        recommendation: getRecommendation(totalScore),
      });
    } catch (error) {
      console.error(`Error calculating score for agent ${agentUserId}:`, error);
      // Skip agent if calculation fails
      continue;
    }
  }
  
  // Sort by score (highest first)
  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Get recommendation level based on total score
 */
function getRecommendation(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Calculate median of array of numbers
 */
function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Validate that KPI weights sum to 100%
 */
export function validateWeights(weights: KPIWeights): { valid: boolean; total: number; error?: string } {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  
  if (total !== 100) {
    return {
      valid: false,
      total,
      error: `Weights must sum to 100%. Current total: ${total}%`,
    };
  }
  
  return { valid: true, total };
}

