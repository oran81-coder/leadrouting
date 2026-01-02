import prismaModule from "../packages/core/src/db/prisma.js";
const { getPrisma } = prismaModule as any;
const prisma = getPrisma();

async function main() {
  console.log("🔧 Auto-creating field mapping for org_1 with real Monday board...\n");

  const orgId = "org_1";
  const boardId = "18393182279"; // Real 'leads' board
  const boardName = "leads";

  // Define the mapping based on what we found
  const mappings = {
    lead_source: { boardId, columnId: "text9", columnType: "text" },
    lead_industry: { boardId, columnId: "priority_1", columnType: "status" },
    lead_deal_size: { boardId, columnId: "numbers", columnType: "numbers" },
    assigned_agent: { boardId, columnId: "project_owner", columnType: "people" },
    deal_status: { boardId, columnId: "project_status", columnType: "status" },
    deal_won_status_column: { boardId, columnId: "project_status", columnType: "status" },
    lead_created_at: { boardId, columnId: "name", columnType: "name" }, // Using name as placeholder
    next_call_date: { boardId, columnId: "date", columnType: "date" },
  };

  // Define fields (matching internal schema)
  const fields = [
    { id: "lead_source", label: "Lead Source", entity: "lead", type: "text", required: true, isCore: true, isEnabled: true, group: "Lead" },
    { id: "lead_industry", label: "Industry", entity: "lead", type: "status", required: false, isCore: true, isEnabled: true, group: "Lead" },
    { id: "lead_deal_size", label: "Deal Size / Amount", entity: "lead", type: "number", required: false, isCore: true, isEnabled: true, group: "Lead" },
    { id: "lead_created_at", label: "Created At (Auto)", entity: "lead", type: "date", required: false, isCore: true, isEnabled: true, group: "Lead" },
    { id: "assigned_agent", label: "Assigned Agent", entity: "lead", type: "text", required: false, isCore: true, isEnabled: true, group: "Lead" },
    { id: "next_call_date", label: "Next Call Date", entity: "lead", type: "date", required: false, isCore: true, isEnabled: true, group: "Lead" },
    { id: "first_contact_at", label: "First Contact (Auto)", entity: "lead", type: "computed", required: false, isCore: true, isEnabled: false, group: "Lead" },
    { id: "agent_domain", label: "Agent Domain Expertise", entity: "agent", type: "computed", required: false, isCore: true, isEnabled: false, group: "Agent" },
    { id: "agent_availability", label: "Availability", entity: "agent", type: "computed", required: false, isCore: true, isEnabled: false, group: "Agent" },
    { id: "deal_status", label: "Deal Status", entity: "deal", type: "status", required: true, isCore: true, isEnabled: true, group: "Deal" },
    { id: "deal_won_status_column", label: "Deal Won Status Column", entity: "deal", type: "status", required: false, isCore: true, isEnabled: true, group: "Deal" },
    { id: "deal_close_date", label: "Close Date", entity: "deal", type: "date", required: false, isCore: true, isEnabled: false, group: "Deal" },
  ];

  // Create status config (for Step 4)
  const statusConfig = {
    dealWonStatusLabels: [
      { key: "done", label: "Done" }
    ]
  };

  // Create writebackTargets (for agent assignment)
  const writebackTargets = {
    assignedAgent: {
      boardId,
      columnId: "project_owner",
      columnType: "people"
    }
  };

  // Save mapping config
  const mappingConfig = {
    version: 2,
    updatedAt: new Date().toISOString(),
    primaryBoardId: boardId,
    primaryBoardName: boardName,
    mappings,
    fields,
    writebackTargets,
    statusConfig
  };

  await prisma.fieldMappingConfigVersion.create({
    data: {
      orgId,
      version: 2,
      payload: JSON.stringify(mappingConfig),
    }
  });

  console.log("✅ Mapping config saved!");

  // Save internal schema
  const schemaFields = fields
    .filter(f => f.isEnabled)
    .map(f => ({
      id: f.id,
      label: f.label,
      entity: f.entity,
      type: f.type === "computed" ? "text" : f.type,
      required: f.required,
      isCore: f.isCore,
      active: true,
      description: "",
      group: f.group
    }));

  const schema = {
    version: 1,
    updatedAt: new Date().toISOString(),
    fields: schemaFields
  };

  await prisma.internalSchemaVersion.create({
    data: {
      orgId,
      version: 1,
      payload: JSON.stringify(schema),
    }
  });

  console.log("✅ Internal schema saved!");

  console.log("\n🎉 Mapping created successfully!");
  console.log(`   Board: ${boardName} (${boardId})`);
  console.log(`   Mapped fields: ${Object.keys(mappings).length}`);
  console.log(`   Active schema fields: ${schemaFields.length}`);
  console.log("\n📝 Now you can:");
  console.log("   1. Refresh the Field Mapping page");
  console.log("   2. Go to Step 4 to configure Deal Won status");
  console.log("   3. Run Test with Sample Data");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


