# Rate Limiting & API Throttling Guide

## 📋 Overview

This document describes the rate limiting and API throttling implementation for the Lead Routing System. The system implements multiple layers of protection to prevent API abuse and manage Monday.com API rate limits.

## 🎯 Goals

1. **Protect API endpoints** from abuse and DDoS attacks
2. **Respect Monday.com rate limits** (100 requests/minute)
3. **Provide graceful degradation** under high load
4. **Enable monitoring** of API usage patterns

## 🏗️ Architecture

### 1. Express Rate Limiting Middleware

Location: `apps/api/src/middleware/rateLimit.ts`

#### Features
- Per-endpoint rate limits with configurable presets
- Per-IP tracking with IPv6 support
- Correlation ID integration for request tracking
- Standardized 429 error responses
- Rate limit headers (`RateLimit-*`) in all responses
- Development mode bypass option

#### Configuration Presets

```typescript
// Strict: For sensitive operations (5 req/15min)
rateLimiters.sensitive

// Standard: For regular API endpoints (100 req/15min)
rateLimiters.standard

// Lenient: For public/read-only endpoints (300 req/15min)
rateLimiters.lenient

// Monday.com API: Respect Monday's limits (90 req/min)
rateLimiters.mondayProxy

// Admin operations (50 req/15min)
rateLimiters.admin

// Manager operations (200 req/15min)
rateLimiters.manager

// Analytics/Outcomes (500 req/15min)
rateLimiters.analytics
```

#### Usage Example

```typescript
import { rateLimiters } from "./middleware/rateLimit";

// Apply to specific route
router.post("/api/admin/rules", rateLimiters.admin, handleSaveRules);

// Apply to router group
const adminRouter = Router();
adminRouter.use(rateLimiters.admin);
```

### 2. Monday.com Request Queue

Location: `packages/modules/monday-integration/src/infrastructure/monday.queue.ts`

#### Features
- **Request queuing** with priority support
- **Automatic throttling** (90 req/min with 10% safety buffer)
- **Exponential backoff** on 429 errors
- **Retry logic** with configurable max attempts
- **Request deduplication** by ID
- **Queue metrics** for monitoring

#### Token Bucket Algorithm

The queue implements a sliding window token bucket algorithm:
- **Capacity**: 90 requests
- **Refill rate**: 90 requests per minute
- **Window**: 60 seconds
- **Buffer**: 10% safety margin (90 instead of 100)

#### Usage Example

```typescript
import { mondayQueue } from "./infrastructure/monday.queue";

// Enqueue a Monday.com API call
const result = await mondayQueue.enqueue(
  async () => {
    return await mondayClient.query(query, variables);
  },
  priority, // Higher = more urgent
  requestId // Optional, for deduplication
);

// Get queue metrics
const metrics = mondayQueue.getMetrics();
console.log(`Queue size: ${metrics.queueSize}`);
console.log(`Requests/min: ${metrics.requestsPerMinute}`);
```

#### Priority Levels

- **10**: Critical operations (user-initiated actions)
- **5**: Standard operations (background sync)
- **1**: Low priority (analytics, reporting)
- **0**: Best effort (prefetching, caching)

### 3. Retry Logic

The queue implements exponential backoff for failed requests:

```
Attempt 1: Immediate
Attempt 2: Wait 1 second
Attempt 3: Wait 2 seconds
Attempt 4: Wait 4 seconds
Max retries: 3
```

Special handling for 429 (Rate Limit Exceeded):
- Respect `Retry-After` header if present
- Default wait: 60 seconds
- Does not count towards max retries

## 📊 Monitoring

### Rate Limit Headers

All API responses include rate limit information:

```
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1640000000
```

### Queue Metrics

Access queue metrics programmatically:

```typescript
const metrics = mondayQueue.getMetrics();

// Available metrics:
{
  totalRequests: number,        // Total requests enqueued
  successfulRequests: number,   // Successfully completed
  failedRequests: number,       // Failed permanently
  retriedRequests: number,      // Requests that were retried
  queueSize: number,            // Current queue size
  averageWaitTime: number,      // Average wait time (ms)
  requestsPerMinute: number     // Current request rate
}
```

### Logging

All rate limit events are logged with correlation IDs:

```json
{
  "level": "warn",
  "message": "Rate limit exceeded",
  "correlationId": "abc-123",
  "ip": "192.168.1.1",
  "path": "/api/routing/evaluate",
  "method": "POST"
}
```

## ⚙️ Configuration

### Environment Variables

```bash
# Enable/disable rate limiting (default: true)
RATE_LIMIT_ENABLED=true

# Rate limit window in milliseconds (default: 900000 = 15 minutes)
RATE_LIMIT_WINDOW_MS=900000

# Max requests per window (default: 100)
RATE_LIMIT_MAX_REQUESTS=100
```

