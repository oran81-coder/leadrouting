/**
 * JSON Schemas used for runtime validation (Phase 1).
 * We keep them in code so Cursor can update them alongside TS types.
 *
 * Note:
 * - Schema is admin-configurable; this file validates the *structure* of the schema definition,
 *   not the dynamically changing list of fields.
 */

export const InternalSchemaDefinitionJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "internal-schema-definition",
  type: "object",
  additionalProperties: false,
  required: ["version", "updatedAt", "fields"],
  properties: {
    version: { type: "integer", minimum: 1 },
    updatedAt: { type: "string", format: "date-time" },
    fields: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "entity", "type", "required", "isCore", "active"],
        properties: {
          id: { type: "string", minLength: 2, pattern: "^[a-z][a-z0-9_]*$" },
          label: { type: "string", minLength: 1 },
          entity: { enum: ["lead", "agent", "deal"] },
          type: { enum: ["text", "number", "status", "date", "boolean"] },
          required: { type: "boolean" },
          isCore: { type: "boolean" },
          active: { type: "boolean" },
          description: { type: "string" },
          group: { type: "string" },
        },
      },
    },
  },
} as const;

/**
 * Generic schema for a normalized entity record:
 * - values: free-form key/value map (validated via code using the active field definitions)
 */
export const NormalizedEntityJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "normalized-entity",
  type: "object",
  additionalProperties: false,
  required: ["entity", "internalId", "values"],
  properties: {
    entity: { enum: ["lead", "agent", "deal"] },
    internalId: { type: "string", minLength: 1 },
    values: { type: "object", additionalProperties: true },
  },
} as const;
