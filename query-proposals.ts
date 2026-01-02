import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const proposals = await prisma.routingProposal.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
    });
    console.log(JSON.stringify(proposals, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
