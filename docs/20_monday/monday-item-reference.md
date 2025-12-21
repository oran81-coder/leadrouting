# Execute by itemId (Phase 1)

`POST /routing/execute` now supports:
- `{ itemId: "123" }` (boardId is optional)
- `{ boardId: "...", itemId: "..." }`

If boardId is omitted, the system calls Monday `items(ids: ...)` to discover the boardId.

## People assignments
If writebackTargets.assignedAgent.columnType = `people`, then the rule action value may be:
- numeric Monday user id (recommended)
- email
- full name (exact match, case-insensitive)

The system resolves it via Monday users directory (cached in-memory for 10 minutes).
