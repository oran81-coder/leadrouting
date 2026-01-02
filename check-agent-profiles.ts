
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const agents = await prisma.agentProfile.findMany();
    console.log(`Found ${agents.length} agents`);

    for (const agent of agents) {
        console.log(`\nAgent: ${agent.agentName} (${agent.agentUserId})`);
        console.log(`- Avg Response Time: ${agent.avgResponseTime}`);
        // Check if new field is populated (might be null if not computed yet)
        console.log(`- Avg Time To Close: ${(agent as any).avgTimeToClose}`);
        console.log(`- Avg Deal Size: ${agent.avgDealSize}`);
        console.log(`- Conversion Rate: ${agent.conversionRate}`);
        console.log(`- Industry Scores: ${JSON.stringify(agent.industryScores)}`);
    }

    // Also verify recent deals to see if they should have deal sizes
    const deals = await prisma.leadFact.findMany({
        where: {
            dealAmount: { gt: 0 }
        },
        take: 5
    });
    console.log(`\nSample Deals with Amount: ${deals.length}`);
    deals.forEach(d => console.log(`- ${d.dealAmount} (Agent: ${d.agentUserId})`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
