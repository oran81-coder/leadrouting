const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Querying latest leads...');
    const leads = await prisma.leadFact.findMany({
        orderBy: { enteredAt: 'desc' },
        take: 5
    });
    console.log('--- LATEST 5 LEADS IN DB ---');
    leads.forEach(l => {
        console.log(`[${l.enteredAt.toISOString()}] ${l.itemName} (ID: ${l.itemId})`);
    });
    console.log('----------------------------');

    const configs = await prisma.metricsConfig.findMany();
    console.log('--- CONFIGURATIONS ---');
    configs.forEach(c => {
        console.log(`Org: ${c.orgId}, LeadBoards: ${c.leadBoardIds}, AssignedCol: ${c.assignedPeopleColumnId}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
