# Approval Flow (Phase 1)

## Modes
- AUTO: execute applies assignment to Monday immediately.
- MANUAL_APPROVAL: execute creates/updates a proposal, writes Monday status "Pending Approval" (optional target), waits for manager action.

## Idempotency
`POST /routing/execute` computes an idempotencyKey:
- boardId + itemId + schemaVersion + mappingVersion + rulesVersion
and upserts RoutingProposal by (orgId, idempotencyKey).
This prevents duplicate proposals on retries.

## Manager actions
- Approve -> apply writeback -> APPLIED
- Reject -> REJECTED (no writeback)
- Override -> OVERRIDDEN
  - Optional: applyNow=true to apply immediately -> APPLIED
