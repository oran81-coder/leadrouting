
import { PrismaClient } from '@prisma/client';
import { PrismaMetricsConfigRepo } from '../apps/api/src/infrastructure/metricsConfig.repo';
import { PrismaLeadFactRepo } from '../apps/api/src/infrastructure/leadFact.repo';
import { createMondayClientForOrg } from '../packages/modules/monday-integration/src/application/mondayClient.factory';
import { saveLeadToFact } from '../apps/api/src/services/leadIntakePoller';

async function main() {
    const orgId = "cmjt563ps000037hg6i4dvl7m";
    console.log(`--- Manual Poller Tick for Org ${orgId} ---`);

    const prisma = new PrismaClient();
    const cfgRepo = new PrismaMetricsConfigRepo();
    const leadRepo = new PrismaLeadFactRepo();

    try {
        const cfg = await cfgRepo.getOrCreateDefaults(orgId);
        console.log('Config loaded.');

        // Parse boards
        const boardIds = (cfg as any).leadBoardIds.split(',').map((s: string) => s.trim()).filter(Boolean);
        console.log('Boards:', boardIds);

        const client = await createMondayClientForOrg(orgId);
        const samples = await (client as any).fetchBoardSamples(boardIds, 100);
        console.log(`Fetched ${samples.length} boards.`);

        for (const b of samples) {
            console.log(`Processing board ${b.boardId}...`);
            for (const it of b.items) {
                await saveLeadToFact(orgId, b.boardId, it, cfg, leadRepo);
            }
        }
        console.log('Done.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
