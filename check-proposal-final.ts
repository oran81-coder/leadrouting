import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const PROPOSAL_ID = 'cmk4g3ctd0nriz5w2pjfsautb';
    console.log(`Checking proposal: ${PROPOSAL_ID}`);

    const prisma = getPrisma();

    const proposal = await prisma.routingProposal.findUnique({
        where: { id: PROPOSAL_ID }
    });

    if (!proposal) {
        console.log('Proposal not found!');
        return;
    }

    console.log('Found proposal.');
    let expl = proposal.explainability;

    if (typeof expl === 'string') {
        try {
            expl = JSON.parse(expl);
        } catch (e) {
            console.log('Error parsing JSON string');
        }
    }

    // @ts-ignore
    if (expl && expl.breakdown && expl.breakdown.primaryReasons) {
        console.log('--- Primary Reasons ---');
        // @ts-ignore
        expl.breakdown.primaryReasons.forEach((r: any) => {
            console.log(`Rule: ${r.ruleName}, ID: ${r.ruleId}, Category: ${r.category}`);
        });
    } else {
        console.log('No primaryReasons found in breakdown');
        console.log(JSON.stringify(expl, null, 2));
    }

    await prisma.$disconnect();
}

main().catch(console.error);
