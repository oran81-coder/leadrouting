# Success Metrics (Phase 1)

## Layer C — Business outcomes (UI)
Metrics are **observational** (period-over-period). No causality claims.

### KPIs (time window: 7/30/90 days)
- Conversion rate = Closed/Won / Assigned
- Revenue = SUM(Deal Amount) for Closed/Won (requires mapping)
- Avg deal size = Revenue / Closed/Won (requires mapping)
- Time to close = median(Closed/Won date - Lead created date)
- Per-agent: same KPIs grouped by final assignee at close

### Attribution (Phase 1)
- Attribute outcomes to the FINAL assignee when lead becomes Closed/Won.

### Required mappings
- Closed/Won indicator (status mapping)
- Lead created date (item.created_at or mapped date column)
- Deal Amount (optional; if missing, hide Revenue+Avg deal)

### UX note
- Show Auto/Manual/Random breakdown as optional filter.
