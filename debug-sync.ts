import { createMondayClientForOrg } from './packages/modules/monday-integration/src/application/monday.orgClient';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = "cmjt563ps000037hg6i4dvl7m";
const BOARD_ID = "18393182279";

async function main() {
    console.log("--- 1. Fetching from Monday ---");
    const client = await createMondayClientForOrg(ORG_ID);
    if (!client) { console.log("No client"); return; }

    const samples = await (client as any).fetchBoardSamples([BOARD_ID], 20);
    const mondayItems = samples?.[0]?.items || [];
    console.log(`Monday Items Found: ${mondayItems.length}`);

    const mondayMap = new Map();
    for (const item of mondayItems) {
        mondayMap.set(String(item.id), item.name);
        console.log(`Monday Item: ${item.name} (${item.id}) - Updated: ${item.updated_at}`);
    }

    console.log("\n--- 2. Checking DB ---");
    const leads = await prisma.leadFact.findMany({
        where: { boardId: BOARD_ID },
        orderBy: { enteredAt: 'desc' },
        take: 20
    });

    const dbIds = new Set(leads.map(l => l.itemId));

    console.log("\n--- 3. Comparison ---");
    for (const item of mondayItems) {
        const id = String(item.id);
        if (!dbIds.has(id)) {
            console.log(`❌ MISSING IN DB: ${item.name} (${id})`);
        } else {
            console.log(`✅ Found in DB:   ${item.name} (${id})`);
        }
    }
}

main().finally(() => prisma.$disconnect());
