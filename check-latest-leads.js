const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- LATEST 10 LEADS IN DB ---');
    const leads = await prisma.leadFact.findMany({
        orderBy: { enteredAt: 'desc' },
        take: 10
    });

    leads.forEach(l => {
        const dateStr = l.enteredAt ? l.enteredAt.toISOString() : 'N/A';
        console.log(`[${dateStr}] Item: ${l.itemName} | ItemID: ${l.itemId} | Assigned: ${l.assignedUserId || 'UNASSIGNED'}`);
    });
    console.log('----------------------------');

    const count = await prisma.leadFact.count();
    console.log(`Total leads in DB: ${count}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
