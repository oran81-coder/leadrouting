import { getPrisma } from './packages/core/src/db/prisma';
import { executeAdvancedRouting } from './apps/api/src/services/advancedRoutingService';
import { PrismaAgentProfileRepo } from './apps/api/src/infrastructure/agentProfile.repo';
import { PrismaMetricsConfigRepo } from './apps/api/src/infrastructure/metricsConfig.repo';

async function main() {
    const PROPOSAL_ID = 'cmk4g3ctd0nriz5w2pjfsautb';
    const prisma = getPrisma();
    const agentRepo = new PrismaAgentProfileRepo();
    const metricsRepo = new PrismaMetricsConfigRepo();

    console.log(`VERIFYING INDUSTRY FLOW FOR PROPOSAL: ${PROPOSAL_ID}`);

    const proposal = await prisma.routingProposal.findUnique({ where: { id: PROPOSAL_ID } });
    if (!proposal) { console.error('Proposal not found'); return; }

    const agentProfiles = await agentRepo.listByOrg(proposal.orgId);
    const metricsConfig = await metricsRepo.getOrCreateDefaults(proposal.orgId);

    let normalizedValues = JSON.parse(proposal.normalizedValues as string);
    console.log('Input Normalized Values (Lead):', JSON.stringify(normalizedValues, null, 2));

    const result = await executeAdvancedRouting(
        proposal.orgId,
        normalizedValues,
        proposal.itemId,
        proposal.itemName || 'Unknown Item',
        agentProfiles,
        metricsConfig,
        []
    );

    console.log('\n--- SCORING RESULTS ---');

    // Inspect the raw scoring result for EACH agent
    if (result.scoringResult) {
        result.scoringResult.scores.forEach(agentScore => {
            console.log(`\nAgent: ${agentScore.agentName} (${agentScore.agentUserId})`);
            console.log(`  Total Score: ${agentScore.totalScore}`);

            // Find the industry rule
            const industryRule = agentScore.ruleContributions.results.find(r => r.ruleId === 'kpi_industry_match');
            if (industryRule) {
                console.log(`  [x] Industry Match Rule Found!`);
                console.log(`      Match Score: ${industryRule.matchScore}`);
                console.log(`      Contribution: ${industryRule.contribution}`);
                console.log(`      Applied: ${industryRule.applied}`);
                console.log(`      Details: ${industryRule.conditionDetails}`);
            } else {
                console.log(`  [ ] Industry Match Rule NOT FOUND in results.`);
            }
        });
    } else {
        console.log('No scoring result returned.');
    }

    await prisma.$disconnect();
}

main().catch(console.error);
