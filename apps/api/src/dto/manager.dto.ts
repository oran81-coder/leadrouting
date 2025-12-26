import type { RoutingProposal } from "../../../../packages/modules/routing-state/src/infrastructure/routingProposal.repo";
import { PrismaMondayUserCacheRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayUserCache.repo";

export type ManagerProposalDTO = {
  id: string;
  status: string;
  createdAt: string;

  boardId: string;
  itemId: string;
  itemName: string | null; // Name of the lead/item from Monday.com

  // what the engine suggested
  suggestedAssigneeRaw: string | null; // as stored in rule action (could be id/email/name)
  suggestedAssigneeName: string | null; // resolved name from Monday users cache
  suggestedRuleName: string | null;

  // match score
  matchScore: number | null; // extracted from explainability.topAgent.score

  // normalized snapshot (optional for UI)
  normalizedValues: unknown;

  // explainability
  explains: unknown;
};

export async function toManagerProposalDTO(p: RoutingProposal, orgId: string): Promise<ManagerProposalDTO> {
  const action: any = (p.action as any) ?? null;
  const rule: any = (p.selectedRule as any) ?? null;
  const explainability: any = (p.explainability as any) ?? null;

  // Extract suggested assignee ID
  const suggestedAssigneeRaw = action?.value ? String(action.value) : null;

  // Resolve agent name from Monday users cache
  let suggestedAssigneeName: string | null = null;
  if (suggestedAssigneeRaw) {
    try {
      const userRepo = new PrismaMondayUserCacheRepo();
      
      // Check if it's a numeric ID
      if (/^[0-9]+$/.test(suggestedAssigneeRaw)) {
        const users = await userRepo.list(orgId);
        const user = users.find(u => u.userId === suggestedAssigneeRaw);
        suggestedAssigneeName = user?.name ?? null;
      } else {
        // It might be an email or name already
        suggestedAssigneeName = suggestedAssigneeRaw;
      }
    } catch (error) {
      console.error("Failed to resolve agent name:", error);
    }
  }

  // Extract match score from explainability
  let matchScore: number | null = null;
  if (explainability?.topAgent?.score !== undefined) {
    matchScore = Number(explainability.topAgent.score);
  }

  return {
    id: p.id,
    status: p.status,
    createdAt: p.createdAt,
    boardId: p.boardId,
    itemId: p.itemId,
    itemName: (p as any).itemName ?? null,
    suggestedAssigneeRaw,
    suggestedAssigneeName,
    suggestedRuleName: rule?.name ? String(rule.name) : null,
    matchScore,
    normalizedValues: p.normalizedValues ?? null,
    explains: explainability,
  };
}
