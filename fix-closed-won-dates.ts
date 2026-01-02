
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🛠️ STARTING FIX: Backfilling missing closedWonAt dates for 'Done' leads...");

    // 1. Find leads that need fixing
    const leadsToFix = await prisma.leadFact.findMany({
        where: {
            statusValue: 'Done',
            closedWonAt: null
        }
    });

    console.log(`Found ${leadsToFix.length} leads with status 'Done' but MISSING closedWonAt date.`);

    if (leadsToFix.length === 0) {
        console.log("✅ No leads need fixing. Exiting.");
        return;
    }

    let updatedCount = 0;

    // 2. Update each lead
    for (const lead of leadsToFix) {
        // Use updatedAt as the best proxy for when it was marked Done, fallback to enteredAt
        const dateToUse = lead.updatedAt || lead.enteredAt || new Date();

        console.log(`- Fixing lead "${lead.itemName}" (${lead.itemId}). Setting closedWonAt to: ${dateToUse.toISOString()}`);

        await prisma.leadFact.update({
            where: { id: lead.id },
            data: {
                closedWonAt: dateToUse
            }
        });
        updatedCount++;
    }

    console.log(`\n✅ SUCCESSFULLY FIXED ${updatedCount} LEADS.`);
    console.log("👉 Now check the Outcomes Dashboard (you may need to refresh report or wait 60s).");
}

main()
    .catch(e => {
        console.error("❌ ERROR:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
