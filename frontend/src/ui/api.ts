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

const DEFAULT_API_BASE = "http://localhost:3000"; // change if needed

export function getApiBase(): string {
  return (localStorage.getItem("apiBase") || DEFAULT_API_BASE).trim();
}

// Get auth token (imported dynamically to avoid circular dependency)
function getAuthToken(): string | null {
  return localStorage.getItem("lead_routing_access_token");
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const token = getAuthToken();
  
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...(getApiKey() ? { "x-api-key": getApiKey() } : {}),
      // Add JWT token if available (Phase 5.1)
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
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

export interface MondayUser {
  id: string;
  name: string;
  email: string;
}

export async function getMondayUsers(): Promise<MondayUser[]> {
  const data = await http<{ ok: boolean; users: MondayUser[] }>(`/admin/monday/users`);
  return data.users || [];
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
  const json = await http<{ ok: boolean; config: MetricsConfigDTO }>("/metrics/config", {
    method: "GET",
  });
  return json.config;
}

export async function updateMetricsConfig(patch: Partial<MetricsConfigDTO>): Promise<any> {
  return http("/metrics/config", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function recomputeMetrics(): Promise<any> {
  return http("/metrics/recompute", {
    method: "POST",
  });
}


export type MondayBoardDTO = { id: string; name: string };
export type MondayColumnDTO = { id: string; title: string; type: string; settings_str?: string | null };
export type MondayStatusLabelDTO = { key: string; label: string };

export async function listMondayBoards(): Promise<MondayBoardDTO[]> {
  const json = await http<{ ok: boolean; boards: MondayBoardDTO[] }>("/monday/boards", { method: "GET" });
  return json.boards;
}

export async function listMondayBoardColumns(boardId: string): Promise<MondayColumnDTO[]> {
  const json = await http<{ ok: boolean; columns: MondayColumnDTO[] }>(`/monday/boards/${boardId}/columns`, { method: "GET" });
  return json.columns;
}

export async function listMondayStatusLabels(boardId: string, columnId: string): Promise<MondayStatusLabelDTO[]> {
  const json = await http<{ ok: boolean; labels: MondayStatusLabelDTO[] }>(`/monday/boards/${boardId}/status/${columnId}/labels`, { method: "GET" });
  return json.labels;
}


export async function previewRouting(limit: number = 10): Promise<{ results: RoutingPreviewResult[] }> {
  const data = await http<{ ok: boolean; limit: number; results: RoutingPreviewResult[] }>(`/routing/preview`, {
    method: "POST",
    body: JSON.stringify({ limit }),
  });
  return { results: data.results };
}


// ========================================
// Outcomes API (Phase 1.7)
// ========================================

export type OutcomesKPIsDTO = {
  assigned: number;
  closedWon: number;
  conversionRate: number;
  medianTimeToCloseDays: number | null;
  revenue: number | null;
  avgDeal: number | null;
};

export type OutcomesPerAgentDTO = {
  agentUserId: string;
  agentName: string;
  assigned: number;
  closedWon: number;
  conversionRate: number;
  revenue: number | null;
  avgDeal: number | null;
  medianTimeToCloseDays: number | null;
};

export type OutcomesSummaryDTO = {
  ok: boolean;
  windowDays: number;
  kpis: OutcomesKPIsDTO;
  perAgent: OutcomesPerAgentDTO[];
  comparison: null;
};

export async function getOutcomesSummary(params: {
  windowDays?: 7 | 30 | 90;
  mode?: string;
  boardId?: string;
}): Promise<OutcomesSummaryDTO> {
  const q = new URLSearchParams();
  if (params.windowDays) q.set("windowDays", String(params.windowDays));
  if (params.mode) q.set("mode", params.mode);
  if (params.boardId) q.set("boardId", params.boardId);
  return await http<OutcomesSummaryDTO>(`/outcomes/summary?${q.toString()}`);
}
