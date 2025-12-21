# Phase 1 — Step 8: Agent Profiling Engine

## Goal
Compute agent profiles deterministically from normalized Monday data.

## Inputs
- Normalized Agent records
- Related Deal/Outcome data as available (via mappings)
- Time window parameters (configurable)

## Outputs
- AgentProfile object per agent:
  - workload metrics
  - conversion rate (if available)
  - average deal size (if available)
  - recent performance signals (deterministic calculations)

## Rules
- All metrics must be explainable and derived from data
- If required fields are missing (due to admin removal), metric must degrade gracefully and log why

## Acceptance Criteria
- Profiles recompute deterministically with same input data
- Missing data is handled with explicit “not available” reasons

## Cursor Instructions
- No ML scoring; only arithmetic aggregations
