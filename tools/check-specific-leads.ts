
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const orgId = "cmjt563ps000037hg6i4dvl7m";
    try {
        const leads = await prisma.leadFact.findMany({
            where: { orgId, itemName: { in: ["Task 2", "lead5", "גל רביב"] } }
        });
        leads.forEach(l => {
            console.log(`Item: ${l.itemName}, Status: ${l.statusValue}, ClosedWonAt: ${l.closedWonAt}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
