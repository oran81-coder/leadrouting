import { z } from "zod";

export const EntityTypeZ = z.enum(["lead", "agent", "deal"]);
export const InternalValueTypeZ = z.enum(["text", "number", "status", "date", "boolean"]);

export const FieldDefinitionZ = z.object({
  id: z.string().min(2).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1),
  entity: EntityTypeZ,
  type: InternalValueTypeZ,
  required: z.boolean(),
  isCore: z.boolean(),
  active: z.boolean(),
  description: z.string().optional(),
  group: z.string().optional(),
});

export const InternalSchemaZ = z.object({
  version: z.number().int().min(1),
  updatedAt: z.string().min(1), // ISO string, validate format in app if needed
  fields: z.array(FieldDefinitionZ).min(1),
});

export type InternalSchemaInput = z.infer<typeof InternalSchemaZ>;
