
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const orgId = "cmjt563ps000037hg6i4dvl7m";
    const agentUserId = "97679373";
    try {
        const leads = await prisma.leadFact.findMany({
            where: { orgId, assignedUserId: agentUserId }
        });
        console.log(`Leads for agent ${agentUserId}: ${leads.length}`);
        leads.forEach(l => {
            console.log(`  Item: ${l.itemName}, Status: ${l.statusValue}, ClosedWonAt: ${l.closedWonAt}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
