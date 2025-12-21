# Routing Enablement (Phase 1)

Routing can be enabled only if:
- Latest internal schema exists
- Latest mapping config exists
- Latest ruleset exists
- Business validation passes (schema+mapping consistency)

## Endpoints (local skeleton)
- `GET /admin/rules/latest`
- `POST /admin/rules`
- `GET /admin/routing/state`
- `POST /admin/routing/enable`
- `POST /admin/routing/disable`

When enabled, we snapshot versions into RoutingState:
- schemaVersion
- mappingVersion
- rulesVersion
