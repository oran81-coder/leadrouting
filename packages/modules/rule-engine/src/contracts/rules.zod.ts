import { z } from "zod";

export const ComparatorZ = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]);

export const RuleConditionZ = z.object({
  fieldId: z.string().min(2).regex(/^[a-z][a-z0-9_]*$/),
  op: ComparatorZ,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number(), z.boolean()])),
    z.null(),
  ]),
});

export const RuleActionZ = z.object({
  type: z.enum(["assign_agent_pool", "assign_agent_id"]),
  value: z.string().min(1),
});

export const RoutingRuleZ = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
  when: z.array(RuleConditionZ),
  then: RuleActionZ,
});

export const RuleSetZ = z.object({
  version: z.number().int().min(1),
  updatedAt: z.string().min(1),
  rules: z.array(RoutingRuleZ),
  weights: z.record(z.number().min(0)).optional(),
});

export type RuleSetInput = z.infer<typeof RuleSetZ>;
