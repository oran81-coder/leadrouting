# Phase 1 — Step 10: Rule Evaluation Engine

## Goal
Evaluate all enabled rules for a given lead against candidate agents and produce per-rule contributions.

## Inputs
- Lead record
- Set of candidate agents + AgentProfiles
- Enabled rules

## Outputs
- Per agent:
  - list of {rule_id, applied:boolean, contribution, explanation}
- Deterministic evaluation order and tie-break rules

## Acceptance Criteria
- Same inputs produce same per-rule outputs
- Each contribution has an explanation entry (even when not applied: “not matched” is allowed)

## Cursor Instructions
- Do not optimize prematurely; correctness and determinism first
