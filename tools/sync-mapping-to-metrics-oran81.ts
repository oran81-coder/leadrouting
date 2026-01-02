import { getPrisma } from "../packages/core/src/db/prisma";

async function main() {
  const prisma = getPrisma();
  
  const orgId = "cmjq2ces90000rbcw8s5iqlcz";
  
  console.log(`\n🔄 Syncing FieldMapping → MetricsConfig for ${orgId}...\n`);
  
  // Get latest FieldMappingConfig
  const mapping = await prisma.fieldMappingConfigVersion.findFirst({
    where: { orgId },
    orderBy: { version: "desc" },
  });
  
  if (!mapping) {
    console.error("❌ No FieldMappingConfig found!");
    return;
  }
  
  const payload = mapping.payload as any;
  console.log(`✅ Found mapping version ${mapping.version}`);
  console.log(`   Boards: ${payload.primaryBoardId || "not set"}`);
  
  // Get or create MetricsConfig
  let metricsConfig = await prisma.metricsConfig.findUnique({
    where: { orgId },
  });
  
  if (!metricsConfig) {
    console.log("   Creating new MetricsConfig...");
    metricsConfig = await prisma.metricsConfig.create({
      data: {
        orgId,
        leadBoardIds: payload.primaryBoardId || "",
        enableIndustryPerf: true,
        enableConversion: true,
        enableAvgDealSize: true,
        enableHotStreak: true,
        enableResponseSpeed: true,
        enableBurnout: true,
        enableAvailabilityCap: true,
        weightIndustryPerf: 25,
        weightConversion: 20,
        weightAvgDeal: 15,
        weightHotStreak: 10,
        weightResponseSpeed: 15,
        weightBurnout: 10,
        weightAvailabilityCap: 5,
      },
    });
  }
  
  // Update MetricsConfig with FieldMapping data
  const updateData: any = {
    leadBoardIds: payload.primaryBoardId || metricsConfig.leadBoardIds,
  };
  
  // Map fields from FieldMapping to MetricsConfig
  if (payload.writebackTargets?.assignedAgent?.columnId) {
    updateData.assignedPeopleColumnId = payload.writebackTargets.assignedAgent.columnId;
  }
  
  // Map status columns
  const mappings = payload.mappings || {};
  for (const [fieldId, fieldMapping] of Object.entries(mappings)) {
    const fm = fieldMapping as any;
    switch (fieldId) {
      case "lead_industry":
        if (fm.columnId) updateData.industryColumnId = fm.columnId;
        break;
      case "deal_amount":
        if (fm.columnId) updateData.dealAmountColumnId = fm.columnId;
        break;
      case "deal_status":
        if (fm.columnId) updateData.contactedStatusColumnId = fm.columnId;
        break;
      case "deal_won_status_column":
        if (fm.columnId) updateData.closedWonStatusColumnId = fm.columnId;
        if (fm.statusLabel) updateData.closedWonStatusValue = fm.statusLabel;
        break;
      case "deal_next_call_date":
        if (fm.columnId) updateData.nextCallDateColumnId = fm.columnId;
        break;
    }
  }
  
  await prisma.metricsConfig.update({
    where: { orgId },
    data: updateData,
  });
  
  console.log(`\n✅ MetricsConfig synced!`);
  console.log(`   leadBoardIds: ${updateData.leadBoardIds}`);
  console.log(`   assignedPeopleColumnId: ${updateData.assignedPeopleColumnId || "not set"}`);
  console.log(`   industryColumnId: ${updateData.industryColumnId || "not set"}`);
  console.log(`   closedWonStatusColumnId: ${updateData.closedWonStatusColumnId || "not set"}\n`);
  
  await prisma.$disconnect();
}

main().catch(console.error);

