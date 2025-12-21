# Phase 1 — Step 9: Rule Definition Model (Weights Live Here)

## Goal
Define how rules are authored, stored, and edited (including weights).

## Rule Structure
- id
- name
- target_entity (Lead/Agent/Deal/Profile)
- condition (deterministic predicate over normalized data)
- weight (numeric, configurable by admin)
- explanation_template (human-readable)
- enabled flag
- versioning

## Inputs
- Schema registry (fields + types)
- Admin rule configuration actions

## Outputs
- Rule storage model and validation logic:
  - condition references existing fields
  - type-safe comparisons
  - weights within allowed range (configurable)

## Acceptance Criteria
- Admin can create/update/disable rules
- Invalid rules are rejected with explicit reasons
- Rule changes are audited and versioned

## Cursor Instructions
- Stop for human input when defining initial rule set and weights
