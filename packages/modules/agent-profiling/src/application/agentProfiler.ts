/**
 * Agent Profiling Engine (Phase 1)
 * 
 * Computes comprehensive agent performance metrics from normalized Monday data.
 * All calculations are deterministic and explainable.
 * 
 * Metrics Calculated:
 * 1. Conversion Rate - Historical success closing deals
 * 2. Avg Deal Size - Revenue potential
 * 3. Response Time - Speed to first contact
 * 4. Availability - Current capacity
 * 5. Hot Streak - Recent momentum
 * 6. Burnout Score - Time since last activity
 * 7. Industry Performance - Domain expertise per industry
 */

import { PrismaLeadFactRepo } from "../../../../../apps/api/src/infrastructure/leadFact.repo";
import { calculateAgentDomainProfile, type AgentDomainProfile } from "./agentDomain.learner";

export interface AgentProfile {
  agentUserId: string;
  agentName?: string;
  orgId: string;
  
  // Performance Metrics
  conversionRate: number | null; // 0-1 scale
  totalLeadsHandled: number;
  totalLeadsConverted: number;
  
  // Revenue Metrics
  avgDealSize: number | null; // USD
  totalRevenue: number;
  
  // Speed Metrics
  avgResponseTime: number | null; // Seconds to first contact
  
  // Capacity Metrics
  availability: number; // 0-1 scale (1 = fully available)
  currentActiveLeads: number;
  dailyLeadsToday: number;
  
  // Momentum Metrics
  hotStreakCount: number; // Deals closed in last N hours
  hotStreakActive: boolean;
  
  // Burnout Indicators
  burnoutScore: number; // 0-100 (0 = fresh, 100 = burned out)
  timeSinceLastWin: number | null; // Milliseconds
  timeSinceLastActivity: number | null; // Milliseconds
  
  // Domain Expertise
  industryScores: Record<string, number>; // Industry → 0-100 score
  domainProfile: AgentDomainProfile | null;
  
  // Metadata
  computedAt: Date;
  dataWindowDays: number; // Time window used for calculations
}

export interface AgentProfilerConfig {
  // Time windows
  conversionWindowDays: number; // Default: 90
  avgDealWindowDays: number; // Default: 90
  responseWindowDays: number; // Default: 30
  
  // Hot streak settings
  hotStreakWindowHours: number; // Default: 168 (7 days)
  hotStreakMinDeals: number; // Default: 3
  
  // Burnout settings
  burnoutWinDecayHours: number; // Default: 336 (14 days)
  burnoutActivityDecayHours: number; // Default: 168 (7 days)
  
  // Availability settings
  dailyLeadThreshold: number; // Default: 20
  
  // Domain expertise
  minLeadsForDomain: number; // Default: 5
}

const DEFAULT_CONFIG: AgentProfilerConfig = {
  conversionWindowDays: 90,
  avgDealWindowDays: 90,
  responseWindowDays: 30,
  hotStreakWindowHours: 168,
  hotStreakMinDeals: 3,
  burnoutWinDecayHours: 336,
  burnoutActivityDecayHours: 168,
  dailyLeadThreshold: 20,
  minLeadsForDomain: 5,
};

/**
 * Calculate complete agent profile
 * 
 * @param agentUserId - Monday user ID of the agent
 * @param orgId - Organization ID
 * @param config - Configuration for time windows and thresholds
 * @returns Complete agent profile with all metrics
 */
