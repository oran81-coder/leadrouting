const { getPrisma } = require('./packages/core/src/db/prisma');

async function main() {
    const prisma = getPrisma();

    console.log('='.repeat(60));
    console.log('CHECKING AGENT PROFILES');
    console.log('='.repeat(60));

    const agents = await prisma.agentProfile.findMany({
        where: { orgId: 'org_1' },
        select: {
            agentUserId: true,
            agentName: true,
            conversionRate: true,
            availability: true,
            totalLeadsHandled: true,
            totalLeadsConverted: true,
            industryScores: true
        }
    });

    console.log(`\nFound ${agents.length} agents:\n`);
    for (const agent of agents) {
        console.log(`Agent: ${agent.agentName || agent.agentUserId}`);
        console.log(`  - Conversion Rate: ${agent.conversionRate}`);
        console.log(`  - Availability: ${agent.availability}`);
        console.log(`  - Total Leads: ${agent.totalLeadsHandled}`);
        console.log(`  - Converted: ${agent.totalLeadsConverted}`);
        console.log(`  - Industry Scores: ${typeof agent.industryScores === 'string' ? agent.industryScores : JSON.stringify(agent.industryScores)}`);
        console.log('');
    }

    console.log('='.repeat(60));
    console.log('CHECKING LATEST PROPOSALS');
    console.log('='.repeat(60));

    const proposals = await prisma.routingProposal.findMany({
        where: { orgId: 'org_1' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            itemId: true,
            createdAt: true,
            action: true,
            explainability: true
        }
    });

    console.log(`\nFound ${proposals.length} recent proposals:\n`);
    for (const proposal of proposals) {
        const action = typeof proposal.action === 'string' ? JSON.parse(proposal.action) : proposal.action;
        const explain = typeof proposal.explainability === 'string' ? JSON.parse(proposal.explainability) : proposal.explainability;

        console.log(`Proposal ID: ${proposal.id}`);
        console.log(`  Item: ${proposal.itemId}`);
        console.log(`  Created: ${proposal.createdAt}`);
        console.log(`  Recommended Agent: ${action?.agentName || action?.value}`);
        console.log(`  Score: ${explain?.topAgent?.score || 'N/A'}`);
        console.log(`  Alternatives: ${explain?.alternatives?.length || 0}`);

        if (explain?.alternatives && explain.alternatives.length > 0) {
            console.log(`  Alt Agents:`);
            for (const alt of explain.alternatives.slice(0, 3)) {
                console.log(`    - ${alt.agentName}: ${alt.score}`);
            }
        }
        console.log('');
    }

    await prisma.$disconnect();
}

main().catch(console.error);
