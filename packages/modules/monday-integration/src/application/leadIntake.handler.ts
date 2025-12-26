/**
 * Lead Intake Handler - Process new leads from Monday.com webhooks
 * Phase 2: Real-time Integration
 */

import { logger } from "../../../../../packages/core/src/shared/logger";
import { getPrisma } from "../../../../../packages/core/src/db/prisma";
import { createMondayClientForOrg } from "./monday.clientFactory";
import { normalizeEntityRecord } from "../../../field-mapping/src/application/mapping.raw";
import { RoutingEngine } from "../../../routing-engine/src/application/routing.engine";
import { ExplainabilityService } from "../../../explainability/src/application/explainer";
import { getLatestMapping } from "../../../field-mapping/src/application/mapping.service";

/**
 * Handle a new lead from Monday.com webhook
 */
export async function handleNewLead(data: {
  boardId: string;
  pulseId: string;
  pulseName: string;
  orgId?: string;
}): Promise<void> {
  const orgId = data.orgId || "org_1";
  const prisma = getPrisma();

  try {
    logger.info(`📥 Processing new lead: ${data.pulseName} (${data.pulseId})`);

    // Validate input
    if (!data.boardId || !data.pulseId || !data.pulseName) {
      logger.error("Invalid webhook data: missing required fields", { data });
      return;
    }

    // 1. Check if proposal already exists (avoid duplicates)
    const existingProposal = await prisma.routingProposal.findFirst({
      where: {
        orgId,
        boardId: data.boardId,
        itemId: data.pulseId,
      },
    });

    if (existingProposal) {
      logger.info(`Proposal already exists for lead ${data.pulseId}, skipping`);
      return;
    }

    // 2. Check if routing is enabled
    const routingState = await prisma.routingState.findUnique({
      where: { orgId },
    });

    if (!routingState || !routingState.isEnabled) {
      logger.info(`Routing is disabled for org ${orgId}, skipping lead`);
      return;
    }

    // 3. Fetch the full item from Monday.com
    const mondayClient = await createMondayClientForOrg(orgId);
    const query = `
      query GetItem($itemId: [ID!]) {
        items(ids: $itemId) {
          id
          name
          board {
            id
          }
          column_values {
            id
            text
            value
            type
          }
        }
      }
    `;

    const result = await mondayClient.query(query, { itemId: [data.pulseId] });
    const item = result.data.items[0];

    if (!item) {
      logger.error(`Item ${data.pulseId} not found in Monday.com`);
      return;
    }

    // 4. Get field mapping config
    const mappingConfig = await getLatestMapping(orgId);
    if (!mappingConfig) {
      logger.error(`No field mapping config found for org ${orgId}`);
      return;
    }

    // 5. Normalize the item to internal schema
    const normalizedLead = await normalizeEntityRecord({
      entity: "lead",
      raw: item,
      mappingConfig,
      orgId,
    });

    logger.debug("Normalized lead:", normalizedLead);

    // 6. Get available agents
    const agents = await prisma.agentProfile.findMany({
      where: { orgId },
    });

    if (agents.length === 0) {
      logger.warn(`No agents found for org ${orgId}`);
      return;
    }

    // 7. Calculate routing
    const routingEngine = new RoutingEngine();
    const explainer = new ExplainabilityService();

    const scoredAgents = await routingEngine.scoreAgents({
      lead: normalizedLead as any,
      agents: agents as any,
      orgId,
    });

    if (scoredAgents.length === 0) {
      logger.warn("No agents scored, cannot create proposal");
      return;
    }

    const topAgent = scoredAgents[0];
    const explanation = explainer.explainRecommendation(
      normalizedLead as any,
      topAgent.agent,
      topAgent.score,
      topAgent.breakdown || {}
    );

    // 8. Create routing proposal
    await prisma.routingProposal.create({
      data: {
        orgId,
        boardId: data.boardId,
        itemId: data.pulseId,
        itemName: data.pulseName,
        leadFields: normalizedLead,
        normalizedValues: normalizedLead,
        status: "pending",
        explainability: {
          topAgent: {
            agentUserId: topAgent.agent.userId,
            agentName: topAgent.agent.name,
            score: topAgent.score,
            breakdown: topAgent.breakdown || {},
          },
          explanation,
          scoredAgents: scoredAgents.slice(0, 5).map((sa) => ({
            agentUserId: sa.agent.userId,
            agentName: sa.agent.name,
            score: sa.score,
            breakdown: sa.breakdown || {},
          })),
        },
      },
    });

    logger.info(`✅ Routing proposal created for lead: ${data.pulseName}`);
  } catch (error: any) {
    logger.error(`Failed to process lead ${data.pulseId}: ${error.message}`, {
      error,
      data,
    });
    throw error;
  }
}

/**
 * Handle column value change webhook
 */
export async function handleColumnChange(data: {
  boardId: string;
  pulseId: string;
  columnId: string;
  value: any;
  orgId?: string;
}): Promise<void> {
  const orgId = data.orgId || "org_1";
  const prisma = getPrisma();

  try {
    logger.info(`📝 Processing column change for lead: ${data.pulseId}`);

    // Check if this is a mapped field that affects routing
    const mappingConfig = await getLatestMapping(orgId);
    if (!mappingConfig) {
      logger.warn(`No mapping config found for org ${orgId}`);
      return;
    }

    // Check if the changed column is mapped
    const isMappedField = Object.values(mappingConfig.fields).some(
      (field) => field.columnId === data.columnId
    );

    if (!isMappedField) {
      logger.debug(`Column ${data.columnId} is not mapped, ignoring change`);
      return;
    }

    // For now, we'll just log the change
    // In the future, we could trigger re-routing or update proposals
    logger.info(`Mapped field changed for lead ${data.pulseId}, consider re-routing`);
  } catch (error: any) {
    logger.error(`Failed to process column change: ${error.message}`, { error, data });
  }
}

