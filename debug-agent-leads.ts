
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const agentId = "97679373"; // From your log
    console.log(`Checking leads for agent: ${agentId}`);

    const leads = await prisma.leadFact.findMany({
        where: { assignedUserId: agentId },
        orderBy: { enteredAt: 'desc' }
    });

    console.log(`Found ${leads.length} leads assigned to this agent.`);

    let closedWonCount = 0;
    for (const lead of leads) {
        console.log(`\nLead Item ID: ${lead.itemId}`);
        console.log(`  - Status: ${lead.statusValue}`);
        console.log(`  - ClosedWonAt: ${lead.closedWonAt}`); // Should be set now
        console.log(`  - Industry: ${lead.industry}`);
        console.log(`  - Deal Amount: ${lead.dealAmount}`);

        if (lead.closedWonAt) closedWonCount++;
    }

    console.log(`\nTotal Closed Won: ${closedWonCount}`);

    if (closedWonCount === 0) {
        console.log("❌ This agent has NO closed won leads. That explains the N/A scores.");
    } else {
        console.log("✅ Agent has closed won leads. Checking for missing amount/industry...");
        const hasAmount = leads.some(l => l.closedWonAt && Number(l.dealAmount || 0) > 0);
        const hasIndustry = leads.some(l => l.closedWonAt && l.industry);

        if (!hasAmount) console.log("⚠️ Leads are 'Won' but have NO Deal Amount. 'Avg Deal Size' will be 0/NA.");
        if (!hasIndustry) console.log("⚠️ Leads are 'Won' but have NO Industry. 'Domain Expertise' will be empty.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
