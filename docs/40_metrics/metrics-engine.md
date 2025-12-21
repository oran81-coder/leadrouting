# Agent Metrics Engine (Phase 1)

Purpose:
- Compute agent performance metrics from Monday-only data
- Allow admin to configure time windows + thresholds
- Allow admin to set metric weights (sum=100)
- Provide explainable snapshots per agent for scoring

## Key Metrics
- Conversion rate (window days)
- Avg deal size (window days)
- Hot streak (X deals in Y hours)
- Response speed (first touch by: contacted status OR next call date)
- Burnout (time since last win + time since last activity)
- Industry performance (conversion per industry)

## Config (Admin)
Endpoint: `GET/PUT /metrics/config`

Required fields to start:
- `leadBoardIds` (comma-separated)
- `industryColumnId`
- `closedWonStatusColumnId` + `closedWonStatusValue`
- `dealAmountColumnId`
- `contactedStatusColumnId` + `contactedStatusValue`
- `nextCallDateColumnId`

## Recompute
- Background job runs on interval:
  - `METRICS_JOB_INTERVAL_SECONDS`
- Manual trigger:
  - `POST /metrics/recompute`

## Read snapshots
- `GET /metrics/agents/:agentUserId`

## Notes / Limitations (Phase 1)
- This job uses bounded board fetch (`METRICS_FETCH_LIMIT_PER_BOARD`) to keep API usage safe.
- Assignment userId is not derived from Monday People column yet; it is expected to be written by routing apply (next improvement).


## Feature toggles
Each metric can be enabled/disabled:
- When disabled: job will not read the related Monday column(s), and scoring/explainability omit it.
- When re-enabled: use manual recompute (B behavior) to compute from the configured window.


## UI helper: Pick from Monday
Admin Metrics Setup includes a picker that calls API endpoints under `/monday/*` to list boards/columns and (for status columns) status labels.


## Routing Preview
See `docs/routing-preview.md` for simulation mode details.


## Fallback behavior (Auto mode)

When operating in **automatic routing mode**, the system guarantees assignment and never blocks a lead.

### No clear winner
If no clear winner is identified (tie scores or low confidence across agents),
the system assigns the lead **randomly among eligible active agents**.

### Lead does not match any agent
If a lead does not sufficiently match any agent profile (e.g. unknown industry, no historical data),
the system assigns the lead **randomly among eligible active agents**.

### Notes
- Random selection is performed **only** among agents that passed gating (active, availability, caps).
- This fallback applies **only in Auto mode**.
- In Manual / Approval mode, the manager always decides.
