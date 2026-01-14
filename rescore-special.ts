import { getPrisma } from './packages/core/src/db/prisma';
import { executeAdvancedRouting, formatExplainabilityForStorage } from './apps/api/src/services/advancedRoutingService';
import { PrismaAgentProfileRepo } from './apps/api/src/infrastructure/agentProfile.repo';
import { PrismaMetricsConfigRepo } from './apps/api/src/infrastructure/metricsConfig.repo';

async function main() {
    const PROPOSAL_ID = 'cmk4g3ctd0nriz5w2pjfsautb';

    console.log('='.repeat(60));
    console.log(`MANUAL RE-ROUTING FOR PROPOSAL: ${PROPOSAL_ID}`);
    console.log('='.repeat(60));

    const prisma = getPrisma();
    const agentRepo = new PrismaAgentProfileRepo();
    const metricsRepo = new PrismaMetricsConfigRepo();

    // 1. Fetch Proposal
    const proposal = await prisma.routingProposal.findUnique({
        where: { id: PROPOSAL_ID }
    });

    if (!proposal) {
        console.error('❌ Proposal not found');
        return;
    }

    console.log(`✅ Found Request: ${proposal.itemName} (Org: ${proposal.orgId})`);
    const orgId = proposal.orgId;

    // 2. Fetch Dependencies
    console.log('fetching profiles and config...');
    const agentProfiles = await agentRepo.listByOrg(orgId);
    const metricsConfig = await metricsRepo.getOrCreateDefaults(orgId);

    console.log(`Loaded ${agentProfiles.length} agent profiles.`);

    // 3. Execute Routing
    // @ts-ignore
    let normalizedValues = proposal.normalizedValues;
    if (typeof normalizedValues === 'string') {
        try {
            normalizedValues = JSON.parse(normalizedValues);
        } catch (e) {
            console.error('Failed to parse normalizedValues', e);
        }
    }

    if (!normalizedValues) {
        console.error('❌ No normalized values found in proposal');
        return;
    }

    console.log('Executing advanced routing...');
    const result = await executeAdvancedRouting(
        orgId,
        normalizedValues as any,
        proposal.itemId,
        proposal.itemName || 'Unknown Item',
        agentProfiles,
        metricsConfig,
        [] // No legacy rules
    );

    if (!result.recommendedAgent) {
        console.error('❌ No agent recommended after re-routing');
        return;
    }

    console.log(`\n✅ New Recommendation: ${result.recommendedAgent.agentName} (Score: ${result.recommendedAgent.score})`);

    // 4. Update Proposal
    console.log('Updating database...');

    // Prepare JSON strings for the update
    const actionJson = JSON.stringify({
        type: "assign_agent_id",
        value: result.recommendedAgent.agentUserId
    });

    const formattedExplanation = formatExplainabilityForStorage(result.explanation);
    console.log('DEBUG: Formatted Explanation Breakdown (before save):');
    // @ts-ignore
    console.log(JSON.stringify(formattedExplanation.breakdown.primaryReasons, null, 2));

    const explainabilityJson = JSON.stringify(formattedExplanation);

    await prisma.routingProposal.update({
        where: { id: PROPOSAL_ID },
        data: {
            action: actionJson,
            explainability: explainabilityJson,
            dataUpdatedAt: new Date()
        }
    });

    console.log('✅ Database updated successfully!');

    // Log the new breakdown for verification
    // @ts-ignore
    const newBreakdown = result.explanation.breakdown;
    console.log('\n--- NEW BREAKDOWN ---');
    console.log(JSON.stringify(newBreakdown, null, 2));

    await prisma.$disconnect();
}

main().catch(console.error);
