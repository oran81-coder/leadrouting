const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- REVIEWING CURRENT CONFIGURATION ---');

        // 1. Get all configs
        const configs = await prisma.metricsConfig.findMany();

        if (configs.length === 0) {
            console.log('❌ NO CONFIGURATIONS FOUND IN DB.');
        } else {
            console.log(`✅ Found ${configs.length} configurations.`);
            configs.forEach(c => {
                console.log(`\n[Org: ${c.orgId}]`);
                console.log(`- Lead Board IDs: "${c.leadBoardIds}" ${c.leadBoardIds ? '✅' : '❌ (EMPTY)'}`);
                console.log(`- Assigned Column: "${c.assignedPeopleColumnId}"`);
                console.log(`- Status Column: "${c.closedWonStatusColumnId}" (Value: "${c.closedWonStatusValue}")`);
            });
        }

        console.log('\n--- LATEST LEADS (LAST 3) ---');
        const leads = await prisma.leadFact.findMany({
            take: 3,
            orderBy: { enteredAt: 'desc' }
        });

        if (leads.length === 0) {
            console.log('❌ No leads found in DB.');
        } else {
            leads.forEach(l => {
                console.log(`- [${l.enteredAt.toISOString()}] ${l.itemName} (ID: ${l.itemId})`);
            });
        }

    } catch (err) {
        console.error('❌ Error reading DB:', err);
    } finally {
        await prisma.$disconnect();
        process.exit(0); // Force exit to prevent hanging
    }
}

main();
