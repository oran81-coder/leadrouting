
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fixing data for validation...");

    // Find leads that are "Done" but have no closedWonAt date
    const leads = await prisma.leadFact.findMany({
        where: {
            statusValue: "Done",
            closedWonAt: null
        }
    });

    console.log(`Found ${leads.length} leads with status 'Done' but no closed date.`);

    for (const lead of leads) {
        // Use lastActivityAt or enteredAt as the close date
        const closeDate = lead.lastActivityAt || lead.enteredAt || new Date();

        await prisma.leadFact.update({
            where: { id: lead.id },
            data: { closedWonAt: closeDate }
        });
    }

    console.log(`✅ Updated ${leads.length} leads. Now they count as 'Wins'.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
