# Writeback Targets (Wizard)

The Wizard config includes a `writebackTargets` block inside FieldMappingConfig.

## Mandatory
- `assignedAgent`: where to write the selected assignee back to Monday.

Supported column types:
- people: writes a person by monday user id
- text: writes a string
- status: writes a label

## Optional
- `routingStatus`: update a status label (e.g., Pending Approval / Assigned)
- `routingReason`: update a text column with rule name / explain summary

## Flow
- MANUAL_APPROVAL:
  - `/routing/execute` creates a proposal (PROPOSED)
  - manager approves -> applies writeback
- AUTO:
  - `/routing/execute` evaluates and applies writeback immediately


## Pending Approval writeback
In MANUAL_APPROVAL mode, /routing/execute will (best-effort) set routingStatus='Pending Approval' and routingReason.
