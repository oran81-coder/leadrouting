import { getPrisma } from "./packages/core/src/db/prisma";
import { createMondayClient } from "./packages/modules/monday-integration/src/application/monday.clientFactory";
import { PrismaMondayCredentialRepo } from "./packages/modules/monday-integration/src/infrastructure/mondayCredential.repo";
import { registerMondayWebhook } from "./packages/modules/monday-integration/src/application/monday.webhooks";
import { logger } from "./packages/core/src/shared/logger";

const ORG_ID = "org_1";

async function main() {
  const prisma = getPrisma();

  try {
    console.log("🔍 בודק הגדרות...");

    // 1. Check PUBLIC_URL and WEBHOOK_SECRET
    const publicUrl = process.env.PUBLIC_URL;
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!publicUrl || !webhookSecret) {
      console.error("❌ חסרים הגדרות: PUBLIC_URL או WEBHOOK_SECRET לא מוגדרים ב-.env");
      process.exit(1);
    }

    console.log(`✅ PUBLIC_URL: ${publicUrl}`);
    console.log(`✅ WEBHOOK_SECRET: ${webhookSecret}`);

    // 2. Get field mapping config to find boardId
    const mappingRecord = await prisma.fieldMappingConfigVersion.findFirst({
      where: { orgId: ORG_ID },
      orderBy: { version: "desc" },
    });

    if (!mappingRecord) {
      console.error("❌ לא נמצאה הגדרת מיפוי");
      process.exit(1);
    }

    const mapping = JSON.parse(mappingRecord.payload);
    
    if (!mapping.primaryBoardId) {
      console.error("❌ לא נמצא primaryBoardId בהגדרות המיפוי");
      process.exit(1);
    }

    console.log(`✅ Board ID: ${mapping.primaryBoardId}`);

    // 3. Get Monday.com credentials and create client
    const credRepo = new PrismaMondayCredentialRepo();
    const cred = await credRepo.get(ORG_ID);
    if (!cred) {
      console.error("❌ Monday.com לא מחובר (חסרים credentials)");
      process.exit(1);
    }
    
    const mondayClient = createMondayClient({ 
      token: cred.token, 
      endpoint: cred.endpoint 
    });
    console.log("✅ Monday.com client נוצר בהצלחה");

    // 4. Register webhook
    console.log("\n📡 רושם webhook...");
    const webhookId = await registerMondayWebhook({
      mondayClient,
      boardId: mapping.primaryBoardId,
      webhookUrl: `${publicUrl}/webhooks/monday`,
      event: "create_pulse",
      orgId: ORG_ID,
    });

    console.log(`\n✅ Webhook נרשם בהצלחה!`);
    console.log(`   Webhook ID: ${webhookId}`);
    console.log(`   Board ID: ${mapping.primaryBoardId}`);
    console.log(`   URL: ${publicUrl}/webhooks/monday`);

    // 5. Verify in database
    const dbWebhook = await prisma.mondayWebhook.findUnique({
      where: {
        orgId_boardId_event: {
          orgId: ORG_ID,
          boardId: mapping.primaryBoardId,
          event: "create_pulse",
        },
      },
    });

    if (dbWebhook) {
      console.log(`\n✅ Webhook נשמר במאגר הנתונים:`);
      console.log(`   ID: ${dbWebhook.id}`);
      console.log(`   Active: ${dbWebhook.isActive}`);
      console.log(`   Created: ${dbWebhook.createdAt}`);
    }

    console.log(`\n🎉 סיימנו! המערכת מוכנה לקבל לידים חדשים`);
    console.log(`\n📝 כדי לבדוק: הוסף ליד חדש ב-Monday.com ובדוק את Manager Screen`);

  } catch (error: any) {
    console.error(`\n❌ שגיאה: ${error.message}`);
    logger.error("Failed to register webhook", { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
