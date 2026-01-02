
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const leads = await prisma.leadFact.findMany({
            select: {
                itemId: true,
                status: true,
                closedWonAt: true,
                dealAmount: true,
                assignedUserId: true
            }
        });

        console.log(`--- Lead Status Check ---`);
        leads.forEach(l => {
            console.log(`Lead: ${l.itemId}, Status: ${l.status}, ClosedWonAt: ${l.closedWonAt}, DealAmt: ${l.dealAmount}, Assigned: ${l.assignedUserId}`);
        });

        const closed = leads.filter(l => l.closedWonAt);
        console.log(`\nTotal closed won: ${closed.length}`);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
