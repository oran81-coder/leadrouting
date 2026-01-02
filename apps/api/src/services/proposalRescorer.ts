/**
 * Proposal Re-scorer
 * 
 * Re-calculates routing proposals when lead data changes.
 * Updates existing proposals with new scores and explanations.
 */

import { createModuleLogger } from "../infrastructure/logger";
import { PrismaRoutingProposalRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingProposal.repo";
import { PrismaAgentProfileRepo } from "../infrastructure/agentProfile.repo";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { PrismaFieldMappingConfigRepo } from "../../../../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";
import { executeAdvancedRouting, formatExplainabilityForStorage } from "./advancedRoutingService";
import { normalizeEntityRecord } from "../../../../packages/core/src/schema/normalization";
import type { LeadChange } from "./leadUpdateDetector";

const logger = createModuleLogger('ProposalRescorer');

/**
 * Re-score result
 */
export interface RescoringResult {
  success: boolean;
  proposalId: string;
  previousScore: number | null;
  newScore: number | null;
  scoreDifference: number | null;
  previousAgent: string | null;
  newAgent: string | null;
  agentChanged: boolean;
  changes: LeadChange[];
  error?: string;
}

/**
 * Re-score an existing proposal with updated lead data
 */
export async function rescoreProposal(
  orgId: string,
  boardId: string,
  itemId: string,
  mondayItem: any,
  changes: LeadChange[]
): Promise<RescoringResult | null> {
  const proposalRepo = new PrismaRoutingProposalRepo();
  const agentProfileRepo = new PrismaAgentProfileRepo();
  const metricsConfigRepo = new PrismaMetricsConfigRepo();
  const mappingRepo = new PrismaFieldMappingConfigRepo();

  try {
    // Find existing proposal for this lead
    const existingProposals = await proposalRepo.list({
      orgId,
      boardId,
      itemId,
      limit: 1,
    });

    if (!existingProposals.items || existingProposals.items.length === 0) {
      logger.debug(`No existing proposal found for ${boardId}/${itemId}`);
      return null;
    }

    const existingProposal = existingProposals.items[0];
    const proposalId = existingProposal.id;

    logger.info(`Re-scoring proposal ${proposalId} for ${boardId}/${itemId}`);

    // Extract previous score and agent
    const previousExplainability = existingProposal.explainability as any;
    const previousScore = previousExplainability?.topAgent?.score ?? null;
    const previousAgent = (existingProposal.action as any)?.value ?? null;

    // Get mapping and normalize the updated lead data
    const mapping = await mappingRepo.getLatest(orgId);
    if (!mapping) {
      logger.error(`No mapping config for org ${orgId}`);
      return {
        success: false,
        proposalId,
        previousScore,
        newScore: null,
        scoreDifference: null,
        previousAgent,
        newAgent: null,
        agentChanged: false,
        changes,
        error: "No mapping config found",
      };
    }

    // Map Monday item to internal format
    const columnValues = mondayItem.column_values || [];
    const cvMap = new Map<string, any>();
    for (const cv of columnValues) {
      cvMap.set(cv.id, cv);
    }

    const raw: Record<string, any> = {};
    for (const [fieldId, ref] of Object.entries(mapping.mappings ?? {})) {
      const cv = cvMap.get((ref as any).columnId);
      if (!cv) continue;
      if (cv.type === 'status' || cv.type === 'dropdown') {
        raw[fieldId] = cv.text ?? null;
      } else {
        raw[fieldId] = cv.text ?? null;
      }
    }

    // Normalize
    const normResult = normalizeEntityRecord(mapping.schema, raw);
    if (!normResult.valid) {
      logger.error(`Normalization failed for ${boardId}/${itemId}:`, normResult.errors);
      return {
        success: false,
        proposalId,
        previousScore,
        newScore: null,
        scoreDifference: null,
        previousAgent,
        newAgent: null,
        agentChanged: false,
        changes,
        error: "Normalization failed",
      };
    }

    // Execute advanced routing with updated data
    const agentProfiles = await agentProfileRepo.listByOrg(orgId);
    const metricsConfig = await metricsConfigRepo.getOrCreateDefaults(orgId);

    const routingResult = await executeAdvancedRouting(
      orgId,
      normResult.values,
      itemId,
      mondayItem.name || null,
      agentProfiles,
      metricsConfig,
      [] // No legacy rules needed
    );

    if (!routingResult.recommendedAgent) {
      logger.warn(`No recommended agent after re-scoring for ${boardId}/${itemId}`);
      return {
        success: false,
        proposalId,
        previousScore,
        newScore: null,
        scoreDifference: null,
        previousAgent,
        newAgent: null,
        agentChanged: false,
        changes,
        error: "No recommended agent",
      };
    }

    // Extract new score and agent
    const newScore = routingResult.recommendedAgent.score;
    const newAgent = routingResult.recommendedAgent.agentUserId;
    const scoreDifference = previousScore !== null ? newScore - previousScore : null;
    const agentChanged = previousAgent !== newAgent;

    // Update the proposal with new data
    const updatedProposal = await proposalRepo.update(orgId, proposalId, {
      action: {
        type: "assign_agent_id",
        value: newAgent,
      },
      explainability: formatExplainabilityForStorage(routingResult.explanation),
      normalizedValues: normResult.values,
      // Mark as updated with change tracking
      dataUpdatedAt: new Date(),
      dataChanges: JSON.stringify(changes),
    });

    logger.info(`Re-scored proposal ${proposalId}`, {
      previousScore,
      newScore,
      scoreDifference,
      previousAgent,
      newAgent,
      agentChanged,
      changesCount: changes.length,
    });

    return {
      success: true,
      proposalId,
      previousScore,
      newScore,
      scoreDifference,
      previousAgent,
      newAgent,
      agentChanged,
      changes,
    };

  } catch (error: any) {
    logger.error(`Failed to re-score proposal for ${boardId}/${itemId}:`, error);
    return {
      success: false,
      proposalId: "unknown",
      previousScore: null,
      newScore: null,
      scoreDifference: null,
      previousAgent: null,
      newAgent: null,
      agentChanged: false,
      changes,
      error: error.message,
    };
  }
}

