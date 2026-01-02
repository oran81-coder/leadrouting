import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.leadFact.findMany({
        orderBy: { enteredAt: 'desc' },
        take: 10,
    });
    console.log(JSON.stringify(leads, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
