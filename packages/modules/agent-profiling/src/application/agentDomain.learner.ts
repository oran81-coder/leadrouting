/**
 * Agent Domain Learning Engine (Phase 2)
 * 
 * Critical Module: Learns agent expertise in different industries from historical performance
 * 
 * Purpose:
 * - Track which agents excel in which industries (domains)
 * - Calculate expertise scores based on conversion rates, volume, and deal sizes
 * - Enable intelligent routing: match leads to agents with proven domain expertise
 * 
 * Why It's Important:
 * - A tech-savvy agent may excel with SaaS leads but struggle with retail
 * - Historical performance is the best predictor of future success
 * - Dynamic learning: expertise evolves as agents gain experience
 */

import { PrismaLeadFactRepo } from "../../../../../apps/api/src/infrastructure/leadFact.repo";

export interface AgentDomainProfile {
  agentUserId: string;
  agentName?: string;
  domains: Map<string, DomainExpertise>; // Industry → Expertise
  lastUpdated: Date;
}

export interface DomainExpertise {
  industry: string;
  leadsHandled: number;
  leadsConverted: number;
  conversionRate: number; // 0-1
  avgDealSize: number;
  totalRevenue: number;
  expertiseScore: number; // 0-100 (weighted combination)
  confidence: "low" | "medium" | "high"; // Based on sample size
  lastUpdated: Date;
}

/**
 * Calculate agent's domain expertise profile
 * Based on historical performance per industry
 * 
 * @param agentUserId - Monday user ID of the agent
 * @param orgId - Organization ID
 * @param minLeadsThreshold - Minimum leads to consider valid expertise (default: 5)
 * @returns Complete domain profile with expertise scores
 */
export async function calculateAgentDomainProfile(
  agentUserId: string,
  orgId: string,
  minLeadsThreshold: number = 5
): Promise<AgentDomainProfile> {
  const leadRepo = new PrismaLeadFactRepo();
  
  // Fetch all leads handled by agent
  const leads = await leadRepo.listByAgent(orgId, agentUserId);
  
  // Group by industry
  const byIndustry = new Map<string, any[]>();
  for (const lead of leads) {
    if (!lead.industry) continue; // Skip leads without industry
    if (!byIndustry.has(lead.industry)) {
      byIndustry.set(lead.industry, []);
    }
    byIndustry.get(lead.industry)!.push(lead);
  }
  
  // Calculate expertise per industry
  const domains = new Map<string, DomainExpertise>();
  
  for (const [industry, industryLeads] of byIndustry.entries()) {
    const leadsHandled = industryLeads.length;
    
    // Skip if below threshold (not enough data)
    if (leadsHandled < minLeadsThreshold) continue;
    
    // Calculate metrics
    const leadsConverted = industryLeads.filter(l => l.closedWonAt).length;
    const conversionRate = leadsHandled > 0 ? leadsConverted / leadsHandled : 0;
    
    const dealsWithAmount = industryLeads.filter(l => l.closedWonAt && l.dealAmount);
    const totalRevenue = dealsWithAmount.reduce((sum, l) => sum + (l.dealAmount || 0), 0);
    const avgDealSize = dealsWithAmount.length > 0 ? totalRevenue / dealsWithAmount.length : 0;
    
    // Calculate expertise score (0-100)
    // Weighted formula:
    // - Conversion rate: 60% (most important - can they close?)
    // - Volume: 25% (experience matters - have they done this enough?)
    // - Deal size: 15% (quality of deals)
    
    const conversionScore = conversionRate * 100;
    
    // Volume score: normalize to 50 leads = perfect score
    const volumeScore = Math.min(leadsHandled / 50, 1) * 100;
    
    // Deal size score: normalize to 100k = perfect score
    // But cap at 100 to avoid over-weighting very large deals
    const dealSizeScore = Math.min(avgDealSize / 100000, 1) * 100;
    
    const expertiseScore = 
      conversionScore * 0.60 + 
      volumeScore * 0.25 + 
      dealSizeScore * 0.15;
    
    // Confidence level based on sample size
    let confidence: "low" | "medium" | "high";
    if (leadsHandled < 10) {
      confidence = "low";
    } else if (leadsHandled < 30) {
      confidence = "medium";
    } else {
      confidence = "high";
    }
    
    domains.set(industry, {
      industry,
      leadsHandled,
      leadsConverted,
      conversionRate,
      avgDealSize,
      totalRevenue,
      expertiseScore: Math.round(expertiseScore),
      confidence,
      lastUpdated: new Date(),
    });
  }
  
  return {
    agentUserId,
    domains,
    lastUpdated: new Date(),
  };
}

