# Routing Evaluate (Phase 1)

Endpoint:
- `POST /routing/evaluate`

Purpose:
- Dry-run evaluation of routing rules for a lead
- Returns explainability (which rules were checked, condition pass/fail)

Requirements:
- Routing must be enabled (`/admin/routing/enable`)
- Latest schema + mapping + rules must exist
- Business validation must pass

Input:
```json
{
  "lead": {
    "country": "IL",
    "budget": "1200",
    "status": "New"
  }
}
```

Output:
- `normalizedValues`
- `selectedRule`
- `explains[]` with per-condition results
