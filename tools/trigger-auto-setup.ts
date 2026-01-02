import { getPrisma } from "../packages/core/src/db/prisma";
import { PrismaRuleSetRepo } from "../packages/modules/rule-engine/src/infrastructure/rules.repo";
import { PrismaRoutingStateRepo } from "../packages/modules/routing-state/src/infrastructure/routingState.repo";
import { PrismaRoutingSettingsRepo } from "../packages/modules/routing-state/src/infrastructure/routingSettings.repo";
import { PrismaInternalSchemaRepo } from "../packages/modules/internal-schema/src/infrastructure/internalSchema.repo";
import { PrismaFieldMappingConfigRepo } from "../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";

const prisma = getPrisma();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function triggerAutoSetup() {
  console.log(`🚀 Triggering auto-setup for org ${orgId}...\n`);

  const rulesRepo = new PrismaRuleSetRepo();
  const routingStateRepo = new PrismaRoutingStateRepo();
  const routingSettingsRepo = new PrismaRoutingSettingsRepo();
  const schemaRepo = new PrismaInternalSchemaRepo();
  const mappingRepo = new PrismaFieldMappingConfigRepo();

  // Auto-create default "Catch-All" rule if no rules exist
  const existingRules = await rulesRepo.getLatest(orgId);
  if (!existingRules) {
    console.log(`📋 Creating default Catch-All rule...`);
    const defaultRuleset = {
      rules: [{
        id: "default-catch-all",
        name: "Route All Leads (Scoring Engine)",
        conditions: [],
        action: { type: "route_to_scoring_engine", value: null }
      }]
    };
    await rulesRepo.saveNewVersion(orgId, defaultRuleset, "system");
    console.log(`✅ Default rule created`);
  } else {
    console.log(`✅ Rules already exist (version ${existingRules.version})`);
  }

  // Auto-enable routing state if not already enabled
  const routingState = await routingStateRepo.get(orgId);
  if (!routingState?.isEnabled) {
    console.log(`⚙️ Enabling routing state...`);
    const latestSchema = await schemaRepo.getLatest(orgId);
    const latestMapping = await mappingRepo.getLatest(orgId);
    const latestRules = await rulesRepo.getLatest(orgId);

    if (latestSchema && latestMapping) {
      await routingStateRepo.setEnabled({
        orgId,
        enabled: true,
        enabledBy: "system",
        schemaVersion: latestSchema.version,
        mappingVersion: latestMapping.version,
        rulesVersion: latestRules?.version || null,
      });
      console.log(`✅ Routing state enabled`);
    } else {
      console.log(`❌ Cannot enable routing: missing schema or mapping`);
    }
  } else {
    console.log(`✅ Routing state already enabled`);
  }

  // Auto-set routing mode to MANUAL_APPROVAL if not set
  const routingSettings = await routingSettingsRepo.get(orgId);
  if (!routingSettings) {
    console.log(`🎯 Setting routing mode to MANUAL_APPROVAL...`);
    await routingSettingsRepo.setMode(orgId, "MANUAL_APPROVAL");
    console.log(`✅ Routing mode set`);
  } else {
    console.log(`✅ Routing settings already exist (mode: ${routingSettings.mode})`);
  }

  await prisma.$disconnect();
  console.log("\n🎉 Auto-setup complete!");
  console.log("\nNow restart the server and the LeadIntakePoller will create proposals automatically!");
}

triggerAutoSetup();