/**
 * Get agent's top expertise domains (sorted by score)
 * Useful for displaying in UI or routing decisions
 * 
 * @param profile - Agent's domain profile
 * @param topN - Number of top domains to return (default: 3)
 * @returns Array of top domains sorted by expertise score
 */
export function getTopDomains(
  profile: AgentDomainProfile,
  topN: number = 3
): DomainExpertise[] {
  return Array.from(profile.domains.values())
    .sort((a, b) => b.expertiseScore - a.expertiseScore)
    .slice(0, topN);
}

/**
 * Check if agent has expertise in a specific domain
 * Returns expertise score if agent is proficient, null otherwise
 * 
 * @param profile - Agent's domain profile
 * @param industry - Industry to check
 * @param minScore - Minimum expertise score to consider (default: 50)
 * @returns Expertise score (0-100) or null if not proficient
 */
export function getDomainExpertise(
  profile: AgentDomainProfile,
  industry: string,
  minScore: number = 50
): number | null {
  const expertise = profile.domains.get(industry);
  if (!expertise) return null;
  if (expertise.expertiseScore < minScore) return null;
  return expertise.expertiseScore;
}

/**
 * Calculate best agent match for a lead based on domain expertise
 * Critical for intelligent routing
 * 
 * @param leadIndustry - Industry of the incoming lead
 * @param agentProfiles - Profiles of all available agents
 * @param minScore - Minimum expertise score to consider (default: 50)
 * @returns Array of agents sorted by expertise (best match first)
 */
export function findBestAgentsByDomain(
  leadIndustry: string,
  agentProfiles: AgentDomainProfile[],
  minScore: number = 50
): Array<{ agentUserId: string; expertiseScore: number; confidence: string }> {
  const matches: Array<{ agentUserId: string; expertiseScore: number; confidence: string }> = [];
  
  for (const profile of agentProfiles) {
    const expertise = profile.domains.get(leadIndustry);
    if (expertise && expertise.expertiseScore >= minScore) {
      matches.push({
        agentUserId: profile.agentUserId,
        expertiseScore: expertise.expertiseScore,
        confidence: expertise.confidence,
      });
    }
  }
  
  // Sort by expertise score (highest first)
  matches.sort((a, b) => b.expertiseScore - a.expertiseScore);
  
  return matches;
}

/**
 * Batch calculate domain profiles for all agents
 * Useful for system-wide updates or reporting
 * 
 * @param agentUserIds - Array of agent user IDs
 * @param orgId - Organization ID
 * @param minLeadsThreshold - Minimum leads per domain (default: 5)
 * @returns Map of agent ID to domain profile
 */
export async function calculateBulkAgentProfiles(
  agentUserIds: string[],
  orgId: string,
  minLeadsThreshold: number = 5
): Promise<Map<string, AgentDomainProfile>> {
  const profiles = new Map<string, AgentDomainProfile>();
  
  // Calculate in parallel for performance
  await Promise.all(
    agentUserIds.map(async (agentUserId) => {
      const profile = await calculateAgentDomainProfile(
        agentUserId,
        orgId,
        minLeadsThreshold
      );
      profiles.set(agentUserId, profile);
    })
  );
  
  return profiles;
}

/**
 * Get summary statistics for an agent's domain expertise
 * Useful for reporting and analytics
 */
export function getAgentDomainSummary(profile: AgentDomainProfile) {
  const domains = Array.from(profile.domains.values());
  
  return {
    agentUserId: profile.agentUserId,
    totalDomains: domains.length,
    expertDomains: domains.filter(d => d.expertiseScore >= 70).length,
    proficientDomains: domains.filter(d => d.expertiseScore >= 50 && d.expertiseScore < 70).length,
    learningDomains: domains.filter(d => d.expertiseScore < 50).length,
    topDomain: domains.length > 0 
      ? domains.reduce((max, d) => d.expertiseScore > max.expertiseScore ? d : max)
      : null,
    avgExpertiseScore: domains.length > 0
      ? Math.round(domains.reduce((sum, d) => sum + d.expertiseScore, 0) / domains.length)
      : 0,
    totalLeadsHandled: domains.reduce((sum, d) => sum + d.leadsHandled, 0),
    totalRevenue: domains.reduce((sum, d) => sum + d.totalRevenue, 0),
  };
}

