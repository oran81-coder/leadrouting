/**
 * Manual Webhook Registration Script
 * Run this if webhook registration failed during Monday.com connection
 */

import { getPrisma } from "./packages/core/src/db/prisma";
import { createMondayClient } from "./packages/modules/monday-integration/src/application/monday.clientFactory";
import { registerMondayWebhook } from "./packages/modules/monday-integration/src/application/monday.webhooks";
import { env } from "./apps/api/src/config/env";

const prisma = getPrisma();
const ORG_ID = "org_1";

async function main() {
  console.log("🔍 Checking webhook registration status...\n");

  // 1. Get Monday.com credentials
  const credential = await prisma.mondayCredential.findUnique({
    where: { orgId: ORG_ID },
  });

  if (!credential) {
    console.error("❌ No Monday.com credentials found. Please connect via Admin screen first.");
    process.exit(1);
  }

  console.log("✅ Monday.com credentials found");

  // 2. Get field mapping config (to get primaryBoardId)
  const mapping = await prisma.fieldMappingConfigVersion.findFirst({
    where: { orgId: ORG_ID },
    orderBy: { version: "desc" },
  });

  if (!mapping) {
    console.error("❌ No field mapping found. Please configure field mapping first.");
    process.exit(1);
  }

  const config = JSON.parse(mapping.payload) as any;
  const boardId = config.primaryBoardId;

  if (!boardId) {
    console.error("❌ No primaryBoardId in field mapping config.");
    process.exit(1);
  }

  console.log(`✅ Board ID: ${boardId}`);

  // 3. Check environment
  if (!env.PUBLIC_URL) {
    console.error("❌ PUBLIC_URL not set in .env");
    process.exit(1);
  }

  if (!env.WEBHOOK_SECRET) {
    console.error("❌ WEBHOOK_SECRET not set in .env");
    process.exit(1);
  }

  console.log(`✅ PUBLIC_URL: ${env.PUBLIC_URL}`);
  console.log(`✅ WEBHOOK_SECRET: ${env.WEBHOOK_SECRET.substring(0, 10)}...`);

  // 4. Check if webhook already exists
  const existingWebhook = await prisma.mondayWebhook.findUnique({
    where: {
      orgId_boardId_event: {
        orgId: ORG_ID,
        boardId,
        event: "create_pulse",
      },
    },
  });

  if (existingWebhook && existingWebhook.isActive) {
    console.log(`\n⚠️  Webhook already registered: ${existingWebhook.webhookId}`);
    console.log("   URL:", existingWebhook.url);
    console.log("   Event:", existingWebhook.event);
    console.log("\nIf you want to re-register, delete the webhook first in Monday.com or set isActive=false in DB.");
    return;
  }

  // 5. Register webhook
  console.log("\n📡 Registering webhook...");

  const mondayClient = createMondayClient({
    token: credential.token,
    endpoint: credential.apiEndpoint,
  });

  try {
    const webhookId = await registerMondayWebhook({
      mondayClient,
      boardId,
      webhookUrl: `${env.PUBLIC_URL}/webhooks/monday`,
      event: "create_pulse",
      orgId: ORG_ID,
    });

    console.log("\n✅ Webhook registered successfully!");
    console.log(`   Webhook ID: ${webhookId}`);
    console.log(`   Board ID: ${boardId}`);
    console.log(`   URL: ${env.PUBLIC_URL}/webhooks/monday`);
    console.log(`   Event: create_pulse`);
    console.log("\n🎉 You can now test by creating a new lead in Monday.com!");
  } catch (error: any) {
    console.error("\n❌ Failed to register webhook:");
    console.error(error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

