import { getPrisma } from "./packages/core/src/db/prisma";
import { createMondayClient } from "./packages/modules/monday-integration/src/application/monday.clientFactory";
import { PrismaMondayCredentialRepo } from "./packages/modules/monday-integration/src/infrastructure/mondayCredential.repo";
import { logger } from "./packages/core/src/shared/logger";
import { env } from "./apps/api/src/config/env";

const ORG_ID = "org_1";

async function registerWebhook() {
  const prisma = getPrisma();

  try {
    console.log('\n🔗 Registering Monday.com Webhook\n');
    console.log('=' .repeat(60));

    // 1. Check PUBLIC_URL
    const publicUrl = env.PUBLIC_URL;
    if (!publicUrl) {
      console.error('\n❌ PUBLIC_URL is not set in .env');
      console.log('   Set it to your ngrok URL, e.g.:');
      console.log('   PUBLIC_URL=https://your-url.ngrok.io');
      process.exit(1);
    }
    console.log(`✅ PUBLIC_URL: ${publicUrl}`);

    // 2. Get field mapping for board ID
    const mappingRecord = await prisma.fieldMappingConfigVersion.findFirst({
      where: { orgId: ORG_ID },
      orderBy: { version: "desc" },
    });

    if (!mappingRecord) {
      console.error('\n❌ No field mapping found. Please configure field mapping in the Admin UI first.');
      process.exit(1);
    }

    const mapping = JSON.parse(mappingRecord.payload);
    const boardId = mapping.primaryBoardId;
    
    if (!boardId) {
      console.error('\n❌ No primaryBoardId in field mapping.');
      process.exit(1);
    }
    
    console.log(`✅ Primary Board ID: ${boardId}`);

    // 3. Get Monday credentials
    const credRepo = new PrismaMondayCredentialRepo();
    const cred = await credRepo.get(ORG_ID);
    
    if (!cred) {
      console.error('\n❌ Monday.com not connected. Please connect in Admin UI first.');
      process.exit(1);
    }

    console.log(`✅ Monday.com credentials found`);

    // 4. Create Monday client
    const mondayClient = createMondayClient({
      token: cred.token,
      endpoint: cred.endpoint
    });

    // 5. Clean up old webhooks
    console.log('\n🧹 Cleaning up old webhooks...');
    const existingWebhooks = await prisma.mondayWebhook.findMany({
      where: {
        orgId: ORG_ID,
        boardId: boardId,
        event: "create_pulse",
      },
    });

    for (const webhook of existingWebhooks) {
      console.log(`   Removing old webhook: ${webhook.webhookId}`);
      try {
        // Try to delete from Monday.com
        const mutation = `mutation { delete_webhook (id: ${webhook.webhookId}) { id } }`;
        await mondayClient.query(mutation);
      } catch (e: any) {
        console.log(`   (Already deleted or invalid: ${e.message})`);
      }
      // Remove from DB
      await prisma.mondayWebhook.delete({ where: { id: webhook.id } });
    }
    console.log(`✅ Cleaned up ${existingWebhooks.length} old webhooks`);

    // 6. Register new webhook
    console.log('\n📡 Registering new webhook...');
    const webhookUrl = `${publicUrl}/webhooks/monday`;
    
    const mutation = `
      mutation {
        create_webhook (
          board_id: ${boardId},
          url: "${webhookUrl}",
          event: create_pulse
        ) {
          id
          board_id
        }
      }
    `;

    const result = await mondayClient.query(mutation);
    const webhookId = result.data.create_webhook.id;

    console.log(`✅ Webhook created on Monday.com!`);
    console.log(`   Webhook ID: ${webhookId}`);

    // 7. Save to database
    await prisma.mondayWebhook.create({
      data: {
        orgId: ORG_ID,
        boardId: boardId,
        webhookId: webhookId,
        url: webhookUrl,
        event: "create_pulse",
        isActive: true,
      },
    });

    console.log(`✅ Webhook saved to database!`);

    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 SUCCESS!\n');
    console.log(`Webhook is now active for board ${boardId}`);
    console.log(`URL: ${webhookUrl}`);
    console.log(`\nTest: Add a new item to your Monday.com board and it should`);
    console.log(`appear in the Manager Screen automatically!\n`);

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    logger.error("Failed to register webhook", { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

registerWebhook();
