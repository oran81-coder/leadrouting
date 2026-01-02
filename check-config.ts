
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const config = await prisma.metricsConfig.findFirst();

    if (!config) {
        console.log("No MetricsConfig found!");
        return;
    }

    console.log("--- Current Metrics Configuration ---");
    console.log(`Closed Won Status Value: "${config.closedWonStatusValue}"`);
    console.log(`Closed Won Column ID: "${config.closedWonStatusColumnId}"`);
    console.log(`Conversion Window: ${config.conversionWindowDays} days`);
}

main().finally(() => prisma.$disconnect());
