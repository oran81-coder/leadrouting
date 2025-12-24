# Monitoring & Observability Guide - Phase 6.1

## 📋 Table of Contents

1. [Overview](#overview)
2. [Health Check Endpoints](#health-check-endpoints)
3. [Prometheus Metrics](#prometheus-metrics)
4. [Setting Up Monitoring](#setting-up-monitoring)
5. [Alerting Rules](#alerting-rules)
6. [Grafana Dashboards](#grafana-dashboards)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Phase 6.1 introduces comprehensive monitoring and observability features for the Lead Routing System:

✅ **Kubernetes-ready health probes** (liveness, readiness)  
✅ **Detailed dependency health checks** (DB, Redis, Monday.com)  
✅ **Prometheus metrics** (40+ custom metrics)  
✅ **Default Node.js metrics** (CPU, memory, event loop)  
✅ **HTTP request tracking** (all endpoints monitored)  
✅ **Business metrics** (leads processed, proposals, agent activity)

---

## Health Check Endpoints

### Overview

Health check endpoints provide real-time status of the system and its dependencies.

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `GET /health` | Basic health check | Quick status verification |
| `GET /health/liveness` | Kubernetes liveness probe | Pod restart on failure |
| `GET /health/readiness` | Kubernetes readiness probe | Traffic routing control |
| `GET /health/detailed` | Detailed dependency status | Monitoring dashboards |

---

### 1. Basic Health Check

**Endpoint:** `GET /health`

**Purpose:** Confirms API is running and responsive.

**Response:**

```json
{
  "ok": true,
  "timestamp": "2025-12-24T10:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - API is running

**Example:**

```bash
curl http://localhost:3000/health
```

**Use Cases:**
- Quick health verification
- Load balancer health checks
- Uptime monitoring (Uptime Robot, Pingdom)

---

### 2. Liveness Probe

**Endpoint:** `GET /health/liveness`

**Purpose:** Kubernetes liveness probe - determines if the pod is alive.

**Response:**

```json
{
  "ok": true,
  "status": "alive",
  "timestamp": "2025-12-24T10:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Process is alive

**Behavior:**
- Always returns 200 if process is running
- Does NOT check dependencies
- Fast response time (<5ms)

**Kubernetes Configuration:**

```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Use Cases:**
- Detect deadlocked processes
- Restart unhealthy pods
- Monitor process availability

---

### 3. Readiness Probe

**Endpoint:** `GET /health/readiness`

**Purpose:** Kubernetes readiness probe - determines if the pod can accept traffic.

**Response (Ready):**

```json
{
  "ok": true,
  "status": "ready",
  "timestamp": "2025-12-24T10:00:00.000Z"
}
```

**Response (Not Ready):**

```json
{
  "ok": false,
  "status": "not_ready",
  "reason": "Database connection failed",
  "timestamp": "2025-12-24T10:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Ready to accept traffic
- `503 Service Unavailable` - Not ready (dependencies unhealthy)

**Dependencies Checked:**
- ✅ Database connectivity

**Kubernetes Configuration:**

```yaml
readinessProbe:
  httpGet:
    path: /health/readiness
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 1
  failureThreshold: 3
```

**Use Cases:**
- Control traffic routing (don't route to unready pods)
- Detect database connection issues
- Graceful deployment rollouts

---

### 4. Detailed Health Status

**Endpoint:** `GET /health/detailed`

**Purpose:** Comprehensive health status for monitoring dashboards.

**Response:**

```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-12-24T10:00:00.000Z",
  "checkDuration": "45ms",
  "environment": "production",
  "dependencies": {
    "database": {
      "status": "healthy",
      "connected": true,
      "type": "sqlite"
    },
    "cache": {
      "status": "healthy",
      "enabled": true,
      "connected": true,
      "type": "redis"
    },
    "mondayApi": {
      "status": "healthy",
      "configured": true,
      "connected": true
    }
  },
  "version": {
    "api": "1.0.0",
    "node": "v20.10.0"
  }
}
```

**Status Codes:**
- `200 OK` - System is healthy
- `503 Service Unavailable` - System is degraded

**Dependencies Checked:**
1. **Database** (critical)
   - Connectivity test
   - Connection status
   
2. **Cache (Redis)** (non-critical)
   - Connection status
   - Enabled/disabled state
   
3. **Monday.com API** (non-critical)
   - Configuration status
   - API connectivity
   - Mock mode detection

**Example:**

```bash
curl http://localhost:3000/health/detailed | jq
```

**Use Cases:**
- Monitoring dashboards (Grafana, Datadog)
- Troubleshooting dependency issues
- System status pages
- Operational visibility

---

## Prometheus Metrics

### Overview

The system exposes 40+ custom metrics plus default Node.js metrics via `/metrics` endpoint.

**Endpoint:** `GET /metrics`  
**Authentication:** Requires `x-api-key` header  
**Format:** Prometheus text format

### Metric Categories

1. **HTTP Requests** - Request counts and latency
2. **Routing Proposals** - Proposal lifecycle metrics
3. **Monday.com API** - External API calls
4. **Authentication** - Login attempts, active sessions
5. **Errors** - Error counts by type
6. **Database** - Query performance, connections
7. **Cache (Redis)** - Hit/miss rates
8. **Business Metrics** - Leads, agents, conversions

---

### 1. HTTP Request Metrics

#### `leadrouting_http_requests_total`

**Type:** Counter  
**Labels:** `method`, `path`, `status`  
**Description:** Total number of HTTP requests

**Example:**

```prometheus
leadrouting_http_requests_total{method="GET",path="/health",status="200"} 150
leadrouting_http_requests_total{method="POST",path="/manager/proposals/:id/approve",status="200"} 42
```

**Use Cases:**
- Monitor API usage
- Identify popular endpoints
- Track error rates

#### `leadrouting_http_request_duration_seconds`

**Type:** Histogram  
**Labels:** `method`, `path`, `status`  
**Buckets:** 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10 seconds  
**Description:** HTTP request duration in seconds

**Example:**

```prometheus
leadrouting_http_request_duration_seconds_bucket{method="GET",path="/health",status="200",le="0.01"} 145
leadrouting_http_request_duration_seconds_sum{method="GET",path="/health",status="200"} 0.75
leadrouting_http_request_duration_seconds_count{method="GET",path="/health",status="200"} 150
```

**Use Cases:**
- Monitor API latency
- Identify slow endpoints
- SLA monitoring

---

### 2. Routing Proposal Metrics

#### `leadrouting_proposals_created_total`

**Type:** Counter  
**Labels:** `board_id`  
**Description:** Total number of routing proposals created

#### `leadrouting_proposals_approved_total`

**Type:** Counter  
**Description:** Total number of proposals approved

#### `leadrouting_proposals_rejected_total`

**Type:** Counter  
**Description:** Total number of proposals rejected

#### `leadrouting_proposals_pending_current`

**Type:** Gauge  
**Description:** Current number of pending proposals

**Example:**

```prometheus
leadrouting_proposals_created_total{board_id="123456"} 1250
leadrouting_proposals_approved_total 1100
leadrouting_proposals_rejected_total 150
leadrouting_proposals_pending_current 25
```

**Use Cases:**
- Track approval workflow efficiency
- Monitor proposal backlog
- Detect approval bottlenecks

#### `leadrouting_evaluation_duration_seconds`

**Type:** Histogram  
**Buckets:** 0.1, 0.5, 1, 2, 5, 10 seconds  
**Description:** Time taken to evaluate routing for a lead

**Use Cases:**
- Monitor routing engine performance
- Detect performance degradation
- Optimize evaluation logic

---

### 3. Monday.com API Metrics

#### `leadrouting_monday_api_requests_total`

**Type:** Counter  
**Labels:** `operation`, `status`  
**Description:** Total number of Monday.com API requests

#### `leadrouting_monday_api_request_duration_seconds`

**Type:** Histogram  
**Labels:** `operation`  
**Buckets:** 0.1, 0.5, 1, 2, 5, 10, 30 seconds  
**Description:** Monday.com API request duration

#### `leadrouting_monday_api_rate_limit_remaining`

**Type:** Gauge  
**Description:** Remaining Monday.com API rate limit capacity

#### `leadrouting_monday_api_queue_size_current`

**Type:** Gauge  
**Description:** Current size of Monday.com API request queue

**Example:**

```prometheus
leadrouting_monday_api_requests_total{operation="get_boards",status="success"} 450
leadrouting_monday_api_request_duration_seconds_sum{operation="get_boards"} 125.5
leadrouting_monday_api_rate_limit_remaining 75
leadrouting_monday_api_queue_size_current 3
```

**Use Cases:**
- Monitor external API health
- Track rate limit usage
- Detect queue buildup

---

### 4. Authentication Metrics

#### `leadrouting_auth_login_attempts_total`

**Type:** Counter  
**Labels:** `status` (success/failure)  
**Description:** Total number of login attempts

#### `leadrouting_auth_active_sessions_current`

**Type:** Gauge  
**Description:** Current number of active user sessions

#### `leadrouting_auth_token_refresh_total`

**Type:** Counter  
**Labels:** `status` (success/failure)  
**Description:** Total number of token refresh operations

**Example:**

```prometheus
leadrouting_auth_login_attempts_total{status="success"} 523
leadrouting_auth_login_attempts_total{status="failure"} 47
leadrouting_auth_active_sessions_current 142
leadrouting_auth_token_refresh_total{status="success"} 3521
```

**Use Cases:**
- Monitor authentication health
- Detect brute force attacks
- Track active users

---

### 5. Error Metrics

#### `leadrouting_errors_total`

**Type:** Counter  
**Labels:** `type`, `code`  
**Description:** Total number of errors

**Example:**

```prometheus
leadrouting_errors_total{type="ValidationError",code="E2001"} 12
leadrouting_errors_total{type="DatabaseError",code="E4001"} 2
```

**Use Cases:**
- Monitor error rates
- Identify problematic areas
- Track error trends

---

### 6. Database Metrics

#### `leadrouting_database_query_duration_seconds`

**Type:** Histogram  
**Labels:** `operation`  
**Buckets:** 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1 seconds  
**Description:** Database query duration

#### `leadrouting_database_connections_active`

**Type:** Gauge  
**Description:** Current number of active database connections

**Use Cases:**
- Monitor database performance
- Detect slow queries
- Track connection pool usage

---

### 7. Cache Metrics (Redis)

#### `leadrouting_cache_hits_total`

**Type:** Counter  
**Labels:** `cache_key`  
**Description:** Total number of cache hits

#### `leadrouting_cache_misses_total`

**Type:** Counter  
**Labels:** `cache_key`  
**Description:** Total number of cache misses

**Example:**

```prometheus
leadrouting_cache_hits_total{cache_key="agent_metrics"} 5420
leadrouting_cache_misses_total{cache_key="agent_metrics"} 380
```

**Cache Hit Rate:** `hits / (hits + misses) * 100%`

**Use Cases:**
- Monitor cache efficiency
- Optimize cache strategy
- Detect cache problems

---

### 8. Business Metrics

#### `leadrouting_leads_processed_total`

**Type:** Counter  
**Labels:** `board_id`, `industry`  
**Description:** Total number of leads processed

#### `leadrouting_agents_active_count`

**Type:** Gauge  
**Description:** Current number of active agents

#### `leadrouting_metrics_computation_duration_seconds`

**Type:** Histogram  
**Buckets:** 0.5, 1, 2, 5, 10, 30, 60 seconds  
**Description:** Time taken to compute agent metrics

**Use Cases:**
- Track business KPIs
- Monitor system capacity
- Performance optimization

---

### 9. Default Node.js Metrics

Automatically collected by `prom-client`:

- `leadrouting_nodejs_heap_size_total_bytes` - Total heap size
- `leadrouting_nodejs_heap_size_used_bytes` - Used heap size
- `leadrouting_nodejs_external_memory_bytes` - External memory
- `leadrouting_process_cpu_user_seconds_total` - CPU usage
- `leadrouting_nodejs_eventloop_lag_seconds` - Event loop lag
- `leadrouting_nodejs_active_handles_total` - Active handles
- `leadrouting_nodejs_active_requests_total` - Active requests

**Use Cases:**
- Monitor Node.js performance
- Detect memory leaks
- Track event loop health

---

## Setting Up Monitoring

### Prometheus Configuration

Add scrape config to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'lead-routing-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: /metrics
    scheme: http
    static_configs:
      - targets: ['localhost:3000']
    # Add API key authentication
    headers:
      x-api-key: 'your-api-key-here'
```

### Kubernetes Service Monitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: lead-routing-api
  namespace: default
spec:
  selector:
    matchLabels:
      app: lead-routing-api
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
      headers:
        x-api-key:
          name: api-key-secret
          key: api-key
```

---

## Alerting Rules

### Prometheus Alert Rules

```yaml
groups:
  - name: lead_routing_alerts
    interval: 30s
    rules:
      # System Health
      - alert: ApiDown
        expr: up{job="lead-routing-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Lead Routing API is down"
          description: "The API has been down for more than 1 minute."

      - alert: HighErrorRate
        expr: rate(leadrouting_errors_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec."

      # Routing Performance
      - alert: HighProposalBacklog
        expr: leadrouting_proposals_pending_current > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High proposal backlog"
          description: "{{ $value }} proposals are pending."

      - alert: SlowRoutingEvaluation
        expr: histogram_quantile(0.95, rate(leadrouting_evaluation_duration_seconds_bucket[5m])) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow routing evaluation"
          description: "P95 evaluation time is {{ $value }}s."

      # Monday.com API
      - alert: MondayApiHighLatency
        expr: histogram_quantile(0.95, rate(leadrouting_monday_api_request_duration_seconds_bucket[5m])) > 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High Monday.com API latency"
          description: "P95 latency is {{ $value }}s."

      - alert: MondayApiRateLimitLow
        expr: leadrouting_monday_api_rate_limit_remaining < 10
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Monday.com rate limit low"
          description: "Only {{ $value }} requests remaining."

      # Authentication
      - alert: HighFailedLogins
        expr: rate(leadrouting_auth_login_attempts_total{status="failure"}[5m]) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High number of failed login attempts"
          description: "{{ $value }} failed logins/sec - possible brute force attack."

      # Database
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, rate(leadrouting_database_query_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries"
          description: "P95 query time is {{ $value }}s."

      # Cache
      - alert: LowCacheHitRate
        expr: rate(leadrouting_cache_hits_total[5m]) / (rate(leadrouting_cache_hits_total[5m]) + rate(leadrouting_cache_misses_total[5m])) < 0.5
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}."
```

---

## Grafana Dashboards

### Basic Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Lead Routing System",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(leadrouting_http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "P95 Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(leadrouting_http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Pending Proposals",
        "targets": [
          {
            "expr": "leadrouting_proposals_pending_current"
          }
        ]
      },
      {
        "title": "Active Sessions",
        "targets": [
          {
            "expr": "leadrouting_auth_active_sessions_current"
          }
        ]
      }
    ]
  }
}
```

---

## Troubleshooting

### High Memory Usage

**Symptom:** `leadrouting_nodejs_heap_size_used_bytes` increasing steadily

**Possible Causes:**
- Memory leak in application code
- Large cached data sets
- Too many concurrent requests

**Solutions:**
1. Check for memory leaks with heap snapshots
2. Review cache TTL settings
3. Increase instance memory or scale horizontally

### High API Latency

**Symptom:** High P95 in `leadrouting_http_request_duration_seconds`

**Possible Causes:**
- Slow database queries
- Monday.com API latency
- High CPU usage

**Solutions:**
1. Check database query duration metrics
2. Review Monday.com API metrics
3. Optimize slow endpoints
4. Add caching where appropriate

### High Proposal Backlog

**Symptom:** `leadrouting_proposals_pending_current` increasing

**Possible Causes:**
- Managers not approving proposals
- System processing too slowly
- High lead volume

**Solutions:**
1. Alert managers to pending proposals
2. Implement auto-approval for trusted rules
3. Scale system capacity

---

**Phase 6.1 Status:** ✅ **COMPLETE**  
**Last Updated:** December 24, 2025  
**Documentation Version:** 1.0

