
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Finding orphan wins (Done but Unassigned)...");

    // 1. Find a valid agent to assign to
    const agent = await prisma.agentProfile.findFirst({
        where: { agentName: { contains: 'Oran' } }
    }) || await prisma.agentProfile.findFirst();

    if (!agent) {
        console.error("❌ No agents found in the system! Cannot assign leads.");
        return;
    }

    console.log(`✅ Found Target Agent: ${agent.agentName} (ID: ${agent.agentUserId})`);

    // 2. Find unassigned won leads
    const orphanWins = await prisma.leadFact.findMany({
        where: {
            statusValue: 'Done',
            assignedUserId: null
        }
    });

    console.log(`Found ${orphanWins.length} unassigned 'Done' leads.`);

    if (orphanWins.length === 0) {
        console.log("no leads to fix.");
        return;
    }

    // 3. Assign them
    const result = await prisma.leadFact.updateMany({
        where: {
            statusValue: 'Done',
            assignedUserId: null
        },
        data: {
            assignedUserId: agent.agentUserId
        }
    });

    console.log(`🎉 SUCCESS: Assigned ${result.count} leads to ${agent.agentName}.`);
    console.log("👉 Now refresh the Dashboard (90 Days view)!");
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
