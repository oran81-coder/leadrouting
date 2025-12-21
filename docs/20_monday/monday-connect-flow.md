# Monday Connect Flow (Phase 1, Option B)

## Goal
Allow the customer admin to connect their Monday workspace **before** using the Field Mapping Wizard.

## How it works
- Admin saves a Personal API token via:
  - `POST /admin/monday/connect` { token, endpoint? }
- Token is stored encrypted in DB (`MondayCredential.tokenEnc`).
- All Monday client creation in routing/manager/admin now uses DB credentials:
  - `createMondayClientForOrg(orgId)`

## Endpoints
- `GET /admin/monday/status`
- `POST /admin/monday/connect`
- `POST /admin/monday/test`

## Security
- Protected by API key auth (`x-api-key`) if `ROUTING_API_KEY` is set.
- Encryption key:
  - `ROUTING_ENC_KEY` (recommended)
