import { optionalEnv } from "../config/env";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { PrismaLeadFactRepo } from "../infrastructure/leadFact.repo";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";

function parseBoardIds(raw: string | null | undefined): string[] {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j)) return j.map((x) => String(x)).filter(Boolean);
  } catch {}
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

async function callExecute(boardId: string, itemId: string) {
  const port = process.env.PORT
    ? Number(process.env.PORT)
    : process.env.API_PORT
      ? Number(process.env.API_PORT)
      : 3000;
  const base = optionalEnv("INTERNAL_BASE_URL", `http://localhost:${port}`);
  const headers: Record<string, string> = { "content-type": "application/json" };
  const apiKey = optionalEnv("ROUTING_API_KEY", "");
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(`${base}/routing/execute`, {
    method: "POST",
    headers,
    body: JSON.stringify({ boardId, itemId }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error ?? `Execute failed (${res.status})`);
  return j;
}

export function startLeadIntakePoller() {
  const seconds = Number(optionalEnv("LEAD_INTAKE_POLL_SECONDS", "120"));
  const limitPerBoard = Number(optionalEnv("LEAD_INTAKE_LIMIT_PER_BOARD", "500"));
  if (!seconds || seconds < 15) return;

  const tick = async () => {
    try {
      const cfgRepo = new PrismaMetricsConfigRepo();
      const cfg = await cfgRepo.getOrCreateDefaults();

      const boardIds = parseBoardIds((cfg as any).leadBoardIds);
      if (boardIds.length === 0) return;

      const assignedColId = String((cfg as any).assignedPeopleColumnId ?? "").trim();
      const client = await createMondayClientForOrg("org_1");
      const samples = await (client as any).fetchBoardSamples(boardIds, limitPerBoard);

      const leadRepo = new PrismaLeadFactRepo();

      for (const b of samples || []) {
        const bid = String((b as any).boardId);
        for (const it of (b as any).items || []) {
          const itemId = String(it.id);
          const colVals = it.column_values || [];
          const assignedCol = assignedColId ? colVals.find((c: any) => String(c.id) === assignedColId) : null;
          const assignedValue = assignedCol ? assignedCol.value : null;
          const assignedText = assignedCol ? String(assignedCol.text ?? "").trim() : "";
          const isUnassigned = !assignedColId ? true : isUnassignedPeopleValue(assignedValue);

          const existing = await leadRepo.get(bid, itemId);
          if (!existing?.enteredAt) {
            await leadRepo.upsert(bid, itemId, { enteredAt: new Date() });
          }

          if (!isUnassigned) {
            if (!existing?.assignedUserId) {
              let userId = assignedText;
              try {
                const v = assignedValue ? (typeof assignedValue === "string" ? JSON.parse(assignedValue) : assignedValue) : null;
                const arr = v?.personsAndTeams;
                if (Array.isArray(arr) && arr.length > 0 && arr[0]?.id) userId = String(arr[0].id);
              } catch {}
              await leadRepo.upsert(bid, itemId, { assignedUserId: userId });
            }
            continue;
          }

          if (existing?.assignedUserId) continue;

          try {
            await callExecute(bid, itemId);
          } catch {
            // retry next tick
          }
        }
      }
    } catch {
      // retry next tick
    }
  };

  setTimeout(() => void tick(), 2500);
  setInterval(() => void tick(), seconds * 1000);
}
