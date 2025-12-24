/**
 * KPI Calculators - Phase 2
 * Individual calculation functions for each routing KPI
 */

import { PrismaLeadFactRepo } from "../../../../../apps/api/src/infrastructure/leadFact.repo";

/**
 * Calculate Average Time to Close for an agent
 * Measures sales cycle efficiency
 * 
 * @param agentUserId - Monday user ID of the agent
 * @param orgId - Organization ID
 * @returns Average days to close (0 if no closed deals)
 */
export async function calculateAvgTimeToClose(
  agentUserId: string,
  orgId: string
): Promise<number> {
  const leadRepo = new PrismaLeadFactRepo();
  const leads = await leadRepo.listByAgent(orgId, agentUserId);
  
  const closedLeads = leads.filter(l => l.closedWonAt && l.enteredAt);
  if (closedLeads.length === 0) return 0;
  
  const durations = closedLeads.map(l => {
    const milliseconds = l.closedWonAt!.getTime() - l.enteredAt!.getTime();
    const days = milliseconds / (1000 * 60 * 60 * 24);
    return days;
  });
  
  const avgDays = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  return Math.round(avgDays * 10) / 10; // 1 decimal place
}

/**
 * Calculate Recent Performance (conversion rate in recent window)
 * 
 * @param agentUserId - Monday user ID
 * @param orgId - Organization ID
 * @param windowDays - Time window in days (default: 30)
 * @returns Conversion rate (0-1)
 */
export async function calculateRecentPerformance(
  agentUserId: string,
  orgId: string,
  windowDays: number = 30
): Promise<number> {
  const leadRepo = new PrismaLeadFactRepo();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  
  const leads = await leadRepo.listByAgent(orgId, agentUserId);
  const recentLeads = leads.filter(l => l.enteredAt && l.enteredAt >= since);
  
  if (recentLeads.length === 0) return 0;
  
  const converted = recentLeads.filter(l => l.closedWonAt).length;
  return converted / recentLeads.length;
}

/**
 * Check if agent is "Hot" (has closed multiple deals recently)
 * 
 * @param agentUserId - Monday user ID
 * @param orgId - Organization ID
 * @param minDeals - Minimum deals to be considered hot
 * @param windowDays - Time window in days
 * @returns Boolean + deal count
 */
export async function calculateHotAgent(
  agentUserId: string,
  orgId: string,
  minDeals: number = 3,
  windowDays: number = 7
): Promise<{ isHot: boolean; dealsCount: number }> {
  const leadRepo = new PrismaLeadFactRepo();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  
  const leads = await leadRepo.listByAgent(orgId, agentUserId);
  const recentDeals = leads.filter(l => l.closedWonAt && l.closedWonAt >= since);
  
  return {
    isHot: recentDeals.length >= minDeals,
    dealsCount: recentDeals.length,
  };
}

// ============================================
// Normalization Functions (convert to 0-100 scores)
// ============================================

/**
 * Normalize Deal Size to 0-100 score
 * Higher deal size = higher score
 * 
 * @param actual - Actual average deal size
 * @param target - Target deal size (100% score)
 * @returns Score 0-100
 */
export function normalizeDealSize(actual: number, target: number = 100000): number {
  if (actual <= 0) return 0;
  if (actual >= target) return 100;
  return Math.round((actual / target) * 100);
}

/**
 * Normalize Response Time to 0-100 score
 * LOWER response time = HIGHER score (faster is better)
 * 
 * @param actualMinutes - Actual median response time in minutes
 * @param targetMinutes - Target response time (100% score) - default 120 (2 hours)
 * @returns Score 0-100
 */
export function normalizeResponseTime(actualMinutes: number, targetMinutes: number = 120): number {
  if (actualMinutes <= 0) return 0; // No data
  if (actualMinutes <= targetMinutes) return 100; // Met or exceeded target
  if (actualMinutes >= targetMinutes * 3) return 0; // 3x target = 0 score
  
  // Linear decay from target to 3x target
  const decay = ((actualMinutes - targetMinutes) / (targetMinutes * 2)) * 100;
  return Math.round(100 - decay);
}

/**
 * Normalize Time to Close to 0-100 score
 * LOWER time = HIGHER score (faster closing is better)
 * 
 * @param actualDays - Actual average days to close
 * @param targetDays - Target days to close (100% score) - default 30
 * @returns Score 0-100
 */
export function normalizeTimeToClose(actualDays: number, targetDays: number = 30): number {
  if (actualDays <= 0) return 0; // No data
  if (actualDays <= targetDays) return 100; // Met or exceeded target
  if (actualDays >= targetDays * 3) return 0; // 3x target = 0 score
  
  // Linear decay from target to 3x target
  const decay = ((actualDays - targetDays) / (targetDays * 2)) * 100;
  return Math.round(100 - decay);
}

/**
 * Normalize Conversion Rate to 0-100 score
 * Direct conversion: 0.0-1.0 → 0-100
 * 
 * @param conversionRate - Conversion rate (0-1)
 * @returns Score 0-100
 */
export function normalizeConversionRate(conversionRate: number): number {
  return Math.round(conversionRate * 100);
}

/**
 * Normalize Availability to 0-100 score
 * Already in 0-100 format from availability.calculator
 * 
 * @param availabilityScore - Availability score (0-100)
 * @returns Score 0-100
 */
export function normalizeAvailability(availabilityScore: number): number {
  return Math.round(availabilityScore);
}

/**
 * Normalize Hot Agent to 0-100 score
 * Binary: hot = 100, not hot = 0
 * 
 * @param isHot - Boolean hot status
 * @returns Score 0 or 100
 */
export function normalizeHotAgent(isHot: boolean): number {
  return isHot ? 100 : 0;
}

