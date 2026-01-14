import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();

    console.log('='.repeat(60));
    console.log('CHECKING ORGANIZATIONS');
    console.log('='.repeat(60));

    const orgs = await prisma.organization.findMany();

    console.log(`Found ${orgs.length} organizations:`);
    orgs.forEach(org => {
        console.log(`- ID: ${org.id}, Name: ${org.name}, Display: ${org.displayName}`);
    });

    if (orgs.length === 0) {
        console.log('\n❌ No organizations found! You need to create one first.');
    }

    await prisma.$disconnect();
}

main().catch(console.error);
