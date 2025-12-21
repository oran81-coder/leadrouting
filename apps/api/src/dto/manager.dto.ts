import type { RoutingProposal } from "../../../../packages/modules/routing-state/src/infrastructure/routingProposal.repo";

export type ManagerProposalDTO = {
  id: string;
  status: string;
  createdAt: string;

  boardId: string;
  itemId: string;

  // what the engine suggested
  suggestedAssigneeRaw: string | null; // as stored in rule action (could be id/email/name)
  suggestedRuleName: string | null;

  // normalized snapshot (optional for UI)
  normalizedValues: unknown;

  // explainability
  explains: unknown;
};

export function toManagerProposalDTO(p: RoutingProposal): ManagerProposalDTO {
  const action: any = (p.action as any) ?? null;
  const rule: any = (p.selectedRule as any) ?? null;

  return {
    id: p.id,
    status: p.status,
    createdAt: p.createdAt,
    boardId: p.boardId,
    itemId: p.itemId,
    suggestedAssigneeRaw: action?.value ? String(action.value) : null,
    suggestedRuleName: rule?.name ? String(rule.name) : null,
    normalizedValues: p.normalizedValues ?? null,
    explains: p.explainability ?? null,
  };
}