### Development Mode

In development, rate limiting can be disabled:

```bash
NODE_ENV=development
RATE_LIMIT_ENABLED=false
```

Note: Even with rate limiting disabled, the middleware still adds rate limit headers for testing.

## 🧪 Testing

### Unit Tests

Location: `apps/api/src/__tests__/rateLimit.spec.ts`

Run tests:
```bash
npm test -- apps/api/src/__tests__/rateLimit.spec.ts
```

### Integration Testing

Test rate limiting in integration tests:

```typescript
import request from "supertest";
import { createServer } from "../server";

const app = createServer();

// Make multiple requests
for (let i = 0; i < 5; i++) {
  const response = await request(app).get("/health");
  console.log(`Remaining: ${response.headers["ratelimit-remaining"]}`);
}
```

### Load Testing

For load testing, use tools like Apache Bench or k6:

```bash
# Test with 100 concurrent requests
ab -n 100 -c 10 http://localhost:3000/api/health

# Test with k6
k6 run --vus 10 --duration 30s load-test.js
```

## 🚨 Error Handling

### 429 Too Many Requests

When rate limit is exceeded, the API returns:

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests, please try again later",
  "retryAfter": 900
}
```

Headers:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 900
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1640000900
```

### Client-Side Handling

Recommended client-side retry logic:

```typescript
async function apiCall(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "60");
    await sleep(retryAfter * 1000);
    return apiCall(url, options); // Retry
  }
  
  return response;
}
```

## 📈 Best Practices

### 1. Use Appropriate Presets

Choose the right rate limit preset for each endpoint:
- **Sensitive operations**: Use `rateLimiters.sensitive`
- **Public APIs**: Use `rateLimiters.lenient`
- **Admin operations**: Use `rateLimiters.admin`

### 2. Implement Caching

Reduce API calls by caching frequently accessed data:
```typescript
// Cache Monday.com metadata
const cachedBoards = await cache.get("monday:boards");
if (!cachedBoards) {
  const boards = await mondayQueue.enqueue(() => fetchBoards());
  await cache.set("monday:boards", boards, "medium");
}
```

### 3. Use Request Priorities

Prioritize user-initiated requests over background tasks:
```typescript
// High priority: User clicked "Approve"
await mondayQueue.enqueue(approveProposal, 10);

// Low priority: Background sync
await mondayQueue.enqueue(syncMetrics, 1);
```

### 4. Monitor Queue Metrics

Set up alerts for queue health:
```typescript
const metrics = mondayQueue.getMetrics();

if (metrics.queueSize > 50) {
  log.warn("Monday.com queue is backing up", { metrics });
}

if (metrics.requestsPerMinute > 85) {
  log.warn("Approaching Monday.com rate limit", { metrics });
}
```

### 5. Handle Errors Gracefully

Always handle rate limit errors:
```typescript
try {
  const result = await mondayQueue.enqueue(fetchData);
} catch (error) {
  if (error.status === 429) {
    // Show user-friendly message
    toast.error("System is busy, please try again in a moment");
  } else {
    throw error;
  }
}
```

## 🔧 Troubleshooting

### Issue: Rate limit hit too frequently

**Symptoms**: Many 429 responses, queue backing up

**Solutions**:
1. Increase rate limit window or max requests
2. Implement caching for frequently accessed data
3. Batch multiple operations into single requests
4. Use webhooks instead of polling

### Issue: Queue growing indefinitely

**Symptoms**: `queueSize` metric increasing, slow response times

**Solutions**:
1. Check Monday.com API health
2. Verify network connectivity
3. Review error logs for failed requests
4. Consider implementing queue size limits

### Issue: Requests failing with 429 from Monday.com

**Symptoms**: Monday.com returns 429 despite queue throttling

**Solutions**:
1. Reduce `MAX_REQUESTS_PER_MINUTE` in queue (currently 90)
2. Check if multiple instances are running
3. Verify Monday.com account limits
4. Contact Monday.com support if limits seem incorrect

## 📚 Related Documentation

- [Environment Configuration](./apps/api/src/config/env.ts)
- [Error Handling](./packages/core/src/shared/errors.ts)
- [Logging](./packages/core/src/shared/logger.ts)
- [Monday.com Integration](./packages/modules/monday-integration/README.md)

## 🔄 Future Enhancements

Potential improvements for future phases:

1. **Redis-backed rate limiting** for distributed systems
2. **Per-user rate limits** (not just per-IP)
3. **Adaptive rate limiting** based on system load
4. **Circuit breaker pattern** for Monday.com API
5. **Request batching** for multiple similar operations
6. **WebSocket support** for real-time updates (avoiding polling)

---

**Last Updated**: Phase 4.3 - December 2024
**Maintainer**: Lead Routing Team

