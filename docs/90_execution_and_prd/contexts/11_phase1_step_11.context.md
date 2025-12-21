# Phase 1 — Step 11: Scoring Engine

## Goal
Aggregate per-rule contributions into a final score per agent and produce a ranked list.

## Inputs
- Per-agent rule contributions from Step 10

## Outputs
- AgentScore:
  - raw_score
  - normalized_score (0-100)
  - rank
  - tie-break rationale

## Tie-Break Rules (Deterministic)
- Define deterministic tie-breakers (e.g., higher recent performance metric, then stable agent_id sort)

## Acceptance Criteria
- Normalization method documented and consistent
- Tie-breakers produce stable ordering

## Cursor Instructions
- Keep normalization transparent and explainable
