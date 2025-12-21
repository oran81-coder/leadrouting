# Phase 1 — Step 3: System Constraints

## Goal
Define hard constraints that shape implementation decisions.

## Constraints
- Single org only (no tenant isolation complexity)
- Monday.com only data source
- Deterministic rule-based engine only
- Explainability is mandatory
- All decisions and overrides are logged
- No autonomous “hidden” routing

## Inputs
- PRD constraints
- README rules

## Outputs
- Constraint checklist referenced by architecture + implementation steps

## Acceptance Criteria
- Architecture and modules explicitly comply with constraints
- No step introduces cross-org abstractions

## Cursor Instructions
- If a design requires ML or multi-tenant, stop and ask
