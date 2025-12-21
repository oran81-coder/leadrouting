export type RuleId = string;

export interface Rule {
  id: RuleId;
  name: string;
  weight: number; // weights live here
  condition: Record<string, unknown>; // placeholder for rule DSL
  explanationTemplate: string;
}
