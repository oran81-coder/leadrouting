# Phase 1 Auth + CORS

## API Key Auth (minimal)
If env `ROUTING_API_KEY` is set, the API requires:

Header:
- `x-api-key: <ROUTING_API_KEY>`

Applied to:
- `/admin/*`
- `/manager/*`
- `/routing/*` (protects execute + writeback)

If `ROUTING_API_KEY` is empty/not set, auth is disabled (local dev).

## CORS
If env `CORS_ORIGIN` is set (e.g. `http://localhost:5173`), only that origin is allowed.
Otherwise, CORS is permissive for local dev.

Allowed headers:
- `Content-Type`
- `x-api-key`


## Monday Connect
Admin endpoints include Monday connect/test/status and are protected under `/admin/*`.
