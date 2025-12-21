# Outcomes Screen (Phase 1.5)

## Audience
- Org Admin: full view (outcomes + filters)
- Manager: read-only outcomes for team

## Filters
- Time window: 7/30/90 days (default 30)
- Compare: previous period (toggle)
- Mode: All / Auto / Manual / Random
- Board: All / specific lead board

## KPI Cards
- Conversion rate
- Time to close (median)
- Revenue (optional: requires Deal Amount mapping)
- Avg deal size (optional: requires Deal Amount mapping)

## Per-agent Table
- Columns: Agent, Assigned, Closed/Won, Conversion %, Revenue (opt), Avg deal (opt), Median time-to-close
- Sorting: by Conversion (default) or Revenue (if enabled)

## Attribution (Phase 1)
- Attribute a Closed/Won outcome to the FINAL assignee at the moment the lead becomes Closed/Won.

## Data requirements (Wizard)
- Closed/Won status mapping (required)
- Lead created date (item.created_at or mapped date column) (required)
- Deal Amount column mapping (optional; if missing, hide Revenue+Avg deal)

## API Contract (minimal)
GET /outcomes/summary?windowDays=30&mode=all&boardId=optional
Response:
{
  "windowDays": 30,
  "kpis": {"assigned":123,"closedWon":24,"conversionRate":0.195,"medianTimeToCloseDays":12.4,"revenue":null,"avgDeal":null},
  "perAgent": [...]
}

## Notes
- Show a small badge if a metric is unavailable (missing mapping) instead of erroring.
- Do NOT claim uplift due to the system; show period-over-period trends only.
