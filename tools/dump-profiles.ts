
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const profiles = await prisma.agentProfile.findMany();
        console.log(`Total Profiles in DB: ${profiles.length}`);
        profiles.forEach(p => {
            console.log(`Org: ${p.orgId}, Agent: ${p.agentUserId}, Conv: ${p.conversionRate}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
