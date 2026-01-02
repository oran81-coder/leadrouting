
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const orgId = "cmjt563ps000037hg6i4dvl7m";
    try {
        const config = await prisma.metricsConfig.findFirst({ where: { orgId } });
        if (!config || !config.closedWonStatusValue) {
            console.log("No config found.");
            return;
        }

        console.log(`Setting closedWonAt for status [${config.closedWonStatusValue}] in Org ${orgId}...`);

        const result = await prisma.leadFact.updateMany({
            where: {
                orgId,
                statusValue: config.closedWonStatusValue,
                closedWonAt: null
            },
            data: {
                closedWonAt: new Date() // Fallback to now if we don't have historical date easily
            }
        });

        console.log(`Updated ${result.count} leads.`);

        // Now check if conversion rate will be non-zero
        const converted = await prisma.leadFact.count({ where: { orgId, closedWonAt: { not: null } } });
        const total = await prisma.leadFact.count({ where: { orgId, assignedUserId: { not: null } } });
        console.log(`Summary: Converted ${converted} / Total ${total} (Assigned)`);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
