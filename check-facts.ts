
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const agentId = '97679373'; // The agent from previous logs
    console.log(`Checking leads for agent: ${agentId}`);

    const facts = await prisma.leadFact.findMany({
        where: {
            assignedUserId: agentId,
            dealAmount: { not: null }
        },
        select: {
            itemId: true,
            dealAmount: true,
            statusValue: true,
            closedWonAt: true,
            enteredAt: true,
            industry: true
        }
    });

    console.log(`Found ${facts.length} leads with deal amount.`);

    if (facts.length > 0) {
        console.log("Sample leads:");
        facts.slice(0, 5).forEach(f => console.log(f));
    } else {
        console.log("No leads with deal amount found for this agent.");
    }
}

main().finally(() => prisma.$disconnect());
