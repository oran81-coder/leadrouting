import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();

    console.log('='.repeat(60));
    console.log('CHECKING LEAD FACTS & INDUSTRIES');
    console.log('='.repeat(60));

    const totalFacts = await prisma.leadFact.count();
    console.log(`Total LeadFacts: ${totalFacts}`);

    const factsWithIndustry = await prisma.leadFact.count({
        where: {
            industry: { not: null }
        }
    });
    console.log(`With Industry: ${factsWithIndustry}`);

    const factsClosedWon = await prisma.leadFact.count({
        where: {
            closedWonAt: { not: null }
        }
    });
    console.log(`Closed Won: ${factsClosedWon}`);

    // Sample
    const sample = await prisma.leadFact.findMany({
        take: 5,
        select: {
            itemId: true,
            industry: true,
            dealAmount: true,
            statusValue: true,
            closedWonAt: true
        }
    });

    console.log('\nSample Facts:');
    console.table(sample);

    await prisma.$disconnect();
}

main().catch(console.error);
