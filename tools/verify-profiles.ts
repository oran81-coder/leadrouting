
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const orgId = "cmjt563ps000037hg6i4dvl7m";
    try {
        const profiles = await prisma.agentProfile.findMany({ where: { orgId } });
        console.log(`Profiles for Org ${orgId}: ${profiles.length}`);
        profiles.forEach(p => {
            console.log(`Agent: ${p.agentUserId}`);
            console.log(`  Conv Rate: ${(Number(p.conversionRate) * 100).toFixed(1)}%`);
            console.log(`  Revenue: $${p.totalRevenue}`);
            console.log(`  Leads: ${p.totalLeadsHandled}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
