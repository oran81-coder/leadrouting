# Phase 1 — Step 7: Internal Data Schema (Admin-Managed Fields)

## Goal
Define internal schema entities and support admin-managed field registry (add/remove fields, required/optional).

## Entities (Normalized)
- Lead
- Agent
- Deal

## Field Registry
- Seed with example “Core” fields (initial set)
- Admin can add custom fields
- Admin can remove any fields (including Core) — impacts required mapping and rules

## Type System
- Supported types must align with Monday column types (e.g., text, number, status, date)
- Internal types must be explicit and used by:
  - Mapping validation
  - Normalization
  - Rule engine conditions

## Inputs
- PRD schema examples
- Admin field definitions (stored in DB)

## Outputs
- Schema registry service + DB tables:
  - internal_fields
  - field_constraints (required/optional)
  - entity association (Lead/Agent/Deal)
- Canonical DTOs for normalized entities

## Acceptance Criteria
- Adding/removing fields triggers mapping re-validation requirement
- All downstream modules reference schema registry (no hard-coded fields in code)

## Cursor Instructions
- Do not embed rule weights here
- If removing a field breaks existing rules, mark rules invalid until admin fixes them
