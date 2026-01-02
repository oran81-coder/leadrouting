export type ManagerProposalDTO = {
  id: string;
  status: string;
  createdAt: string;
  boardId: string;
  boardName: string | null; // Board name from cache
  itemId: string;
  itemName: string | null; // Name of the lead/item from Monday.com
  suggestedAssigneeRaw: string | null;
  suggestedAssigneeName: string | null; // Resolved name from Monday users cache
  suggestedRuleName: string | null;
  matchScore: number | null; // Match score from explainability
  normalizedValues: unknown;
  explains: unknown;

  // Decision metadata (Phase 1.8)
  decidedBy?: string | null;
  decidedAt?: string | null;
  decisionNotes?: string | null;

  // Applied metadata
  appliedAt?: string | null;
  appliedAssigneeRaw?: string | null;

  // Data updates (for re-scoring tracking - Phase 1.9)
  dataUpdatedAt?: string | null;
  dataChanges?: unknown;
  wasRescored?: boolean;
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
  const json = await http<{ ok: boolean; boards: MondayBoardDTO[] }>("/admin/monday/boards", { method: "GET" });
  return json.boards;
}

export async function listMondayBoardColumns(boardId: string): Promise<MondayColumnDTO[]> {
  const json = await http<{ ok: boolean; columns: MondayColumnDTO[] }>(`/admin/monday/boards/${boardId}/columns`, { method: "GET" });
  return json.columns;
}

