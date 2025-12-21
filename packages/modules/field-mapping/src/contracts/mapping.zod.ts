import { z } from "zod";

export const MondayColumnTypeZ = z.enum([
  "text",
  "numbers",
  "status",
  "date",
  "people",
  "dropdown",
  "tags",
  "link",
]);

export const BoardColumnRefZ = z.object({
  boardId: z.string().min(1),
  columnId: z.string().min(1),
  columnType: MondayColumnTypeZ.optional(),
});

export const InternalFieldTypeZ = z.enum(["text", "number", "status", "date", "boolean"]);

export const InternalFieldDefinitionZ = z.object({
  id: z.string().min(2).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1),
  type: InternalFieldTypeZ,
  required: z.boolean(),
  isCore: z.boolean(),
  isEnabled: z.boolean(),
  description: z.string().optional(),
  group: z.string().optional(),
});

export const WritebackTargetsZ = z.object({
  assignedAgent: BoardColumnRefZ, // mandatory
  routingStatus: BoardColumnRefZ.optional(),
  routingReason: BoardColumnRefZ.optional(),
});

export const FieldMappingConfigZ = z.object({
  version: z.number().int().min(1),
  updatedAt: z.string().min(1),
  mappings: z.record(BoardColumnRefZ),
  fields: z.array(InternalFieldDefinitionZ).min(1),
  writebackTargets: WritebackTargetsZ,
});

export type FieldMappingConfigInput = z.infer<typeof FieldMappingConfigZ>;
