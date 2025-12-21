# MASTER README — Phase 1 Rule-Based Lead Routing System (Cursor Project) — UPDATED (2025-12-19)

## Purpose
Phase 1 builds a deterministic, explainable, rule-based lead routing system that assists sales managers in assigning leads to agents using Monday.com data.

Constraints (Phase 1):
- Single organization only
- Monday.com is the only data source
- No ML, no NLP, no telephony
- Explainability + auditability are mandatory
- Development is done using Cursor and context files

## Cursor Development Rules (Mandatory)
1. Work step-by-step (do not skip steps)
2. Before implementing code, read the relevant `.context.md`
3. Never assume functionality not explicitly described
4. Stop and ask when human input is required

## Project Structure
/contexts
  - 01_phase1_step_1.context.md
  - ...
  - 17_phase1_step_17.context.md
  - monday_field_mapping_wizard.context_UPDATED.md

/backend
/frontend
/docs

Each context file defines one development step (scope, inputs/outputs, acceptance criteria).

## Phase 1 Steps Overview
1. System Overview & Scope
2. Core Objectives
3. System Constraints
4. Architecture Design
5. Monday.com Data Ingestion
6. Field Mapping Wizard (multi-board mapping)
7. Internal Data Schema (admin-managed fields)
8. Agent Profiling Engine
9. Rule Definition Model (weights live here)
10. Rule Evaluation Engine
11. Scoring Engine
12. Explainability Layer
13. Decision Engine
14. Override & Audit Logging
15. Dashboard (Manager UI)
16. Security & Access Control
17. Completion Criteria & Validation

## Key Clarifications (Applied)
### Field Mapping Wizard
- Mapping is not tied to a single board.
- Each internal field maps to a specific (Board → Column) path chosen from a full tree of all boards and columns.
- Stored mapping per internal field includes: `board_id`, `column_id`, and Monday column type metadata.
- Responsibility: admin/manager selects the correct board/column; Phase 1 does not validate cross-board relational correctness beyond type + normalization checks.
- Routing must remain locked until mapping validates.

### Internal Fields (Schema)
- The system starts with a set of example “Core” internal fields (as defined in schema/PRD).
- Admin can:
  - add custom internal fields
  - remove any internal fields (including Core)
  - mark fields required/optional
- Rule weights are NOT part of the Mapping Wizard. Weights are configured in Rule Engine / Rules UI.

## Rules Engine Philosophy
- Rules are explicit
- Rules are deterministic
- Rules are weighted (configured in Rule Engine)
- Every score must be explainable

Example:
IF agent.industry == lead.industry
THEN +30 points
BECAUSE "Industry Match"

## Human Input Required
Cursor must stop and request human input when:
- Defining business rules
- Assigning rule weights
- Mapping Monday.com fields
- Approving UX decisions
- Confirming phase completion

## Completion Definition
Phase 1 is complete only when:
- Monday.com integration is stable
- Field mapping validates (required + types + normalization)
- Rules produce consistent scores
- Explanations are accurate
- Manager workflow is usable
- Overrides are tracked
- No hidden automation exists
