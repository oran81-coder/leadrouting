import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkApplyRecords() {
  console.log("[check-apply-records] Checking RoutingApply records...\n");

  const applyRecords = await prisma.routingApply.findMany({
    take: 10,
    orderBy: { appliedAt: "desc" },
  });

  console.log(`Found ${applyRecords.length} records:\n`);
  for (const record of applyRecords) {
    console.log(`- proposalId: ${record.proposalId}`);
    console.log(`  appliedAt: ${record.appliedAt}`);
    console.log(`  orgId: ${record.orgId}\n`);
  }

  // Check proposals
  console.log("\n[check-apply-records] Checking recent proposals...\n");
  const proposals = await prisma.routingProposal.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      itemName: true,
      status: true,
      decidedAt: true,
      createdAt: true,
    },
  });

  console.log(`Found ${proposals.length} proposals:\n`);
  for (const p of proposals) {
    const hasApply = applyRecords.some(a => a.proposalId === p.id);
    console.log(`- ${p.id.slice(0, 15)}... (${p.itemName || 'unknown'})`);
    console.log(`  status: ${p.status}`);
    console.log(`  decidedAt: ${p.decidedAt || 'not decided'}`);
    console.log(`  hasApplyRecord: ${hasApply ? '✅ YES' : '❌ NO'}\n`);
  }

  console.log("\n[check-apply-records] Done!");
  await prisma.$disconnect();
}

checkApplyRecords().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