export async function listMondayStatusLabels(boardId: string, columnId: string): Promise<MondayStatusLabelDTO[]> {
  const json = await http<{ ok: boolean; labels: MondayStatusLabelDTO[] }>(`/admin/monday/boards/${boardId}/status/${columnId}/labels`, { method: "GET" });
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
// Historical Preview API
// ========================================

export type HistoricalPreviewLead = {
  boardId: string;
  itemId: string;
  name: string;
  industry: string;
  status: string;
  wasClosedWon: boolean;
  closedWonAt: string | null;
  enteredAt: string | null;
  assignedTo: {
    userId: string;
    name: string;
  } | null;
  recommendedTo: {
    userId: string;
    name: string;
  } | null;
  score: number;
  breakdown: Record<string, number>;
  followedRecommendation: boolean | null;
};

export type HistoricalPreviewSummary = {
  totalLeads: number;
  routedLeads: number;
  closedWonLeads: number;
  systemSuccessRate: number; // percentage
  currentSuccessRate: number; // percentage
  improvement: number; // percentage points
};

export type HistoricalPreviewResponse = {
  ok: boolean;
  windowDays: number;
  hasClosedWonMapping: boolean;
  summary: HistoricalPreviewSummary;
  leads: HistoricalPreviewLead[];
};

export async function fetchHistoricalPreview(windowDays: 30 | 60 | 90): Promise<HistoricalPreviewResponse> {
  return await http<HistoricalPreviewResponse>(`/preview/historical`, {
    method: "POST",
    body: JSON.stringify({ windowDays }),
  });
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

  // Additional metrics from Agent Profile
  avgResponseTime: number | null; // Seconds
  availability: number | null; // 0-1 scale
  currentActiveLeads: number | null;
  dailyLeadsToday: number | null;
  hotStreakCount: number | null;
  hotStreakActive: boolean | null;
  burnoutScore: number | null; // 0-100
  industryExpertise: string[] | null; // Array of industries
  totalLeadsHandled: number | null;
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

export async function saveInternalSchema(schema: { version: number; updatedAt: string; fields: any[] }): Promise<{ version: number }> {
  const data = await http<{ ok: boolean; version: number }>(`/admin/schema`, {
    method: "POST",
    body: JSON.stringify(schema),
  });
  return { version: data.version };
}

export async function getMappingBoards(): Promise<MondayBoardDTO[]> {
  const data = await http<{ ok: boolean; boards: MondayBoardDTO[] }>(`/admin/monday/boards`);
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
// Routing Mode API
// ============================================================================

export type RoutingMode = "MANUAL_APPROVAL" | "AUTO";

export interface RoutingModeResponse {
  ok: boolean;
  mode: RoutingMode;
}

export async function getRoutingMode(): Promise<RoutingModeResponse> {
  return await http<RoutingModeResponse>(`/routing/settings/mode`);
}

export async function setRoutingMode(mode: RoutingMode): Promise<{ ok: boolean }> {
  return await http<{ ok: boolean }>(`/routing/settings/mode`, {
    method: "POST",
    body: JSON.stringify({ mode }),
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

// ============================================================================
// Agent Availability & Capacity API
// ============================================================================

export interface AgentAvailabilityDTO {
  id: string;
  orgId: string;
  agentUserId: string;
  isAvailable: boolean;
  reason?: string | null;
  updatedBy?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface CapacitySettingsDTO {
  id: string;
  orgId: string;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  updatedBy?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface AgentCapacityStatus {
  agentUserId: string;
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
  dailyReached: boolean;
  weeklyReached: boolean;
  monthlyReached: boolean;
  hasCapacityIssue: boolean;
  warning?: string | null;
}

/**
 * Get all agent availability settings
 */
export async function getAgentAvailability(): Promise<{ ok: boolean; data: AgentAvailabilityDTO[] }> {
  return await http<{ ok: boolean; data: AgentAvailabilityDTO[] }>(`/availability/agents`);
}

/**
 * Set agent availability status
 */
export async function setAgentAvailability(
  agentUserId: string,
  isAvailable: boolean,
  reason?: string
): Promise<{ ok: boolean; data: AgentAvailabilityDTO }> {
  return await http<{ ok: boolean; data: AgentAvailabilityDTO }>(
    `/availability/agents/${encodeURIComponent(agentUserId)}`,
    {
      method: "POST",
      body: JSON.stringify({ isAvailable, reason }),
    }
  );
}

/**
 * Get global capacity settings
 */
export async function getCapacitySettings(): Promise<{ ok: boolean; data: CapacitySettingsDTO }> {
  return await http<{ ok: boolean; data: CapacitySettingsDTO }>(`/availability/capacity/settings`);
}

/**
 * Update global capacity settings
 */
export async function setCapacitySettings(settings: {
  dailyLimit?: number | null;
  weeklyLimit?: number | null;
  monthlyLimit?: number | null;
}): Promise<{ ok: boolean; data: CapacitySettingsDTO }> {
  return await http<{ ok: boolean; data: CapacitySettingsDTO }>(
    `/availability/capacity/settings`,
    {
      method: "POST",
      body: JSON.stringify(settings),
    }
  );
}

/**
 * Get current capacity status for all agents
 */
export async function getCapacityStatus(): Promise<{
  ok: boolean;
  data: {
    settings: {
      dailyLimit: number | null;
      weeklyLimit: number | null;
      monthlyLimit: number | null;
    };
    agents: AgentCapacityStatus[];
  };
}> {
  return await http<{
    ok: boolean;
    data: {
      settings: {
        dailyLimit: number | null;
        weeklyLimit: number | null;
        monthlyLimit: number | null;
      };
      agents: AgentCapacityStatus[];
    };
  }>(`/availability/capacity/status`);
}

/**
 * List Monday.com users for the organization
 */
export async function listMondayUsers(): Promise<{
  ok: boolean;
  users: MondayUser[];
}> {
  return await http<{
    ok: boolean;
    users: MondayUser[];
  }>(`/admin/monday/users`);
}

// ============================================
// Phase 7.3: Organization Management
// ============================================

export type Organization = {
  id: string;
  name: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  tier: string;
  mondayWorkspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

export type OrganizationWithStats = {
  organization: Organization;
  stats: {
    totalUsers: number;
    totalProposals: number;
    totalLeads: number;
    totalAgents: number;
  };
};

export type CreateOrganizationInput = {
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  tier?: string;
  mondayWorkspaceId?: string;
  settings?: Record<string, any>;
};

export type UpdateOrganizationInput = {
  displayName?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  tier?: string;
  mondayWorkspaceId?: string;
  settings?: Record<string, any>;
};

/**
 * List all organizations
 */
export async function listOrganizations(filters?: {
  isActive?: boolean;
  tier?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  ok: boolean;
  data: Organization[];
  pagination: { total: number; limit: number; offset: number };
}> {
  const params = new URLSearchParams();
  if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive));
  if (filters?.tier) params.append("tier", filters.tier);
  if (filters?.limit) params.append("limit", String(filters.limit));
  if (filters?.offset) params.append("offset", String(filters.offset));

  const query = params.toString();
  return await http<{
    ok: boolean;
    data: Organization[];
    pagination: { total: number; limit: number; offset: number };
  }>(`/organizations${query ? `?${query}` : ""}`);
}

/**
 * Get organization by ID
 */
export async function getOrganization(orgId: string): Promise<{
  ok: boolean;
  data: Organization;
}> {
  return await http<{ ok: boolean; data: Organization }>(`/organizations/${orgId}`);
}

/**
 * Get organization with statistics
 */
export async function getOrganizationWithStats(orgId: string): Promise<{
  ok: boolean;
  data: OrganizationWithStats;
}> {
  return await http<{ ok: boolean; data: OrganizationWithStats }>(`/organizations/${orgId}/stats`);
}

/**
 * Create new organization
 */
export async function createOrganization(input: CreateOrganizationInput): Promise<{
  ok: boolean;
  data: Organization;
}> {
  return await http<{ ok: boolean; data: Organization }>(`/organizations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Update organization
 */
export async function updateOrganization(
  orgId: string,
  input: UpdateOrganizationInput
): Promise<{
  ok: boolean;
  data: Organization;
}> {
  return await http<{ ok: boolean; data: Organization }>(`/organizations/${orgId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/**
 * Delete organization (soft delete by default)
 */
export async function deleteOrganization(orgId: string, hard = false): Promise<{
  ok: boolean;
  message: string;
}> {
  return await http<{ ok: boolean; message: string }>(
    `/organizations/${orgId}${hard ? "?hard=true" : ""}`,
    { method: "DELETE" }
  );
}

/**
 * Activate organization
 */
export async function activateOrganization(orgId: string): Promise<{
  ok: boolean;
  data: Organization;
  message: string;
}> {
  return await http<{ ok: boolean; data: Organization; message: string }>(
    `/organizations/${orgId}/activate`,
    { method: "POST" }
  );
}

// ============================================================================
// Organization Registration (Monday OAuth)
// ============================================================================

export interface MondayOAuthUrlResponse {
  success: boolean;
  data: {
    authUrl: string;
    state: string;
  };
}

export interface MondayCallbackResponse {
  success: boolean;
  data: {
    organization: {
      id: string;
      name: string;
      displayName: string;
      email: string;
    };
    user: {
      id: string;
      email: string;
      username: string;
      role: string;
      orgId: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
    message: string;
  };
}

// Separate interface for login (no organization field)
export interface MondayLoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      role: string;
      orgId: string;
      firstName?: string;
      lastName?: string;
      isActive: boolean;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

/**
 * Get Monday.com OAuth authorization URL for login
 */
export async function getMondayOAuthUrl(): Promise<MondayOAuthUrlResponse> {
  return await http<MondayOAuthUrlResponse>("/auth/monday/oauth/url");
}

/**
 * Complete Monday.com OAuth callback for login
 */
export async function loginWithMonday(code: string, state?: string): Promise<MondayLoginResponse> {
  return await http<MondayLoginResponse>("/auth/monday/oauth/callback", {
    method: "POST",
    body: JSON.stringify({ code, state }),
  });
}

/**
 * Get Monday.com OAuth authorization URL for registration
 */
export async function getMondayOAuthRegisterUrl(): Promise<MondayOAuthUrlResponse> {
  return await http<MondayOAuthUrlResponse>("/auth/register-org/monday");
}

/**
 * Complete Monday.com OAuth callback and create organization
 */
export async function registerOrgWithMonday(code: string, state?: string): Promise<MondayCallbackResponse> {
  return await http<MondayCallbackResponse>("/auth/register-org/monday/callback", {
    method: "POST",
    body: JSON.stringify({ code, state }),
  });
}

/**
 * Check if Monday OAuth is configured
 */
export async function getMondayOAuthStatus(): Promise<{
  success: boolean;
  data: {
    mondayOAuthConfigured: boolean;
    redirectUri: string | null;
  };
}> {
  return await http<{
    success: boolean;
    data: {
      mondayOAuthConfigured: boolean;
      redirectUri: string | null;
    };
  }>("/auth/register-org/status");
}

// ============================================================================
// Super Admin API
// ============================================================================

export interface SystemStats {
  organizations: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  proposals: number;
  leads: number;
  agents: number;
}

export interface SuperAdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  orgId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    displayName: string;
  } | null;
}

/**
 * Get system-wide statistics (super admin only)
 */
export async function getSuperAdminStats(): Promise<{
  ok: boolean;
  data: SystemStats;
}> {
  return await http<{ ok: boolean; data: SystemStats }>("/super-admin/stats");
}

/**
 * List all users across all organizations (super admin only)
 */
export async function listAllUsers(params?: {
  orgId?: string;
  role?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  ok: boolean;
  data: SuperAdminUser[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", params.orgId);
  if (params?.role) q.set("role", params.role);
  if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));

  return await http<{
    ok: boolean;
    data: SuperAdminUser[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }>(`/super-admin/users?${q.toString()}`);
}

/**
 * Super Admin - List all organizations
 */
export async function superAdminListOrganizations(params?: {
  isActive?: boolean;
  tier?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  ok: boolean;
  data: Organization[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}> {
  const q = new URLSearchParams();
  if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
  if (params?.tier) q.set("tier", params.tier);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));

  return await http<{
    ok: boolean;
    data: Organization[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }>(`/super-admin/organizations?${q.toString()}`);
}

/**
 * Super Admin - Get organization by ID
 */
export async function superAdminGetOrganization(orgId: string): Promise<{
  ok: boolean;
  data: Organization;
}> {
  return await http<{ ok: boolean; data: Organization }>(`/super-admin/organizations/${orgId}`);
}

/**
 * Super Admin - Get organization with stats
 */
export async function superAdminGetOrganizationStats(orgId: string): Promise<{
  ok: boolean;
  data: OrganizationStats;
}> {
  return await http<{ ok: boolean; data: OrganizationStats }>(`/super-admin/organizations/${orgId}/stats`);
}

/**
 * Super Admin - Create organization
 */
export async function superAdminCreateOrganization(input: CreateOrganizationInput): Promise<{
  ok: boolean;
  data: Organization;
}> {
  return await http<{ ok: boolean; data: Organization }>("/super-admin/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Super Admin - Update organization
 */
export async function superAdminUpdateOrganization(
  orgId: string,
  input: UpdateOrganizationInput
): Promise<{
  ok: boolean;
  data: Organization;
}> {
  return await http<{ ok: boolean; data: Organization }>(`/super-admin/organizations/${orgId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/**
 * Super Admin - Delete organization
 */
export async function superAdminDeleteOrganization(orgId: string, hard = false): Promise<{
  ok: boolean;
  message: string;
}> {
  return await http<{ ok: boolean; message: string }>(
    `/super-admin/organizations/${orgId}${hard ? "?hard=true" : ""}`,
    { method: "DELETE" }
  );
}

/**
 * Super Admin - Activate organization
 */
export async function superAdminActivateOrganization(orgId: string): Promise<{
  ok: boolean;
  data: Organization;
  message: string;
}> {
  return await http<{ ok: boolean; data: Organization; message: string }>(
    `/super-admin/organizations/${orgId}/activate`,
    { method: "POST" }
  );
}

// ============================================
// Organization Settings (Admin-only)
// ============================================

export type OrganizationSettings = {
  id: string;
  name: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  tier: string;
  isActive: boolean;
  mondayConnected: boolean;
  mondayWorkspaceId: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  settings: Record<string, any>;
  stats: {
    userCount: number;
  };
};

export type UpdateOrganizationSettingsInput = {
  displayName?: string;
  email?: string;
  phone?: string;
};

/**
 * Get current organization settings
 */
export async function getOrganizationSettings(): Promise<{
  ok: boolean;
  data: OrganizationSettings;
}> {
  return await http<{ ok: boolean; data: OrganizationSettings }>("/org-settings");
}

/**
 * Update organization settings
 */
export async function updateOrganizationSettings(
  input: UpdateOrganizationSettingsInput
): Promise<{
  ok: boolean;
  data: Partial<OrganizationSettings>;
  message: string;
}> {
  return await http<{ ok: boolean; data: Partial<OrganizationSettings>; message: string }>(
    "/org-settings",
    {
      method: "PUT",
      body: JSON.stringify(input),
    }
  );
}

/**
 * Disconnect Monday.com integration
 */
export async function disconnectMonday(): Promise<{
  ok: boolean;
  message: string;
}> {
  return await http<{ ok: boolean; message: string }>(
    "/org-settings/disconnect-monday",
    { method: "POST" }
  );
}

/**
 * Suspend organization
 */
export async function suspendOrganization(): Promise<{
  ok: boolean;
  data: Partial<OrganizationSettings>;
  message: string;
}> {
  return await http<{ ok: boolean; data: Partial<OrganizationSettings>; message: string }>(
    "/org-settings/suspend",
    { method: "POST" }
  );
}

/**
 * Close organization account
 */
export async function closeOrganization(): Promise<{
  ok: boolean;
  data: Partial<OrganizationSettings>;
  message: string;
}> {
  return await http<{ ok: boolean; data: Partial<OrganizationSettings>; message: string }>(
    "/org-settings/close",
    { method: "POST" }
  );
}

/**
 * Reactivate organization
 */
export async function reactivateOrganization(): Promise<{
  ok: boolean;
  data: Partial<OrganizationSettings>;
  message: string;
}> {
  return await http<{ ok: boolean; data: Partial<OrganizationSettings>; message: string }>(
    "/org-settings/reactivate",
    { method: "POST" }
  );
}

