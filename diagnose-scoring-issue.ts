import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();
    const ORG_ID = 'org_1';

    console.log('='.repeat(60));
    console.log('DIAGNOSTIC: AGENT PROFILES & PROPOSALS');
    console.log('='.repeat(60));

    // Check Agent Profiles
    console.log('\n📊 AGENT PROFILES:');
    console.log('-'.repeat(60));

    const agents = await prisma.agentProfile.findMany({
        where: { orgId: ORG_ID },
        select: {
            agentUserId: true,
            agentName: true,
            conversionRate: true,
            availability: true,
            totalLeadsHandled: true,
            totalLeadsConverted: true,
            currentActiveLeads: true,
            hotStreakActive: true,
            industryScores: true
        }
    });

    console.log(`\nFound ${agents.length} agents:\n`);
    for (const agent of agents) {
        console.log(`👤 ${agent.agentName || agent.agentUserId}`);
        console.log(`   Conversion Rate: ${agent.conversionRate}`);
        console.log(`   Availability: ${agent.availability}`);
        console.log(`   Active Leads: ${agent.currentActiveLeads}`);
        console.log(`   Total Handled: ${agent.totalLeadsHandled}`);
        console.log(`   Total Converted: ${agent.totalLeadsConverted}`);
        console.log(`   Hot Streak: ${agent.hotStreakActive ? 'YES' : 'NO'}`);

        const industries = typeof agent.industryScores === 'string'
            ? JSON.parse(agent.industryScores)
            : agent.industryScores;
        console.log(`   Industries: ${JSON.stringify(industries)}`);
        console.log('');
    }

    // Check Recent Proposals
    console.log('\n📋 RECENT PROPOSALS:');
    console.log('-'.repeat(60));

    const proposals = await prisma.routingProposal.findMany({
        where: { orgId: ORG_ID },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
            id: true,
            itemId: true,
            createdAt: true,
            action: true,
            explainability: true
        }
    });

    console.log(`\nFound ${proposals.length} recent proposals:\n`);

    const agentScores: Record<string, number[]> = {};

    for (const proposal of proposals) {
        const action = typeof proposal.action === 'string'
            ? JSON.parse(proposal.action)
            : proposal.action;
        const explain = typeof proposal.explainability === 'string'
            ? JSON.parse(proposal.explainability)
            : proposal.explainability;

        const agentName = action?.agentName || action?.value || 'Unknown';
        const score = explain?.topAgent?.score || 0;

        if (!agentScores[agentName]) {
            agentScores[agentName] = [];
        }
        agentScores[agentName].push(score);

        console.log(`📄 ${proposal.itemId}`);
        console.log(`   Recommended: ${agentName}`);
        console.log(`   Score: ${score}/100`);
        console.log(`   Created: ${proposal.createdAt}`);

        if (explain?.alternatives && explain.alternatives.length > 0) {
            console.log(`   Alternatives:`);
            for (const alt of explain.alternatives.slice(0, 3)) {
                console.log(`     - ${alt.agentName}: ${alt.score}/100`);
            }
        }
        console.log('');
    }

    // Summary
    console.log('\n📈 SCORE DISTRIBUTION SUMMARY:');
    console.log('-'.repeat(60));
    for (const [agentName, scores] of Object.entries(agentScores)) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const allSame = scores.every(s => s === scores[0]);
        console.log(`${agentName}:`);
        console.log(`  Proposals: ${scores.length}`);
        console.log(`  Avg Score: ${avg.toFixed(1)}/100`);
        console.log(`  All scores same? ${allSame ? '⚠️ YES - ' + scores[0] : 'NO'}`);
        console.log('');
    }

    await prisma.$disconnect();
}

main().catch(console.error);
