# Phase 1 — Step 6: Field Mapping Wizard (Multi-Board)

## Goal
Build the mandatory admin/manager wizard to map internal fields to Monday columns across any boards.

## Inputs
- Board/column tree from Monday Integration
- Internal fields registry (Core + Custom; admin can add/remove any fields including Core)
- Existing mapping configuration (if any)

## Outputs
- Versioned mapping configuration:
  internal_field_id → { board_id, column_id, monday_column_type, updated_at, version }
- Validation report and preview output
- Routing gate state: locked/unlocked

## Functional Requirements
- Show full tree of all boards and their columns
- Mapping UX: Internal Field → (Board → Column) picker (search/filter)
- Required/optional internal fields respected
- Save/re-edit supported; manual reset supported

## Validation
- Required fields must be mapped
- Column type compatibility must match internal field type
- Sample normalization must succeed for selected mappings
- Explicit errors per field

## Non-Goals
- No automatic mapping inference
- No validation of cross-board relational correctness (admin responsibility)

## Acceptance Criteria
- On successful save + validation, routing is unlocked
- On any mapping change, routing re-locks until re-validated
- All changes are logged with who/when/what changed

## Cursor Instructions
- Follow monday_field_mapping_wizard.context_UPDATED.md exactly
