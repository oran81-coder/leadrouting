
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const config = await prisma.metricsConfig.findFirst({
            where: { orgId: "cmjt563ps000037hg6i4dvl7m" }
        });
        if (config) {
            console.log(`Value: [${config.closedWonStatusValue}]`);
            console.log(`Length: ${config.closedWonStatusValue?.length}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
