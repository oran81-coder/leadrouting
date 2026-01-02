
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const leads = await prisma.leadFact.findMany({
            where: { closedWonAt: { not: null } }
        });
        console.log(`Leads with ClosedWonAt: ${leads.length}`);
        leads.forEach(l => {
            console.log(`Item: ${l.itemName} (${l.itemId}), Status: ${l.statusValue}`);
        });

        const withStatus = await prisma.leadFact.findMany({
            where: { statusValue: "Done" }
        });
        console.log(`Leads with Status='Done': ${withStatus.length}`);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
