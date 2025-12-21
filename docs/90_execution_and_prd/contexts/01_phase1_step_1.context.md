# Phase 1 — Step 1: System Overview & Scope

## Goal
Define the Phase 1 product boundary: what is being built, what is explicitly excluded, and the non-negotiables (deterministic, explainable, auditable).

## In Scope (Phase 1)
- Single organization deployment
- Monday.com as the only data source
- Rule-based (deterministic) agent recommendation for leads
- Manager workflow: approve / override
- Optional auto-assign mode based on threshold (still logged)
- Explainability + audit logs

## Out of Scope (Phase 1)
- ML / NLP / personalization models
- Telephony, call recordings, WhatsApp, email
- Multi-organization / multi-tenant infrastructure
- Automatic mapping inference
- Automatic schema guessing

## Inputs
- PRD (Phase 1)
- README project rules

## Outputs
- Confirmed Phase 1 scope statement used by all subsequent steps
- Acceptance checklist for “Phase 1 is compliant”

## Acceptance Criteria
- All “Out of Scope” items are explicitly documented and referenced by later steps (e.g., wizard and rules UI)
- No step introduces ML/NLP/telephony assumptions

## Cursor Instructions
- Do not add features not listed in scope
- Stop if asked to implement excluded items
