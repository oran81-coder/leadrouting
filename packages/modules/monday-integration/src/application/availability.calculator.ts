/**
 * Availability Calculator (Phase 2)
 * Automatically calculates agent availability based on:
 * - Leads currently in treatment
 * - Daily lead quota
 */

import { PrismaLeadFactRepo } from "../../lead-facts/src/infrastructure/leadFact.repo";
import type { StatusConfig } from "../../field-mapping/src/contracts/mapping.types";

export interface AvailabilityScore {
  score: number; // 0-100
  leadsInTreatment: number;
  leadsToday: number;
  isAvailable: boolean;
  reason: string;
}

/**
 * Calculate agent availability score based on workload
 * 
 * @param agentUserId - Monday user ID of the agent
 * @param orgId - Organization ID
 * @param statusConfig - Status configuration (which statuses = "in treatment")
 * @param dailyLeadThreshold - Max leads per day before marking as "less available"
 * @returns Availability score and breakdown
 */
export async function calculateAgentAvailability(
  agentUserId: string,
  orgId: string,
  statusConfig: StatusConfig,
  dailyLeadThreshold: number = 20
): Promise<AvailabilityScore> {
  const leadRepo = new PrismaLeadFactRepo();
  
  // Count leads assigned to agent with "in treatment" statuses
  const leadsInTreatment = await leadRepo.countByAgentAndStatuses(
    orgId,
    agentUserId,
    statusConfig.inTreatmentStatuses
  );
  
  // Count leads assigned today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leadsToday = await leadRepo.countByAgentSince(orgId, agentUserId, today);
  
  // Calculate availability score (0-100)
  let score = 100;
  let reason = "Agent is fully available";
  
  // Reduce score based on total workload
  if (leadsInTreatment > 50) {
    score -= 40;
    reason = "High workload (50+ leads in treatment)";
  } else if (leadsInTreatment > 30) {
    score -= 20;
    reason = "Moderate workload (30-50 leads in treatment)";
  } else if (leadsInTreatment > 15) {
    score -= 10;
    reason = "Light workload (15-30 leads in treatment)";
  }
  
  // Reduce score based on daily quota
  if (leadsToday >= dailyLeadThreshold) {
    score -= 50;
    reason = `Daily quota reached (${leadsToday}/${dailyLeadThreshold} leads today)`;
  } else if (leadsToday >= dailyLeadThreshold * 0.8) {
    score -= 25;
    reason = `Approaching daily quota (${leadsToday}/${dailyLeadThreshold} leads today)`;
  }
  
  return {
    score: Math.max(0, score),
    leadsInTreatment,
    leadsToday,
    isAvailable: score > 20,
    reason
  };
}

/**
 * Calculate availability for multiple agents
 * Useful for routing decisions
 */
export async function calculateBulkAvailability(
  agentUserIds: string[],
  orgId: string,
  statusConfig: StatusConfig,
  dailyLeadThreshold: number = 20
): Promise<Map<string, AvailabilityScore>> {
  const results = new Map<string, AvailabilityScore>();
  
  // Calculate in parallel for performance
  await Promise.all(
    agentUserIds.map(async (agentUserId) => {
      const score = await calculateAgentAvailability(
        agentUserId,
        orgId,
        statusConfig,
        dailyLeadThreshold
      );
      results.set(agentUserId, score);
    })
  );
  
  return results;
}

