# Local E2E Preview (Schema + Mapping + Monday)

This enables an end-to-end test of the **Mapping Preview** pipeline:

1) Save internal schema (versioned) to DB
2) Save mapping config (versioned) to DB
3) Call `/mapping/preview` to fetch Monday samples and run normalization preview

## Setup
- Copy `.env.example` to `.env`
- Set:
  - `DATABASE_URL="file:./dev.db"`
  - `MONDAY_API_TOKEN=...`

## DB
- `npm run prisma:generate`
- `npm run prisma:migrate`

## Run API (dev)
(Depending on your build setup, you may use ts-node/tsx later. For now this repo is skeleton.)

## Endpoints
- `POST /admin/schema`  (body = InternalSchema object)
- `POST /admin/mapping` (body = FieldMappingConfig object)
- `GET /mapping/preview`

## Expected response
- `rows`: 3 entries (lead/agent/deal)
- `hasErrors`: true if any entity normalization failed

## Business validation
- `GET /admin/validate` checks latest schema+mapping consistency.
- `/mapping/preview` runs business validation before calling Monday.
