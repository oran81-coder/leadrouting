
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const orgId = "cmjt563ps000037hg6i4dvl7m";
    try {
        const doneLeads = await prisma.leadFact.findMany({
            where: { orgId, statusValue: "Done" }
        });
        console.log(`Leads with status 'Done': ${doneLeads.length}`);
        doneLeads.forEach(l => {
            console.log(`  Item: ${l.itemName}, Assigned To: ${l.assignedUserId}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
