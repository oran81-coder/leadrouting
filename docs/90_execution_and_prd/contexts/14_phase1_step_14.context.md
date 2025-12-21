# Phase 1 — Step 14: Override & Audit Logging

## Goal
Create immutable audit logs for:
- mapping changes
- field registry changes
- rule changes
- recommendations
- approvals/overrides
- final assignments

## Inputs
- Events from wizard, schema registry, rules, decision engine

## Outputs
- AuditLog records with:
  - actor (user id/role)
  - action type
  - before/after diff (where applicable)
  - timestamp
  - correlation id

## Acceptance Criteria
- Every admin change is logged
- Every routing decision (recommendation + final assignment) is logged
- Logs are queryable from admin UI

## Cursor Instructions
- Keep logs append-only (immutability) in Phase 1
