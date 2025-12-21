# Manager Dashboard API Contract (Phase 1)

## List proposals
`GET /manager/proposals`

Query params:
- status: PROPOSED | OVERRIDDEN | APPLIED | REJECTED | APPROVED (optional)
- limit: 1..100 (default 25)
- cursor: createdAt ISO string (exclusive) for pagination
- boardId (optional)
- itemId (optional)

Response:
```json
{
  "ok": true,
  "items": [
    {
      "id": "cuid",
      "status": "PROPOSED",
      "createdAt": "2025-12-19T18:00:00.000Z",
      "boardId": "123",
      "itemId": "456",
      "suggestedAssigneeRaw": "john@company.com",
      "suggestedRuleName": "High Value - Enterprise",
      "normalizedValues": { "...": "..." },
      "explains": [ "..." ]
    }
  ],
  "nextCursor": "2025-12-18T10:00:00.000Z"
}
```

## Bulk approve
`POST /manager/proposals/bulk-approve`

Body:
```json
{ "ids": ["id1","id2"] }
```

Response:
```json
{ "ok": true, "results": [ { "id": "...", "ok": true, "status": "APPLIED" } ] }
```
