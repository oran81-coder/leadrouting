# Phase 1 — Step 15: Dashboard (Manager UI) + Admin Controls

## Goal
Build UI to support the manager workflow and admin controls.

## Manager Dashboard
- Lead queue
- Recommended agent + score
- Explainability breakdown
- Approve / Override actions
- History per lead

## Admin Controls
- Manage internal fields (add/remove, required/optional)
- Launch/reset mapping wizard
- Manage rules (create/update/disable, set weights)
- Toggle mode (manual/auto) + threshold
- View audit logs

## Inputs
- APIs from mapping, schema registry, rules, decision engine, audit logs

## Outputs
- UI flows and endpoints

## Acceptance Criteria
- Manager can complete assign flow end-to-end
- Admin can update fields/rules and see validation states

## Cursor Instructions
- Stop for human input on UI decisions not specified
