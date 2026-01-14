import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();
    const ORG_ID = 'org_1';

    console.log('='.repeat(60));
    console.log('DEBUG: AGENT KPI DATA');
    console.log('='.repeat(60));

    // Fetch agents with all relevant fields for KPIs
    const agents = await prisma.agentProfile.findMany({
        where: { orgId: ORG_ID },
        select: {
            agentUserId: true,
            agentName: true,
            // For Domain Expertise
            industryScores: true,
            // For Historical Success & Recent Performance
            conversionRate: true,
            totalLeadsConverted: true,
            // For Response Speed
            avgResponseTime: true,
            // For Closing Speed
            avgTimeToClose: true,
            // For Avg Deal Size
            avgDealSize: true,
            // For Momentum
            hotStreakActive: true,
            hotStreakCount: true,
            // For Workload
            availability: true,
            currentActiveLeads: true
        }
    });

    console.log(`\nFound ${agents.length} agents. Showing data for 'Oran Chen' (or first available):\n`);

    const targetAgent = agents.find(a => a.agentName?.includes('Oran')) || agents[0];

    if (!targetAgent) {
        console.log('No agents found!');
        return;
    }

    console.log(`👤 AGENT: ${targetAgent.agentName} (${targetAgent.agentUserId})`);
    console.log('-'.repeat(40));

    console.log(`1. Domain Expertise (industryScores):`);
    console.log(`   Raw Value: ${JSON.stringify(targetAgent.industryScores)}`);
    console.log(`   Type: ${typeof targetAgent.industryScores}`);

    console.log(`\n2. Historical Success (conversionRate):`);
    console.log(`   Raw Value: ${targetAgent.conversionRate}`);

    console.log(`\n3. Response Speed (avgResponseTime):`);
    console.log(`   Raw Value: ${targetAgent.avgResponseTime} seconds`);

    console.log(`\n4. Closing Speed (avgTimeToClose):`);
    console.log(`   Raw Value: ${targetAgent.avgTimeToClose} seconds`);

    console.log(`\n5. Avg Deal Size (avgDealSize):`);
    console.log(`   Raw Value: ${targetAgent.avgDealSize}`);

    console.log(`\n6. Momentum (hotStreak):`);
    console.log(`   Active: ${targetAgent.hotStreakActive}`);
    console.log(`   Count: ${targetAgent.hotStreakCount}`);

    await prisma.$disconnect();
}

main().catch(console.error);
