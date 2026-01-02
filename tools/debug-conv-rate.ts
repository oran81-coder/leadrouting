
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const orgId = "cmjt563ps000037hg6i4dvl7m";
    const agentUserId = "97679373";
    try {
        const allLeads = await prisma.leadFact.findMany({
            where: { orgId, assignedUserId: agentUserId }
        });

        const total = allLeads.length;
        const converted = allLeads.filter(l => l.closedWonAt !== null).length;
        const convRate = total > 0 ? converted / total : 0;

        console.log(`Agent ${agentUserId}: Total=${total}, Converted=${converted}, convRate=${convRate}`);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
