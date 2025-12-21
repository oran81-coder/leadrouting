# Persistence (Phase 1)

We use **Prisma + SQLite** by default for local development.
- SQLite keeps setup minimal.
- Switching to Postgres later is a Prisma datasource change.

## Models (minimal, versioned)
- `InternalSchemaVersion`: versioned JSON payload per org
- `FieldMappingConfigVersion`: versioned JSON payload per org
- `AuditLog`: immutable audit trail

## Commands
- `npm run prisma:migrate` (creates dev.db and applies migrations)
- `npm run prisma:generate` (generates Prisma client)
- `npm run prisma:studio`

## Notes
- We store JSON payloads to avoid premature rigid DB schema.
- Business validation remains in application layer (schema/json-schema/normalization).

## Validation
Admin POST endpoints validate payloads with Zod before saving a new version.
