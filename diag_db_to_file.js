const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const data = {
        timestamp: new Date().toISOString(),
        latestLeads: await prisma.leadFact.findMany({
            orderBy: { enteredAt: 'desc' },
            take: 10
        }),
        configs: await prisma.metricsConfig.findMany(),
        orgs: await prisma.organization.findMany()
    };

    fs.writeFileSync('ingestion_diagnostic.json', JSON.stringify(data, null, 2));
    console.log('Diagnostic data written to ingestion_diagnostic.json');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
