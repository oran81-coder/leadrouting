/**
 * Migration Script: Phase 1 → Phase 2 Field Mapping Config
 * 
 * Changes:
 * 1. Extract primaryBoardId from mappings (all should have same boardId)
 * 2. Convert BoardColumnRef → ColumnRef (remove boardId from each mapping)
 * 3. Add statusConfig (set defaults if not present)
 * 4. Remove deprecated fields: workload, agentDomain
 * 5. Update field definitions for availability, closeDate
 * 
 * Run this script BEFORE deploying Phase 2 changes
 * 
 * Usage:
 *   npx tsx packages/modules/field-mapping/src/scripts/migrate-configs.ts
 */

import { getPrisma } from "../../../../core/src/db/prisma";
import type { FieldMappingConfig, BoardColumnRef, ColumnRef, StatusConfig } from "../contracts/mapping.types";

const ORG_ID = "org_1";

async function migrateConfig() {
  const prisma = getPrisma();
  
  console.log("🔄 Starting Field Mapping Config Migration (Phase 1 → Phase 2)...\n");
  
  // Fetch current config
  const current = await prisma.fieldMappingConfigVersion.findFirst({
    where: { orgId: ORG_ID },
    orderBy: { version: "desc" },
  });
  
  if (!current) {
    console.log("✅ No existing config found. Nothing to migrate.");
    return;
  }
  
  console.log(`📦 Found config version ${current.version}`);
  const oldConfig = current.config as any as FieldMappingConfig;
  
  // Step 1: Extract primaryBoardId
  console.log("\n🔍 Step 1: Extracting primaryBoardId...");
  const boardIds = new Set<string>();
  for (const [fieldId, mapping] of Object.entries(oldConfig.mappings)) {
    if ((mapping as BoardColumnRef).boardId) {
      boardIds.add((mapping as BoardColumnRef).boardId);
    }
  }
  
  if (boardIds.size === 0) {
    console.log("❌ No boardId found in mappings. Cannot migrate.");
    return;
  }
  
  if (boardIds.size > 1) {
    console.log(`⚠️  Warning: Multiple boardIds found: ${Array.from(boardIds).join(", ")}`);
    console.log(`   Using first one as primaryBoardId.`);
  }
  
  const primaryBoardId = Array.from(boardIds)[0];
  console.log(`✅ primaryBoardId: ${primaryBoardId}`);
  
  // Step 2: Convert BoardColumnRef → ColumnRef
  console.log("\n🔄 Step 2: Converting mappings...");
  const newMappings: Record<string, ColumnRef> = {};
  for (const [fieldId, oldMapping] of Object.entries(oldConfig.mappings)) {
    const boardColRef = oldMapping as BoardColumnRef;
    newMappings[fieldId] = {
      columnId: boardColRef.columnId,
      columnType: boardColRef.columnType,
    };
  }
  console.log(`✅ Converted ${Object.keys(newMappings).length} mappings`);
  
  // Step 3: Add default statusConfig
  console.log("\n⚙️  Step 3: Adding statusConfig...");
  const statusConfig: StatusConfig = oldConfig.statusConfig || {
    inTreatmentStatuses: ["Relevant", "In Treatment", "No Answer"],
    closedWonStatus: "Sale Completed",
  };
  console.log(`✅ statusConfig:`, statusConfig);
  
  // Step 4: Remove deprecated fields
  console.log("\n🗑️  Step 4: Removing deprecated fields...");
  const deprecatedFields = ["workload"]; // Only workload is removed, agent_domain stays as computed
  const newFields = oldConfig.fields.filter(f => !deprecatedFields.includes(f.id));
  console.log(`✅ Removed ${oldConfig.fields.length - newFields.length} deprecated fields`);
  
  // Step 5: Update field definitions
  console.log("\n📝 Step 5: Updating field definitions...");
  for (const field of newFields) {
    if (field.id === "availability") {
      field.type = "computed";
      field.description = "Auto-calculated based on leads in treatment and daily quota";
    }
    if (field.id === "agentDomain" || field.id === "agent_domain") {
      field.type = "computed";
      field.description = "Auto-learned from historical performance by Industry. System tracks conversion rates and identifies agent expertise domains.";
    }
    if (field.id === "closeDate" || field.id === "deal_close_date") {
      field.description = "Auto-resolved from Close Date column or Deal Status change";
    }
  }
  console.log(`✅ Updated field definitions`);
  
  // Step 6: Create new config
  const newConfig: FieldMappingConfig = {
    ...oldConfig,
    primaryBoardId,
    fields: newFields,
    mappings: newMappings,
    statusConfig,
  };
  
  // Step 7: Save migrated config
  console.log("\n💾 Step 6: Saving migrated config...");
  const nextVersion = current.version + 1;
  
  await prisma.fieldMappingConfigVersion.create({
    data: {
      orgId: ORG_ID,
      version: nextVersion,
      config: newConfig as any,
      updatedBy: "migration-script",
    },
  });
  
  console.log(`✅ Saved new config version ${nextVersion}`);
  
  // Summary
  console.log("\n📊 Migration Summary:");
  console.log(`   Old version: ${current.version}`);
  console.log(`   New version: ${nextVersion}`);
  console.log(`   Primary Board ID: ${primaryBoardId}`);
  console.log(`   Fields: ${oldConfig.fields.length} → ${newFields.length}`);
  console.log(`   Mappings: ${Object.keys(oldConfig.mappings).length} → ${Object.keys(newMappings).length}`);
  console.log(`   Status Config: ${statusConfig.inTreatmentStatuses.length} statuses`);
  console.log("\n✅ Migration completed successfully!");
}

// Run migration
migrateConfig()
  .catch((e) => {
    console.error("\n❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    const { getPrisma } = await import("../../../../core/src/db/prisma");
    await getPrisma().$disconnect();
  });

