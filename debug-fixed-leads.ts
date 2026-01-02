
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking the 3 fixed leads...");

    // Find leads that have a closedWonAt date (meaning they were fixed or legit wins)
    const wins = await prisma.leadFact.findMany({
        where: { closedWonAt: { not: null } },
        orderBy: { enteredAt: 'desc' }
    });

    console.log(`Found ${wins.length} leads with 'closedWonAt'.`);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const lead of wins) {
        console.log(`\nLead: ${lead.itemName || lead.itemId}`);
        console.log(`  - Status: ${lead.statusValue}`);
        console.log(`  - Entered At: ${lead.enteredAt}`);
        console.log(`  - Closed At:  ${lead.closedWonAt}`);
        console.log(`  - Deal Amount: ${lead.dealAmount}`);

        if (lead.enteredAt && lead.enteredAt < thirtyDaysAgo) {
            console.log("  ⚠️ WARNING: This lead entered > 30 days ago. It will NOT show in the default 30-day view.");
        } else {
            console.log("  ✅ This lead is recent (< 30 days). It SHOULD show.");
        }
    }

    // Also check if Deal Amount mapping is configured
    const agent = wins[0];
    if (agent) {
        const config = await prisma.metricsConfig.findFirst({ where: { orgId: agent.orgId } });
        console.log(`\nConfig Check:`);
        console.log(`  - Deal Amount Column ID: ${config?.dealAmountColumnId || 'MISSING ❌'}`);
        if (!config?.dealAmountColumnId) {
            console.log("  -> This explains why Revenue shows 'Configure Deal Amount column'.");
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
