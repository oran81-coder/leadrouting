# Phase 1 — Step 5: Monday.com Data Ingestion

## Goal
Implement reliable data retrieval from Monday.com and produce raw records for normalization.

## Scope
- Connect to Monday.com with OAuth/token (as chosen by project)
- Fetch boards + columns metadata
- Fetch items/rows from relevant boards (leads/agents/deals can be spread across boards)
- Support polling (default) and/or webhooks (optional); Phase 1 must function with polling

## Inputs
- Monday API credentials/config
- Board/column inventory from Monday
- Rate limits and paging behavior

## Outputs
- Ingestion service that can:
  - list boards and columns (for wizard tree)
  - fetch item data for sample preview and for routing computations
- Stable error handling + retries

## Acceptance Criteria
- Can fetch full board tree (board → columns) for wizard
- Can fetch sample records from selected board IDs for preview normalization
- All API failures are logged with actionable messages

## Cursor Instructions
- Do not assume a single “Leads board”; boards are arbitrary
- Keep API layer isolated behind an interface for testing
