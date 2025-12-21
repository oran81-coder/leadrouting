export type ManagerProposalDTO = {
  id: string;
  status: string;
  createdAt: string;
  boardId: string;
  itemId: string;
  suggestedAssigneeRaw: string | null;
  suggestedRuleName: string | null;
  normalizedValues: unknown;
  explains: unknown;
};


export type RoutingPreviewAgent = {
  agentUserId: string;
  agentName: string;
  score: number;
  breakdown: Record<string, number>;
};

export type RoutingPreviewLead = {
  boardId: string;
  itemId: string;
  name: string;
  industry: string | null;
};

export type RoutingPreviewResult = {
  lead: RoutingPreviewLead;
  agents: RoutingPreviewAgent[];
  winner: { agentUserId: string; agentName: string; score: number } | null;
};

const DEFAULT_API_BASE = "http://localhost:3001"; // change if needed

export function getApiBase(): string {
  return (localStorage.getItem("apiBase") || DEFAULT_API_BASE).trim();
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...(getApiKey() ? { "x-api-key": getApiKey() } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json as T;
}

export async function listProposals(params: {
  status?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ items: ManagerProposalDTO[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.cursor) q.set("cursor", params.cursor);
  const data = await http<{ ok: boolean; items: ManagerProposalDTO[]; nextCursor: string | null }>(
    `/manager/proposals?${q.toString()}`
  );
  return { items: data.items, nextCursor: data.nextCursor };
}

export async function approve(id: string): Promise<void> {
  await http(`/manager/proposals/${encodeURIComponent(id)}/approve`, { method: "POST", body: "{}" });
}

export async function reject(id: string): Promise<void> {
  await http(`/manager/proposals/${encodeURIComponent(id)}/reject`, { method: "POST", body: "{}" });
}

export async function overrideAndApply(id: string, assigneeValue: string): Promise<void> {
  await http(`/manager/proposals/${encodeURIComponent(id)}/override`, {
    method: "POST",
    body: JSON.stringify({ assigneeValue, applyNow: true }),
  });
}

export async function approveAllFiltered(status: string, maxTotal = 200): Promise<{ processed: number }> {
  const data = await http<{ ok: boolean; processed: number }>(`/manager/proposals/approve-all`, {
    method: "POST",
    body: JSON.stringify({ status, maxTotal }),
  });
  return { processed: data.processed };
}


export function getApiKey(): string {
  return (localStorage.getItem('apiKey') || '').trim();
}


export async function adminMondayStatus(): Promise<any> {
  return await http(`/admin/monday/status`);
}

export async function adminMondayConnect(token: string, endpoint?: string): Promise<any> {
  return await http(`/admin/monday/connect`, { method: "POST", body: JSON.stringify({ token, endpoint }) });
}

export async function adminMondayTest(): Promise<any> {
  return await http(`/admin/monday/test`, { method: "POST", body: "{}" });
}


export type MetricsConfigDTO = {
  leadBoardIds: string;
  assignedPeopleColumnId?: string | null;

  // toggles
  enableIndustryPerf: boolean;
  enableConversion: boolean;
  enableAvgDealSize: boolean;
  enableHotStreak: boolean;
  enableResponseSpeed: boolean;
  enableBurnout: boolean;
  enableAvailabilityCap: boolean;

  // windows
  conversionWindowDays: number;
  avgDealWindowDays: number;
  responseWindowDays: number;

  // thresholds
  hotStreakWindowHours: number;
  hotStreakMinDeals: number;
  burnoutWinDecayHours: number;
  burnoutActivityDecayHours: number;

  // weights
  weightIndustryPerf: number;
  weightConversion: number;
  weightAvgDeal: number;
  weightHotStreak: number;
  weightResponseSpeed: number;
  weightBurnout: number;
  weightAvailabilityCap: number;

  // mappings
  contactedStatusColumnId?: string | null;
  contactedStatusValue?: string | null;
  nextCallDateColumnId?: string | null;
  closedWonStatusColumnId?: string | null;
  closedWonStatusValue?: string | null;
  dealAmountColumnId?: string | null;
  industryColumnId?: string | null;
};

export async function getMetricsConfig(): Promise<MetricsConfigDTO> {
  const json = await request<{ ok: boolean; config: MetricsConfigDTO }>("/metrics/config", {
    method: "GET",
  });
  return json.config;
}

export async function updateMetricsConfig(patch: Partial<MetricsConfigDTO>): Promise<any> {
  return request("/metrics/config", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function recomputeMetrics(): Promise<any> {
  return request("/metrics/recompute", {
    method: "POST",
  });
}


export type MondayBoardDTO = { id: string; name: string };
export type MondayColumnDTO = { id: string; title: string; type: string; settings_str?: string | null };
export type MondayStatusLabelDTO = { key: string; label: string };

export async function listMondayBoards(): Promise<MondayBoardDTO[]> {
  const json = await request<{ ok: boolean; boards: MondayBoardDTO[] }>("/monday/boards", { method: "GET" });
  return json.boards;
}

export async function listMondayBoardColumns(boardId: string): Promise<MondayColumnDTO[]> {
  const json = await request<{ ok: boolean; columns: MondayColumnDTO[] }>(`/monday/boards/${boardId}/columns`, { method: "GET" });
  return json.columns;
}

export async function listMondayStatusLabels(boardId: string, columnId: string): Promise<MondayStatusLabelDTO[]> {
  const json = await request<{ ok: boolean; labels: MondayStatusLabelDTO[] }>(`/monday/boards/${boardId}/status/${columnId}/labels`, { method: "GET" });
  return json.labels;
}


export async function previewRouting(limit: number = 10): Promise<{ results: RoutingPreviewResult[] }> {
  const data = await http<{ ok: boolean; limit: number; results: RoutingPreviewResult[] }>(`/routing/preview`, {
    method: "POST",
    body: JSON.stringify({ limit }),
  });
  return { results: data.results };
}
