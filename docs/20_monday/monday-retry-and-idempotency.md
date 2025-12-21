# Monday Retry + Writeback Idempotency

## Retry/Backoff
Monday client retries up to 5 attempts on:
- HTTP 429 (rate limit)
- HTTP 5xx
- AbortError (timeout)
- GraphQL transient errors (best-effort heuristic)

Exponential backoff: 400ms * 2^(attempt-1) + jitter.

## Writeback Idempotency
To prevent duplicate column updates on retries, we add `RoutingApply`:
- unique (orgId, proposalId)

Before applying writeback:
- try create RoutingApply row
- if already exists => treat as already applied and return success
