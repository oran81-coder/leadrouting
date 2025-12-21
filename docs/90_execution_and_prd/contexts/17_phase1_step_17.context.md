# Phase 1 — Step 17: Completion Criteria & Validation Plan

## Goal
Define the final acceptance and QA plan for Phase 1.

## Completion Checklist
- Monday integration stable (boards/columns/items fetching)
- Field Mapping Wizard:
  - multi-board mapping
  - required/type/normalization validation
  - versioning + audit logs
  - routing gate behavior
- Internal schema registry:
  - add/remove fields (including Core)
  - required/optional
  - re-validation triggers
- Rule engine:
  - rules CRUD + weights
  - deterministic evaluation
  - scoring + tie-break
- Explainability:
  - per-rule contributions for ranking
- Decision workflow:
  - manual approve/override
  - optional auto mode with threshold
- Audit logging coverage across all actions
- Security enforcement for roles

## QA Scenarios (Minimum)
- First-time setup end-to-end
- Mapping invalid cases (missing required, type mismatch, normalization failure)
- Admin removes a field used by mapping/rules → system locks and reports
- Rule update affects rankings; explanations reflect change
- Manager override captured in audit logs

## Outputs
- Test plan + acceptance report template

## Cursor Instructions
- Stop and ask for human sign-off before declaring Phase 1 complete
