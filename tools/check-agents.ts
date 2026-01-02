
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const orgId = "cmjt563ps000037hg6i4dvl7m";
    try {
        const agents = await prisma.leadFact.findMany({
            where: { orgId: orgId, assignedUserId: { not: null } },
            select: { assignedUserId: true },
            distinct: ["assignedUserId"],
        });
        console.log(`Agents for Org ${orgId}:`, agents);

        const count = await prisma.leadFact.count({
            where: { orgId: orgId, assignedUserId: { not: null } }
        });
        console.log(`Leads with assigned user: ${count}`);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
