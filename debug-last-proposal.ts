import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();

    console.log('='.repeat(60));
    console.log('INSPECTING LAST PROPOSAL JSON');
    console.log('='.repeat(60));

    // Fetch only the proposal, no relations to avoid schema errors
    const lastProposal = await prisma.routingProposal.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!lastProposal) {
        console.log('❌ No proposals found.');
        return;
    }

    console.log(`ID: ${lastProposal.id}`);
    console.log(`Created At: ${lastProposal.createdAt}`);
    console.log(`Lead Item ID: ${lastProposal.itemId}`);
    console.log(`Assigned To: ${lastProposal.suggestedAssigneeRaw}`);
    console.log('\n--- RAW EXPLAINS JSON ---');
    console.log(JSON.stringify(lastProposal.explains, null, 2));

    await prisma.$disconnect();
}

main().catch(console.error);