export async function calculateAgentProfile(
  agentUserId: string,
  orgId: string,
  config: Partial<AgentProfilerConfig> = {}
): Promise<AgentProfile> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const leadRepo = new PrismaLeadFactRepo();
  const now = new Date();
  
  // Time windows
  const conversionSince = new Date(now.getTime() - cfg.conversionWindowDays * 24 * 60 * 60 * 1000);
  const dealSizeSince = new Date(now.getTime() - cfg.avgDealWindowDays * 24 * 60 * 60 * 1000);
  const responseSince = new Date(now.getTime() - cfg.responseWindowDays * 24 * 60 * 60 * 1000);
  const hotStreakSince = new Date(now.getTime() - cfg.hotStreakWindowHours * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Fetch all leads for agent in relevant windows
  const allLeads = await leadRepo.listByAgent(orgId, agentUserId);
  
  // 1. CONVERSION RATE
  const leadsInConversionWindow = allLeads.filter(
    l => l.enteredAt && new Date(l.enteredAt) >= conversionSince
  );
  const totalLeadsHandled = leadsInConversionWindow.length;
  const totalLeadsConverted = leadsInConversionWindow.filter(l => l.closedWonAt).length;
  const conversionRate = totalLeadsHandled > 0 ? totalLeadsConverted / totalLeadsHandled : null;
  
  // 2. AVG DEAL SIZE
  const dealsInWindow = allLeads.filter(
    l => l.closedWonAt && new Date(l.closedWonAt) >= dealSizeSince && l.dealAmount
  );
  const totalRevenue = dealsInWindow.reduce((sum, l) => sum + (l.dealAmount || 0), 0);
  const avgDealSize = dealsInWindow.length > 0 ? totalRevenue / dealsInWindow.length : null;
  
  // 3. RESPONSE TIME
  const leadsWithResponse = allLeads.filter(
    l => l.enteredAt && l.firstTouchAt && 
         new Date(l.enteredAt) >= responseSince
  );
  let avgResponseTime: number | null = null;
  if (leadsWithResponse.length > 0) {
    const totalResponseMs = leadsWithResponse.reduce((sum, l) => {
      const entered = new Date(l.enteredAt!).getTime();
      const touched = new Date(l.firstTouchAt!).getTime();
      return sum + (touched - entered);
    }, 0);
    avgResponseTime = totalResponseMs / leadsWithResponse.length / 1000; // Convert to seconds
  }
  
  // 4. AVAILABILITY (current active leads / threshold)
  const activeLeads = await leadRepo.countActiveLeadsByAgent(
    orgId,
    agentUserId,
    ["Closed Won", "Deal Made", "Sale Completed"], // These should come from status config
    ["Closed Lost", "Rejected"],
    ["Spam", "Archived", "Test"]
  );
  const currentActiveLeads = activeLeads;
  const availability = Math.max(0, 1 - (currentActiveLeads / cfg.dailyLeadThreshold));
  
  // 5. DAILY QUOTA
  const dailyLeadsToday = await leadRepo.countByAgentSince(orgId, agentUserId, todayStart);
  
  // 6. HOT STREAK
  const recentWins = allLeads.filter(
    l => l.closedWonAt && new Date(l.closedWonAt) >= hotStreakSince
  );
  const hotStreakCount = recentWins.length;
  const hotStreakActive = hotStreakCount >= cfg.hotStreakMinDeals;
  
  // 7. BURNOUT SCORE
  let burnoutScore = 0;
  let timeSinceLastWin: number | null = null;
  let timeSinceLastActivity: number | null = null;
  
  // Find most recent win
  const winsWithDates = allLeads
    .filter(l => l.closedWonAt)
    .sort((a, b) => new Date(b.closedWonAt!).getTime() - new Date(a.closedWonAt!).getTime());
  
  if (winsWithDates.length > 0) {
    timeSinceLastWin = now.getTime() - new Date(winsWithDates[0].closedWonAt!).getTime();
    const hoursSinceWin = timeSinceLastWin / (1000 * 60 * 60);
    const winBurnout = Math.min(100, (hoursSinceWin / cfg.burnoutWinDecayHours) * 100);
    burnoutScore += winBurnout * 0.6; // 60% weight
  } else {
    burnoutScore += 60; // No wins = moderate burnout contribution
  }
  
  // Find most recent activity (any lead touched)
  const activitiesWithDates = allLeads
    .filter(l => l.firstTouchAt || l.updatedAt)
    .sort((a, b) => {
      const aTime = a.firstTouchAt ? new Date(a.firstTouchAt) : new Date(a.updatedAt);
      const bTime = b.firstTouchAt ? new Date(b.firstTouchAt) : new Date(b.updatedAt);
      return bTime.getTime() - aTime.getTime();
    });
  
  if (activitiesWithDates.length > 0) {
    const lastActivity = activitiesWithDates[0].firstTouchAt || activitiesWithDates[0].updatedAt;
    timeSinceLastActivity = now.getTime() - new Date(lastActivity).getTime();
    const hoursSinceActivity = timeSinceLastActivity / (1000 * 60 * 60);
    const activityBurnout = Math.min(100, (hoursSinceActivity / cfg.burnoutActivityDecayHours) * 100);
    burnoutScore += activityBurnout * 0.4; // 40% weight
  } else {
    burnoutScore += 40; // No activity = moderate burnout contribution
  }
  
  burnoutScore = Math.min(100, Math.round(burnoutScore));
  
  // 8. DOMAIN EXPERTISE
  const domainProfile = await calculateAgentDomainProfile(
    agentUserId,
    orgId,
    cfg.minLeadsForDomain
  );
  
  const industryScores: Record<string, number> = {};
  for (const [industry, expertise] of domainProfile.domains.entries()) {
    industryScores[industry] = expertise.expertiseScore;
  }
  
  return {
    agentUserId,
    orgId,
    
    // Performance
    conversionRate,
    totalLeadsHandled,
    totalLeadsConverted,
    
    // Revenue
    avgDealSize,
    totalRevenue,
    
    // Speed
    avgResponseTime,
    
    // Capacity
    availability,
    currentActiveLeads,
    dailyLeadsToday,
    
    // Momentum
    hotStreakCount,
    hotStreakActive,
    
    // Burnout
    burnoutScore,
    timeSinceLastWin,
    timeSinceLastActivity,
    
    // Domain
    industryScores,
    domainProfile,
    
    // Metadata
    computedAt: now,
    dataWindowDays: cfg.conversionWindowDays,
  };
}

