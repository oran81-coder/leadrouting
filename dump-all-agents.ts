import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();

    console.log('='.repeat(60));
    console.log('DUMP ALL AGENT PROFILES (ANY ORG)');
    console.log('='.repeat(60));

    // Fetch ALL agents without org filter
    const agents = await prisma.agentProfile.findMany({
        select: {
            orgId: true,
            agentUserId: true,
            agentName: true,
            industryScores: true,
            conversionRate: true,
            avgResponseTime: true,
            avgTimeToClose: true,
            avgDealSize: true,
            hotStreakActive: true
        }
    });

    console.log(`\nFound total ${agents.length} agents in database.\n`);

    // Group by Org ID
    const byOrg: Record<string, typeof agents> = {};
    for (const agent of agents) {
        if (!byOrg[agent.orgId]) byOrg[agent.orgId] = [];
        byOrg[agent.orgId].push(agent);
    }

    for (const [orgId, orgAgents] of Object.entries(byOrg)) {
        console.log(`\n🏢 Organization: ${orgId} (${orgAgents.length} agents)`);
        console.log('-'.repeat(40));

        // Show first 3 agents for this org
        for (const agent of orgAgents.slice(0, 3)) {
            console.log(`👤 ${agent.agentName || agent.agentUserId}`);
            console.log(`   Domain Expertise (industryScores): ${JSON.stringify(agent.industryScores)}`);
            console.log(`   Historical Success (conversionRate): ${agent.conversionRate}`);
            console.log(`   Response Speed: ${agent.avgResponseTime}`);
            console.log(`   Closing Speed: ${agent.avgTimeToClose}`);
            console.log(`   Avg Deal Size: ${agent.avgDealSize}`);
            console.log('');
        }
    }

    await prisma.$disconnect();
}

main().catch(console.error);
