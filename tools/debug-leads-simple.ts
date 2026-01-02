
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const leads = await prisma.leadFact.findMany();
        console.log(`Total Leads: ${leads.length}`);
        if (leads.length > 0) {
            console.log('Sample Lead:', JSON.stringify(leads[0], (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
                , 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
