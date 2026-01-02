import { PrismaClient } from "@prisma/client";

async function checkMetricsConfigSchema() {
  const prisma = new PrismaClient();
  
  console.log("\n=== Check MetricsConfig table schema ===");
  const result = await prisma.$queryRawUnsafe(`
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='MetricsConfig';
  `);
  console.log(JSON.stringify(result, null, 2));
  
  console.log("\n=== Check existing MetricsConfig records ===");
  const configs = await prisma.metricsConfig.findMany();
  console.log(JSON.stringify(configs, null, 2));
  
  await prisma.$disconnect();
}

checkMetricsConfigSchema().catch(console.error);

