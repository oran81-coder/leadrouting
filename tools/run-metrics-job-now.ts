// Load .env before importing anything
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { recomputeMetricsNow } from "../apps/api/src/services/metricsJob";

async function main() {
  console.log("\n🚀 Running MetricsJob manually...\n");
  
  try {
    const result = await recomputeMetricsNow();
    
    if (result.ok === false) {
      console.error(`❌ MetricsJob failed: ${result.message}`);
    } else {
      console.log("\n✅ MetricsJob completed successfully!");
      console.log(`   Check Outcomes page now - you should see data!\n`);
    }
  } catch (error: any) {
    console.error(`❌ Error running MetricsJob:`, error.message);
    throw error;
  }
}

main().catch(console.error);

