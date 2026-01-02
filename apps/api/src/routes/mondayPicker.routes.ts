import { Router } from "express";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";

const ORG_ID = process.env.DEFAULT_ORG_ID || "cmjq2ces90000rbcw8s5iqlcz";

function safeJsonParse(s: string | null | undefined) {
  try {
    if (!s) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function mondayPickerRoutes() {
  const r = Router();

  r.get("/boards", async (_req, res) => {
    const client = await createMondayClientForOrg(ORG_ID);
    const boards = await (client as any).listBoards(200);
    return res.json({ ok: true, boards });
  });

  r.get("/boards/:boardId/columns", async (req, res) => {
    const client = await createMondayClientForOrg(ORG_ID);
    const cols = await (client as any).listBoardColumns(String(req.params.boardId));
    return res.json({ ok: true, columns: cols });
  });

  r.get("/boards/:boardId/status/:columnId/labels", async (req, res) => {
    const client = await createMondayClientForOrg(ORG_ID);
    const cols = await (client as any).listBoardColumns(String(req.params.boardId));
    const col = cols.find((c: any) => String(c.id) === String(req.params.columnId));
    if (!col) return res.status(404).json({ ok: false, error: "COLUMN_NOT_FOUND" });

    const settings = safeJsonParse(col.settings_str);
    // Monday status settings: { labels: { "0":"Done", ... }, labels_colors: ... }
    const labels = settings?.labels ?? {};
    const out = Object.entries(labels).map(([k, v]) => ({ key: String(k), label: String(v) }));
    return res.json({ ok: true, labels: out });
  });

  return r;
}
