# Phase 1 — Step 12: Explainability Layer

## Goal
Produce a manager-facing explanation for why an agent is recommended and why others rank lower.

## Inputs
- Ranked agent list with per-rule contributions
- Rule definitions (names + explanation templates)

## Outputs
- Explanation payload:
  - top recommendation summary
  - per-rule breakdown for top N agents
  - “why not others” comparison

## Acceptance Criteria
- Every recommendation has explainability (non-negotiable)
- Explanations are stable and correspond to actual scoring inputs

## Cursor Instructions
- Do not generate explanations not grounded in data/rules
