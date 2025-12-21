# Internal Schema (Phase 1)

This project uses an **admin-configurable internal schema**.

- Core fields ship by default, but **admin may remove core fields** (Option B).
- Admin may add/remove custom fields.
- **Weights are NOT part of the schema**. Weights belong to the Rule Engine.

## Where to edit
- Type definitions: `packages/core/src/schema/internalSchema.ts`
- JSON schema (runtime): `packages/core/src/schema/jsonSchemas.ts`

## Normalized entities
Normalized data is stored as:

- `NormalizedLead` / `NormalizedAgent` / `NormalizedDeal`
- `values` is a flexible map keyed by internal field id.
- Validation/normalization is enforced using active field definitions.

## Mapping Wizard expectation
Each active internal field maps to a Monday field identified by:
- `boardId`
- `columnId`

(Board selection is user responsibility; Phase 1 does not validate cross-board relationships.)

## Monday shapes (Phase 1)
We use minimal Monday item/column_value shapes for preview + normalization.
See `packages/modules/monday-integration/src/contracts/monday.types.ts` and `.../application/monday.extractors.ts`.

## Monday client (samples)
A minimal GraphQL client exists at `packages/modules/monday-integration/src/infrastructure/monday.client.ts`.
Preview uses `buildPreviewWithClient()` to fetch first N items per referenced board.
