
import { PrismaClient } from '@prisma/client';
import { createMondayClientForOrg } from "./packages/modules/monday-integration/src/application/monday.orgClient";
import { PrismaMetricsConfigRepo } from "./apps/api/src/infrastructure/metricsConfig.repo";
// Mock minimal env for config
process.env.INTERNAL_BASE_URL = "http://localhost:3000";

const prisma = new PrismaClient();

function parseBoardIds(raw: string | null | undefined): string[] {
    const s = String(raw ?? "").trim();
    if (!s) return [];
    try {
        const j = JSON.parse(s);
        if (Array.isArray(j)) return j.map((x) => String(x)).filter(Boolean);
    } catch { }
    return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function isUnassignedPeopleValue(raw: any): boolean {
    if (raw == null) return true;
    try {
        const v = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!v) return true;
        const arr = (v as any).personsAndTeams;
        if (!Array.isArray(arr) || arr.length === 0) return true;
        return false;
    } catch {
        return String(raw).trim().length === 0;
    }
}

async function main() {
    console.log("🔍 STARTING INGESTION DIAGNOSIS 🔍");

    // 1. Get Config
    const cfgRepo = new PrismaMetricsConfigRepo();
    const allConfigs = await prisma.metricsConfig.findMany({
        where: { leadBoardIds: { not: "" } }
    });

    if (allConfigs.length === 0) {
        console.log("❌ CRITICAL: No active configuration found (no board IDs).");
        return;
    }

    const cfg = allConfigs[0];
    const ORG_ID = cfg.orgId;
    console.log(`✅ Using Org ID: ${ORG_ID}`);

    const boardIds = parseBoardIds(cfg.leadBoardIds);
    console.log(`📋 Configured Board IDs: ${boardIds.join(', ')}`);

    // 2. Fetch from Monday
    console.log("\n📡 Fetching recent items from Monday.com...");
    const client = await createMondayClientForOrg(ORG_ID);

    // Fetch last 10 items
    const LIMIT = 10;
    const samples = await (client as any).fetchBoardSamples(boardIds, LIMIT);

    if (!samples || samples.length === 0) {
        console.log("❌ No items returned from Monday.");
        return;
    }

    const assignedColId = String(cfg.assignedPeopleColumnId ?? "").trim();
    console.log(`Configured 'Assigned' Column ID: ${assignedColId || '(None)'}`);

    // 3. Analyze Items
    console.log(`\n🧐 ANALYZING LAST ${LIMIT} ITEMS:`);

    for (const b of samples || []) {
        const bid = String((b as any).boardId);
        console.log(`\n--- Board ${bid} ---`);

        for (const it of (b as any).items || []) {
            const itemId = String(it.id);
            const itemName = String(it.name || "Unknown");
            const colVals = it.column_values || [];

            // Check "Assigned" status
            const assignedCol = assignedColId ? colVals.find((c: any) => String(c.id) === assignedColId) : null;
            const assignedValue = assignedCol ? assignedCol.value : null;
            const assignedText = assignedCol ? String(assignedCol.text ?? "").trim() : "";
            const isUnassigned = !assignedColId ? true : isUnassignedPeopleValue(assignedValue);

            // Check DB status
            const inDB = await prisma.leadFact.findUnique({
                where: { orgId_boardId_itemId: { orgId: ORG_ID, boardId: bid, itemId } }
            });

            console.log(`🔹 Lead: "${itemName}" (ID: ${itemId})`);
            console.log(`   - Monday Status: ${isUnassigned ? '✅ UNASSIGNED' : '⚠️ ASSIGNED (' + assignedText + ')'}`);
            console.log(`   - Logic: ${isUnassigned ? 'Should Process' : 'SKIPPED (Poller avoids assigned leads)'}`);
            console.log(`   - Database: ${inDB ? '✅ Found' : '❌ NOT IN DB'}`);
            if (inDB) {
                console.log(`     -> DB Assigned: ${inDB.assignedUserId || '(null)'}`);
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
