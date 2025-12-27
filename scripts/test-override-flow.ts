import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testOverrideFlow() {
  const ORG_ID = "org_1";

  console.log("[test-override-flow] Testing OVERRIDE functionality...\n");

  // Find a PROPOSED proposal
  const proposals = await prisma.routingProposal.findMany({
    where: { orgId: ORG_ID, status: "PROPOSED" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (proposals.length === 0) {
    console.log("❌ No PROPOSED proposals found. Create some first.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${proposals.length} PROPOSED proposals:\n`);
  for (const p of proposals) {
    const action = p.action as any;
    console.log(`- ${p.id.slice(0, 15)}... (${p.itemName || 'unknown'})`);
    console.log(`  Current assignee: ${action?.value || 'none'}`);
    console.log(`  Status: ${p.status}\n`);
  }

  console.log("\n📋 To test OVERRIDE:");
  console.log("1. Go to Manager screen");
  console.log("2. Click on any PROPOSED proposal");
  console.log("3. Click 'Override Assignment'");
  console.log("4. Select a different agent");
  console.log("5. Check 'Apply to Monday.com now'");
  console.log("6. Click 'Override'\n");

  console.log("✅ Expected result:");
  console.log("- Proposal status changes to OVERRIDDEN");
  console.log("- New agent is written to Monday.com");
  console.log("- You see success message in UI");
  console.log("- Backend logs show [OVERRIDE] messages\n");

  console.log("⚠️  If it fails:");
  console.log("- Check backend logs for [OVERRIDE] error");
  console.log("- Run: npx tsx scripts/check-apply-records.ts");
  console.log("- If RoutingApply record exists but status is still PROPOSED, it means writeback failed");

  await prisma.$disconnect();
}

testOverrideFlow().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