/**
 * Calculate profiles for all agents in bulk
 * Useful for system-wide updates
 * 
 * @param orgId - Organization ID
 * @param config - Configuration for time windows
 * @returns Array of all agent profiles
 */
export async function calculateAllAgentProfiles(
  orgId: string,
  config: Partial<AgentProfilerConfig> = {}
): Promise<AgentProfile[]> {
  const leadRepo = new PrismaLeadFactRepo();
  
  // Get all unique agent user IDs
  const agentUserIds = await leadRepo.listAgentsWithFacts();
  
  // Calculate profiles in parallel
  const profiles = await Promise.all(
    agentUserIds.map(agentUserId => 
      calculateAgentProfile(agentUserId, orgId, config)
    )
  );
  
  return profiles;
}

/**
 * Get agent profile summary for quick display
 * Useful for UI cards and tooltips
 */
export function getProfileSummary(profile: AgentProfile) {
  return {
    agentUserId: profile.agentUserId,
    conversionRate: profile.conversionRate ? `${(profile.conversionRate * 100).toFixed(1)}%` : 'N/A',
    avgDealSize: profile.avgDealSize ? `$${profile.avgDealSize.toLocaleString()}` : 'N/A',
    availability: `${(profile.availability * 100).toFixed(0)}%`,
    currentLoad: `${profile.currentActiveLeads} leads`,
    hotStreak: profile.hotStreakActive ? `🔥 ${profile.hotStreakCount} wins` : 'Normal',
    topIndustries: Object.entries(profile.industryScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([industry, score]) => `${industry} (${score})`),
  };
}

/**
 * Check if agent is eligible for new assignments
 * Gating filter used before routing
 */
export function isAgentEligible(profile: AgentProfile, config: Partial<AgentProfilerConfig> = {}): {
  eligible: boolean;
  reason?: string;
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Check availability
  if (profile.availability <= 0) {
    return { eligible: false, reason: 'Agent at capacity' };
  }
  
  // Check daily quota
  if (profile.dailyLeadsToday >= cfg.dailyLeadThreshold) {
    return { eligible: false, reason: 'Daily lead threshold reached' };
  }
  
  // Check burnout (optional - could be soft filter)
  if (profile.burnoutScore > 90) {
    // Don't hard block, but this could be used in scoring
    // return { eligible: false, reason: 'High burnout indicator' };
  }
  
  return { eligible: true };
}

/**
 * Compare two agents and determine which is better match
 * Used for tie-breaking in scoring
 */
export function compareAgents(a: AgentProfile, b: AgentProfile): number {
  // 1. Higher availability wins
  if (a.availability !== b.availability) {
    return b.availability - a.availability;
  }
  
  // 2. Lower workload wins
  if (a.currentActiveLeads !== b.currentActiveLeads) {
    return a.currentActiveLeads - b.currentActiveLeads;
  }
  
  // 3. Better conversion rate wins
  if (a.conversionRate !== null && b.conversionRate !== null) {
    if (a.conversionRate !== b.conversionRate) {
      return b.conversionRate - a.conversionRate;
    }
  }
  
  // 4. Hot streak wins
  if (a.hotStreakActive !== b.hotStreakActive) {
    return a.hotStreakActive ? -1 : 1;
  }
  
  // 5. Random (caller should handle this)
  return 0;
}

