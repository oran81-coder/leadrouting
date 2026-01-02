
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const configs = await prisma.metricsConfig.findMany();
        configs.forEach(c => {
            console.log(`Org: ${c.orgId}`);
            console.log(`  LeadBoards: ${c.leadBoardIds}`);
            console.log(`  ClosedWonCol: ${c.closedWonStatusColumnId}, Value: ${c.closedWonStatusValue}`);
            console.log(`  IndustryCol: ${c.industryColumnId}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
