import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const credentials = await prisma.mondayCredential.findMany();
    console.log(JSON.stringify(credentials, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
