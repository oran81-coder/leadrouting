
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Auditing 'Done' leads for missing assignments...");

    const doneLeads = await prisma.leadFact.findMany({
        where: {
            statusValue: 'Done'
        },
        select: {
            itemId: true,
            itemName: true,
            assignedUserId: true,
            closedWonAt: true,
            enteredAt: true
        }
    });

    console.log(`\nFound ${doneLeads.length} leads with status 'Done':`);

    let unassignedCount = 0;

    for (const lead of doneLeads) {
        const isAssigned = !!lead.assignedUserId;
        const isWon = !!lead.closedWonAt;
        const entered = lead.enteredAt ? lead.enteredAt.toISOString().split('T')[0] : 'Unknown';

        console.log(`- Lead "${lead.itemName || lead.itemId}" (${entered})`);
        console.log(`  Assigned: ${isAssigned ? '✅ (' + lead.assignedUserId + ')' : '❌ MISSING (Counts as 0 wins)'}`);
        console.log(`  Won Date: ${isWon ? '✅' : '❌'}`);

        if (!isAssigned) unassignedCount++;
    }

    if (unassignedCount > 0) {
        console.log(`\n🚨 DIAGNOSIS: ${unassignedCount} 'Done' deals are NOT assigned to any agent.`);
        console.log("   The dashboard ignores unassigned deals because it can't give credit to anyone.");
        console.log("   SOLUTION: We need to assign these leads to an agent.");
    } else {
        console.log("\nAll Done leads have agents. The issue might be the date window (check dates above).");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
