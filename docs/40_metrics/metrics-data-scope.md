# Metrics data scope (Phase 1)

## Summary
Phase 1 metrics MUST be computed only from items that live on the configured Lead Boards (`leadBoardIds`).
This is a deliberate limitation to keep the system deterministic, explainable, and easy to deploy.

## Why this exists
Many orgs store "Deals / Payments / Finance" on separate boards.
If we try to pull Deal Amount (or any other metric input) from another board, we would need cross-board joins:
- a stable join key (email/phone/linked item)
- handling multiple deals per lead
- reconciliation rules and conflicts
- extra polling/webhooks and state
This is Phase 2+ complexity and not part of Phase 1.

## Rule (hard)
For Phase 1:
- Every metric input column (Deal Amount, Industry, Statuses, etc.) MUST be a column that exists on one of the Lead Boards.
- The system will reject metric configs that reference a column outside `leadBoardIds`.

## What to do if Deal Amount is on another board
Recommended Monday-native approach:
1. On the Lead Board, add a **Mirror** column (or an Automation that copies a number).
2. Mirror/copy the Deal Amount from the Deals/Finance board into the Lead Board.
3. In the Metrics Wizard, select the mirrored column as `dealAmountColumnId`.

This keeps Phase 1 stable and still lets you use Deal Amount in scoring.

## Phase 2 note
In Phase 2 we can support cross-board metrics by adding:
- explicit relations between Lead items and Deal items
- join strategy (1:1 / 1:many)
- aggregation (latest deal, sum, avg)
- stronger audit/explainability

## Mirror columns support
Mirror columns are **supported in Phase 1**.

If a metric value (e.g. Deal Amount, Industry) originates from another board, it may be mirrored or copied into the Lead Board using Monday automations.
The system treats mirrored values as regular Lead Board values.

⚠️ Data freshness and correctness depend on the underlying Monday automation.
