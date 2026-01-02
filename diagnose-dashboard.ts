
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 STARTING DEEP DASHBOARD DIAGNOSIS 🔍");

    // 1. Get ALL leads to see the full picture
    const allLeads = await prisma.leadFact.findMany({
        orderBy: { enteredAt: 'desc' }
    });

    console.log(`\n1️⃣ TOTAL LEADS IN DB: ${allLeads.length}`);

    // 2. Filter: leads that are "Done" or have a Closed Date
    const wonLeads = allLeads.filter(l => l.closedWonAt || l.statusValue === 'Done');
    console.log(`\n2️⃣ WON LEADS (Status='Done' or Has Date): ${wonLeads.length}`);

    wonLeads.forEach(l => {
        const isAssigned = !!l.assignedUserId;
        const hasDate = !!l.closedWonAt;
        console.log(`   - Lead: "${l.itemName}"`);
        console.log(`     Status: ${l.statusValue}`);
        console.log(`     Assigned: ${isAssigned ? '✅ (' + l.assignedUserId + ')' : '❌ NO AGENT'}`);
        console.log(`     Won Date: ${hasDate ? '✅ ' + l.closedWonAt?.toISOString() : '❌ MISSING'}`);
        const enteredText = l.enteredAt ? l.enteredAt.toISOString() : 'Unknown';
        const daysAgo = l.enteredAt ? Math.floor((new Date().getTime() - l.enteredAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        console.log(`     Entered At: ${enteredText} (${daysAgo} days ago)`);

        if (!isAssigned) {
            console.log("     ⚠️ PROBLEM: This won deal has NO AGENT. Dashboard ignores it.");
        }
    });

    // 3. Filter: leads that are "Assigned"
    const assignedLeads = allLeads.filter(l => l.assignedUserId);
    console.log(`\n3️⃣ ASSIGNED LEADS (Any Status): ${assignedLeads.length}`);
    // In the user's screenshot, this was "11". Let's see if we match.

    assignedLeads.forEach(l => {
        const isWon = !!l.closedWonAt;
        console.log(`   - Lead: "${l.itemName}" -> Agent: ${l.assignedUserId}`);
        console.log(`     Status: ${l.statusValue}`);
        console.log(`     Is Won?: ${isWon ? '✅' : '❌'}`);
    });

    // 4. Overlap Check
    const validDashboardWins = allLeads.filter(l => l.assignedUserId && l.closedWonAt);
    console.log(`\n4️⃣ VALID DASHBOARD WINS (Assigned + Won + Has Date): ${validDashboardWins.length}`);

    if (validDashboardWins.length === 0) {
        console.log("\n❌ DIAGNOSIS: The dashboard shows '0 won' because there are ZERO leads that are BOTH Assigned AND Won.");
        if (wonLeads.length > 0 && assignedLeads.length > 0) {
            console.log("   -> You have Won leads (unassigned) and Assigned leads (not won). They don't overlap!");
        }
    } else {
        console.log(`\n✅ The dashboard SHOULD show ${validDashboardWins.length} wins.`);
        console.log("   If it doesn't, check the DATE dates (30 vs 90 days).");
    }

    // 5. Check User Cache
    const userIds = new Set(assignedLeads.map(l => l.assignedUserId).filter(Boolean) as string[]);
    if (userIds.size > 0) {
        console.log(`\n5️⃣ Checking Agent Existence (${userIds.size} IDs)...`);
        const cachedUsers = await prisma.mondayUserCache.findMany({
            where: { userId: { in: Array.from(userIds) } }
        });
        console.log(`   Found ${cachedUsers.length} valid agents in cache.`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
