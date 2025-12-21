import { optionalEnv } from "../config/env";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { PrismaIndustryWatchRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/industryWatch.repo";

const ORG_ID = "org_1";

function numEnv(name: string, def: number) {
  const v = optionalEnv(name, "");
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function listEnv(name: string): string[] {
  const v = optionalEnv(name, "");
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export function startIndustryPoller() {
  const enabled = optionalEnv("POLL_INDUSTRY_ENABLED", "true") !== "false";
  if (!enabled) return;

  const intervalSec = numEnv("POLL_INTERVAL_SECONDS", 300);
  const limitPerBoard = numEnv("POLL_LIMIT_PER_BOARD", 100);
  const boardIds = listEnv("POLL_BOARD_IDS");
  const industryColumnId = optionalEnv("POLL_INDUSTRY_COLUMN_ID", "");

  if (!boardIds.length) {
    // eslint-disable-next-line no-console
    console.warn("[industry-poller] POLL_BOARD_IDS is empty. Poller is idle.");
    return;
  }
  if (!industryColumnId) {
    // eslint-disable-next-line no-console
    console.warn("[industry-poller] POLL_INDUSTRY_COLUMN_ID is empty. Poller is idle.");
    return;
  }

  const repo = new PrismaIndustryWatchRepo();

  async function triggerReeval(boardId: string, itemId: string) {
    const apiPort = numEnv("API_PORT", 3001);
    const apiKey = optionalEnv("ROUTING_API_KEY", "");
    const base = `http://localhost:${apiPort}`;

    const res = await fetch(`${base}/routing/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({ boardId, itemId, triggerReason: "INDUSTRY_CHANGED", forceManual: true }),
    });

    // If it fails, we just log. Next tick will retry (or manager can handle).
    if (!res.ok) {
      const t = await res.text();
      // eslint-disable-next-line no-console
      console.error("[industry-poller] execute failed", res.status, t);
    }
  }

  async function tick() {
    try {
      const client = await createMondayClientForOrg(ORG_ID);
      const samples = await (client as any).fetchBoardSamples(boardIds as any, limitPerBoard);

      for (const b of samples) {
        const boardId = String(b.boardId);
        for (const item of b.items ?? []) {
          const itemId = String(item.id);
          const cv = (item.columnValues ?? []).find((c: any) => String(c.id) === industryColumnId);
          const industry = (cv?.text ?? "").trim() || null;

          const prev = await repo.get(ORG_ID, boardId, itemId);
          if (!prev) {
            await repo.upsert(ORG_ID, boardId, itemId, { lastIndustry: industry });
            continue;
          }

          const prevVal = (prev.lastIndustry ?? "").trim() || null;
          const changed = prevVal !== industry;

          await repo.upsert(ORG_ID, boardId, itemId, { lastIndustry: industry });

          if (changed) {
            // eslint-disable-next-line no-console
            console.log("[industry-poller] industry changed", { boardId, itemId, prevVal, industry });
            await triggerReeval(boardId, itemId);
          }
        }
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[industry-poller] tick error", e?.message ?? e);
    }
  }

  void tick();
  setInterval(() => void tick(), intervalSec * 1000);
}
