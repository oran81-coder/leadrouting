import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

// ============================================================================
// Prometheus Metrics Registry
// ============================================================================

export const register = new Registry();

// Collect default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({
  register,
  prefix: "leadrouting_",
});

// ============================================================================
// Custom Metrics
// ============================================================================

/**
 * HTTP Request Metrics
 */
export const httpRequestsTotal = new Counter({
  name: "leadrouting_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "leadrouting_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

/**
 * Routing Proposal Metrics
 */
export const routingProposalsCreated = new Counter({
  name: "leadrouting_proposals_created_total",
  help: "Total number of routing proposals created",
  labelNames: ["board_id"],
  registers: [register],
});

export const routingProposalsApproved = new Counter({
  name: "leadrouting_proposals_approved_total",
  help: "Total number of routing proposals approved",
  registers: [register],
});

export const routingProposalsRejected = new Counter({
  name: "leadrouting_proposals_rejected_total",
  help: "Total number of routing proposals rejected",
  registers: [register],
});

export const routingProposalsPending = new Gauge({
  name: "leadrouting_proposals_pending_current",
  help: "Current number of pending routing proposals",
  registers: [register],
});

export const routingEvaluationDuration = new Histogram({
  name: "leadrouting_evaluation_duration_seconds",
  help: "Time taken to evaluate routing for a lead",
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

/**
 * Monday.com API Metrics
 */
export const mondayApiRequestsTotal = new Counter({
  name: "leadrouting_monday_api_requests_total",
  help: "Total number of Monday.com API requests",
  labelNames: ["operation", "status"],
  registers: [register],
});

export const mondayApiRequestDuration = new Histogram({
  name: "leadrouting_monday_api_request_duration_seconds",
  help: "Monday.com API request duration in seconds",
  labelNames: ["operation"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const mondayApiRateLimitRemaining = new Gauge({
  name: "leadrouting_monday_api_rate_limit_remaining",
  help: "Remaining Monday.com API rate limit capacity",
  registers: [register],
});

export const mondayApiQueueSize = new Gauge({
  name: "leadrouting_monday_api_queue_size_current",
  help: "Current size of Monday.com API request queue",
  registers: [register],
});

/**
 * Authentication Metrics
 */
export const authLoginAttemptsTotal = new Counter({
  name: "leadrouting_auth_login_attempts_total",
  help: "Total number of login attempts",
  labelNames: ["status"],
  registers: [register],
});

export const authActiveSessionsCurrent = new Gauge({
  name: "leadrouting_auth_active_sessions_current",
  help: "Current number of active user sessions",
  registers: [register],
});

export const authTokenRefreshTotal = new Counter({
  name: "leadrouting_auth_token_refresh_total",
  help: "Total number of token refresh operations",
  labelNames: ["status"],
  registers: [register],
});

/**
 * Error Metrics
 */
export const errorsTotal = new Counter({
  name: "leadrouting_errors_total",
  help: "Total number of errors",
  labelNames: ["type", "code"],
  registers: [register],
});

/**
 * Database Metrics
 */
export const databaseQueryDuration = new Histogram({
  name: "leadrouting_database_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const databaseConnectionsActive = new Gauge({
  name: "leadrouting_database_connections_active",
  help: "Current number of active database connections",
  registers: [register],
});

/**
 * Cache Metrics (Redis)
 */
export const cacheHitsTotal = new Counter({
  name: "leadrouting_cache_hits_total",
  help: "Total number of cache hits",
  labelNames: ["cache_key"],
  registers: [register],
});

export const cacheMissesTotal = new Counter({
  name: "leadrouting_cache_misses_total",
  help: "Total number of cache misses",
  labelNames: ["cache_key"],
  registers: [register],
});

/**
 * Business Metrics
 */
export const leadsProcessedTotal = new Counter({
  name: "leadrouting_leads_processed_total",
  help: "Total number of leads processed",
  labelNames: ["board_id", "industry"],
  registers: [register],
});

export const agentsActiveCount = new Gauge({
  name: "leadrouting_agents_active_count",
  help: "Current number of active agents",
  registers: [register],
});

export const metricsComputationDuration = new Histogram({
  name: "leadrouting_metrics_computation_duration_seconds",
  help: "Time taken to compute agent metrics",
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Track HTTP request metrics
 */
export function trackHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  durationSeconds: number
) {
  httpRequestsTotal.labels(method, path, statusCode.toString()).inc();
  httpRequestDuration.labels(method, path, statusCode.toString()).observe(durationSeconds);
}

/**
 * Track routing proposal creation
 */
export function trackProposalCreated(boardId: string) {
  routingProposalsCreated.labels(boardId).inc();
}

/**
 * Track routing proposal approval
 */
export function trackProposalApproved() {
  routingProposalsApproved.inc();
}

/**
 * Track routing proposal rejection
 */
export function trackProposalRejected() {
  routingProposalsRejected.inc();
}

/**
 * Update pending proposals gauge
 */
export function updatePendingProposals(count: number) {
  routingProposalsPending.set(count);
}

/**
 * Track routing evaluation duration
 */
export function trackRoutingEvaluation(durationSeconds: number) {
  routingEvaluationDuration.observe(durationSeconds);
}

/**
 * Track Monday.com API request
 */
export function trackMondayApiRequest(
  operation: string,
  status: "success" | "error",
  durationSeconds: number
) {
  mondayApiRequestsTotal.labels(operation, status).inc();
  mondayApiRequestDuration.labels(operation).observe(durationSeconds);
}

/**
 * Update Monday.com rate limit gauge
 */
export function updateMondayRateLimit(remaining: number) {
  mondayApiRateLimitRemaining.set(remaining);
}

/**
 * Update Monday.com queue size
 */
export function updateMondayQueueSize(size: number) {
  mondayApiQueueSize.set(size);
}

/**
 * Track login attempt
 */
export function trackLoginAttempt(status: "success" | "failure") {
  authLoginAttemptsTotal.labels(status).inc();
}

/**
 * Update active sessions count
 */
export function updateActiveSessions(count: number) {
  authActiveSessionsCurrent.set(count);
}

/**
 * Track token refresh
 */
export function trackTokenRefresh(status: "success" | "failure") {
  authTokenRefreshTotal.labels(status).inc();
}

/**
 * Track error
 */
export function trackError(type: string, code: string) {
  errorsTotal.labels(type, code).inc();
}

/**
 * Track database query
 */
export function trackDatabaseQuery(operation: string, durationSeconds: number) {
  databaseQueryDuration.labels(operation).observe(durationSeconds);
}

/**
 * Update active database connections
 */
export function updateDatabaseConnections(count: number) {
  databaseConnectionsActive.set(count);
}

/**
 * Track cache hit
 */
export function trackCacheHit(cacheKey: string) {
  cacheHitsTotal.labels(cacheKey).inc();
}

/**
 * Track cache miss
 */
export function trackCacheMiss(cacheKey: string) {
  cacheMissesTotal.labels(cacheKey).inc();
}

/**
 * Track lead processed
 */
export function trackLeadProcessed(boardId: string, industry: string) {
  leadsProcessedTotal.labels(boardId, industry || "unknown").inc();
}

/**
 * Update active agents count
 */
export function updateActiveAgents(count: number) {
  agentsActiveCount.set(count);
}

/**
 * Track metrics computation duration
 */
export function trackMetricsComputation(durationSeconds: number) {
  metricsComputationDuration.observe(durationSeconds);
}

