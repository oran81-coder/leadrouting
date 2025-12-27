import { getPrisma } from "../../../../core/src/db/prisma";

export type RoutingMode = "AUTO" | "MANUAL_APPROVAL";

export interface KPIWeights {
  workload: number;               // Agent's current workload (0-100%)
  conversionHistorical: number;   // Historical conversion rate (0-100%)
  recentPerformance: number;      // Recent performance (0-100%)
  responseTime: number;           // Response speed (0-100%)
  avgTimeToClose: number;         // Average time to close deals (0-100%)
  avgDealSize: number;            // Average deal size (0-100%)
  industryMatch: number;          // Industry expertise (0-100%)
  hotStreak: number;              // Hot streak / velocity (0-100%)
}

export const DEFAULT_KPI_WEIGHTS: KPIWeights = {
  workload: 20,
  conversionHistorical: 25,
  recentPerformance: 15,
  responseTime: 10,
  avgTimeToClose: 10,
  avgDealSize: 10,
  industryMatch: 10,
  hotStreak: 0,
};

export interface RoutingSettings {
  orgId: string;
  mode: RoutingMode;
  kpiWeights: KPIWeights;
}

export class PrismaRoutingSettingsRepo {
  async get(orgId: string): Promise<RoutingSettings> {
    const prisma = getPrisma();
    const row = await prisma.routingSettings.upsert({
      where: { orgId },
      update: {},
      create: { 
        orgId, 
        mode: "MANUAL_APPROVAL" as any,
        kpiWeights: JSON.stringify(DEFAULT_KPI_WEIGHTS),
      },
    });
    
    let kpiWeights = DEFAULT_KPI_WEIGHTS;
    if (row.kpiWeights) {
      try {
        kpiWeights = JSON.parse(row.kpiWeights);
      } catch (e) {
        console.error("[RoutingSettings] Failed to parse KPI weights, using defaults");
      }
    }
    
    return { 
      orgId: row.orgId, 
      mode: row.mode as any,
      kpiWeights,
    };
  }

  async setMode(orgId: string, mode: RoutingMode): Promise<void> {
    const prisma = getPrisma();
    await prisma.routingSettings.upsert({
      where: { orgId },
      update: { mode: mode as any },
      create: { orgId, mode: mode as any },
    });
  }

  async setKPIWeights(orgId: string, weights: KPIWeights): Promise<void> {
    const prisma = getPrisma();
    await prisma.routingSettings.upsert({
      where: { orgId },
      update: { kpiWeights: JSON.stringify(weights) },
      create: { 
        orgId, 
        mode: "MANUAL_APPROVAL" as any,
        kpiWeights: JSON.stringify(weights),
      },
    });
  }

  async updateAll(orgId: string, mode: RoutingMode, weights: KPIWeights): Promise<void> {
    const prisma = getPrisma();
    await prisma.routingSettings.upsert({
      where: { orgId },
      update: { 
        mode: mode as any,
        kpiWeights: JSON.stringify(weights),
      },
      create: { 
        orgId, 
        mode: mode as any,
        kpiWeights: JSON.stringify(weights),
      },
    });
  }
}
