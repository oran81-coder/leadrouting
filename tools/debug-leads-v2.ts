
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const leads = await prisma.leadFact.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' }
        });
        console.log(`Total Leads: ${await prisma.leadFact.count()}`);
        leads.forEach(l => {
            console.log(`Item: ${l.itemName} (${l.itemId})`);
            console.log(`  Assigned: ${l.assignedUserId}`);
            console.log(`  Status: ${l.statusValue}`);
            console.log(`  Industry: ${l.industry}`);
            console.log(`  ClosedWonAt: ${l.closedWonAt}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
