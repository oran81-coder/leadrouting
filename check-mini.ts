
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking first 3 agents...');
    const agents = await prisma.agentProfile.findMany({ take: 3 });

    for (const agent of agents) {
        console.log(`\nAG: ${agent.agentName || agent.agentUserId}`);
        console.log(`IndScores: ${JSON.stringify(agent.industryScores)}`);
        console.log(`AvgDeal: ${agent.avgDealSize}`);
        console.log(`ConvRate: ${agent.conversionRate}`);
    }
}

main().finally(() => prisma.$disconnect());
