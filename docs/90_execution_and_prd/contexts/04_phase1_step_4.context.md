# Phase 1 — Step 4: Architecture Design

## Goal
Design a modular monolith architecture with clear module boundaries and interfaces.

## Required Modules (Phase 1)
- Monday Integration (API client + polling/webhooks)
- Ingestion & Normalization
- Field Mapping Wizard (mandatory gate)
- Internal Schema Registry (admin-managed fields)
- Agent Profiling Engine
- Rule Engine (definition + evaluation)
- Scoring + Ranking
- Explainability Layer
- Decision Engine (manual + optional auto mode)
- Audit & Logging
- Manager Dashboard + Admin Controls
- AuthN/AuthZ (JWT + role-based)

## Key Interfaces (Must Define)
- Normalized entities: Lead, Agent, Deal (and custom fields)
- Mapping config: internal_field_id → (board_id, column_id, column_type)
- Rule definition model: condition → weight → explanation template
- Decision event model (recommendation + final assignment)

## Inputs
- PRD module list
- README flow (17 steps)

## Outputs
- Architecture doc section (module diagram in text)
- API boundaries + data contracts (DTOs)
- Error handling strategy

## Acceptance Criteria
- Field Mapping Wizard is a hard gate before routing
- Explainability and audit logging are first-class modules
- No hidden automation

## Cursor Instructions
- Do not pick a specific tech stack unless already decided elsewhere
- Keep contracts explicit and testable
