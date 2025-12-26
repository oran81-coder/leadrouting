export type ManagerProposalDTO = {
  id: string;
  status: string;
  createdAt: string;
  boardId: string;
  itemId: string;
  itemName: string | null; // Name of the lead/item from Monday.com
  suggestedAssigneeRaw: string | null;
  suggestedAssigneeName: string | null; // Resolved name from Monday users cache
  suggestedRuleName: string | null;
  matchScore: number | null; // Match score from explainability
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
  // For development: use default API key if none is set
  const DEFAULT_DEV_API_KEY = 'dev_key_123';
  
  // Check if API key is in localStorage
  const storedKey = localStorage.getItem('apiKey');
  
  // If no key stored, use development default (localhost only)
  if (!storedKey || storedKey.trim() === '') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      console.log('🔑 Using default development API key. Set custom key via Settings if needed.');
      return DEFAULT_DEV_API_KEY;
    }
  }
  
  return (storedKey || '').trim();
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

// DEPRECATED: Use getKPIWeights() instead
// Kept for backward compatibility during migration
export async function getMetricsConfig(): Promise<MetricsConfigDTO> {
  console.warn("getMetricsConfig() is deprecated. Use getKPIWeights() instead.");
  // Return empty config to avoid 404 errors
  return {
    leadBoardIds: "",
    enableIndustryPerf: true,
    enableConversion: true,
    enableAvgDealSize: true,
    enableHotStreak: true,
    enableResponseSpeed: true,
    enableBurnout: true,
    enableAvailabilityCap: true,
    conversionWindowDays: 30,
    avgDealWindowDays: 90,
    responseWindowDays: 30,
  };
}

// DEPRECATED: Use saveKPIWeights() instead
export async function updateMetricsConfig(patch: Partial<MetricsConfigDTO>): Promise<any> {
  console.warn("updateMetricsConfig() is deprecated. Use saveKPIWeights() instead.");
  return { ok: true };
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
  return json.labels || [];
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

// ============================================================================
// Field Mapping API
// ============================================================================

export interface BoardColumnRef {
  boardId: string;
  columnId: string;
  columnType?: string;
}

export interface ColumnRef {
  columnId: string;
  columnType?: string;
}

export interface InternalFieldDefinition {
  id: string;
  label: string;
  type: string;
  required: boolean;
  isCore: boolean;
  isEnabled: boolean;
  description?: string;
  group?: string;
}

export interface StatusConfig {
  closedWonStatuses: string[];
  closedLostStatuses?: string[];
  excludedStatuses?: string[];
  // Note: "In Treatment" is auto-detected as: (Assigned to Agent) AND NOT (Won/Lost/Excluded)
  // Note: First Contact is auto-detected from Updates/Activity Log
}

export interface WritebackTargets {
  assignedAgent: BoardColumnRef;
  routingStatus?: BoardColumnRef;
  routingReason?: BoardColumnRef;
}

export interface FieldMappingConfig {
  version: number;
  updatedAt: string;
  primaryBoardId?: string; // Phase 2: Single Board
  primaryBoardName?: string;
  mappings: Record<string, BoardColumnRef | ColumnRef>;
  fields: InternalFieldDefinition[];
  writebackTargets: WritebackTargets;
  statusConfig?: StatusConfig; // Phase 2: Smart automation
}

export async function getMappingConfig(): Promise<FieldMappingConfig | null> {
  const data = await http<{ config: FieldMappingConfig | null }>(`/mapping`);
  return data.config;
}

export async function saveMappingConfig(config: FieldMappingConfig): Promise<{ version: number }> {
  const data = await http<{ ok: boolean; version: number }>(`/mapping`, {
    method: "POST",
    body: JSON.stringify({ config }),
  });
  return { version: data.version };
}

export async function getMappingBoards(): Promise<MondayBoardDTO[]> {
  const data = await http<{ ok: boolean; boards: MondayBoardDTO[] }>(`/monday/boards`);
  return data.boards || [];
}

export interface MappingPreviewResult {
  ok: boolean;
  orgId?: string;
  schemaVersion?: number;
  mappingVersion?: number;
  hasErrors?: boolean;
  rows?: Array<{
    entity: string;
    normalizedFields: Record<string, any>;
    normalizationErrors?: string[];
  }>;
  debug?: { source: string };
  error?: string;
}

export async function previewMapping(): Promise<MappingPreviewResult> {
  return await http<MappingPreviewResult>(`/mapping/preview`, {
    method: "POST",
    body: "{}",
  });
}

// ============================================
// Phase 2: KPI Weights API
// ============================================

export interface KPIWeights {
  domainExpertise: number;
  availability: number;
  conversionHistorical: number;
  recentPerformance: number;
  avgDealSize: number;
  responseTime: number;
  avgTimeToClose: number;
  hotAgent: number;
}

export interface KPISettings {
  hotAgentMinDeals: number;
  hotAgentWindowDays: number;
  recentPerfWindowDays: number;
  dailyLeadThreshold: number;
}

export interface KPIWeightsResponse {
  ok: boolean;
  weights: KPIWeights;
  settings: KPISettings;
}

export async function getKPIWeights(): Promise<KPIWeightsResponse> {
  return await http<KPIWeightsResponse>(`/kpi-weights`);
}

export async function saveKPIWeights(weights: KPIWeights, settings: KPISettings): Promise<{ ok: boolean }> {
  return await http<{ ok: boolean }>(`/kpi-weights`, {
    method: "POST",
    body: JSON.stringify({ weights, settings }),
  });
}

// ============================================================================
// Performance Metrics API
// ============================================================================

export interface MetricValue {
  type: 'counter' | 'gauge' | 'histogram';
  value?: number;
  values?: any[];
}

export interface MetricsResponse {
  ok: boolean;
  timestamp: string;
  metrics: Record<string, MetricValue>;
  error?: string;
}

/**
 * Fetch performance metrics in JSON format
 */
export async function getPerformanceMetrics(): Promise<MetricsResponse> {
  return await http<MetricsResponse>(`/metrics/json`);
}
