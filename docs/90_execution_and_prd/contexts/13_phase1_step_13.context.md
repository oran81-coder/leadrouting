# Phase 1 — Step 13: Decision Engine

## Goal
Define decision workflow: recommendation → manager approve/override → optional auto-assign mode.

## Modes
- Manual mode:
  - system recommends
  - manager approves or overrides
- Auto mode (optional Phase 1):
  - if top normalized_score >= threshold then assign automatically
  - still logged and explainable

## Inputs
- Recommendation payload (ranked + explainability)
- Manager actions (approve/override)
- Config: mode + threshold

## Outputs
- Final assignment event stored and emitted to downstream (e.g., update Monday or internal state)
- Audit log entry

## Acceptance Criteria
- No assignment occurs without being logged
- Manual mode preserves manager control
- Auto mode only triggers with explicit config enabled

## Cursor Instructions
- Do not implement silent automation
