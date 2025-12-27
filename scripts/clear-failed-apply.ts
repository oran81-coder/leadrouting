import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearFailedApply() {
  const proposalId = "cmjna0eqi000p117g85fw4vvd"; // lead10

  console.log(`[clear-failed-apply] Checking proposal ${proposalId}...\n`);

  const proposal = await prisma.routingProposal.findUnique({
    where: { id: proposalId },
    select: { status: true, decidedAt: true, itemName: true },
  });

  if (!proposal) {
    console.log("❌ Proposal not found!");
    await prisma.$disconnect();
    return;
  }

  console.log(`Proposal: ${proposal.itemName}`);
  console.log(`Status: ${proposal.status}`);
  console.log(`DecidedAt: ${proposal.decidedAt || 'not decided'}\n`);

  const applyRecord = await prisma.routingApply.findUnique({
    where: {
      orgId_proposalId: {
        orgId: "org_1",
        proposalId: proposalId,
      },
    },
  });

  if (!applyRecord) {
    console.log("✅ No RoutingApply record found - nothing to clear.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found RoutingApply record from: ${applyRecord.appliedAt}`);

  // If proposal is still PROPOSED and decidedAt is null, it means the apply failed
  if (proposal.status === "PROPOSED" && !proposal.decidedAt) {
    console.log("\n⚠️  Detected failed apply attempt. Clearing the RoutingApply record...\n");

    await prisma.routingApply.delete({
      where: {
        orgId_proposalId: {
          orgId: "org_1",
          proposalId: proposalId,
        },
      },
    });

    console.log("✅ RoutingApply record cleared! You can now try to APPROVE again.\n");
  } else {
    console.log("\n✅ Proposal appears to be properly processed (not a failed apply).\n");
  }

  console.log("[clear-failed-apply] Done!");
  await prisma.$disconnect();
}

clearFailedApply().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

