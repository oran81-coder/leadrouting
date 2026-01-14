import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();
    const agentUserId = '97865279'; // Ray Chen

    const leads = await prisma.leadFact.findMany({
        where: { assignedUserId: agentUserId }
    });

    console.log(`Found ${leads.length} leads for Ray Chen:`);
    leads.forEach(l => {
        console.log({
            id: l.id,
            itemId: l.itemId,
            statusValue: l.statusValue,
            enteredAt: l.enteredAt,
            closedWonAt: l.closedWonAt,
            dealAmount: l.dealAmount
        });
    });

    await prisma.$disconnect();
}

main().catch(console.error);
