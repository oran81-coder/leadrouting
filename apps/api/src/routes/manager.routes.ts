import { Router } from "express";
import { toManagerProposalDTO } from "../dto/manager.dto";
import { requireEnv, optionalEnv } from "../config/env";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { applyAssignmentToMonday } from "../../../../packages/modules/monday-integration/src/application/monday.writeback";
import { resolveMondayPersonId } from "../../../../packages/modules/monday-integration/src/application/monday.people";

import { PrismaRoutingProposalRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingProposal.repo";
import { PrismaRoutingApplyRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingApply.repo";
import { PrismaFieldMappingConfigRepo } from "../../../../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";
import { PrismaAuditRepo } from "../../../../packages/modules/audit-logging/src/infrastructure/audit.repo";

/**
 * Manager approval endpoints (Phase 1 skeleton).
 * Auth is not wired yet; actor is hardcoded.
 */
export function managerRoutes() {
  const r = Router();

  const proposalRepo = new PrismaRoutingProposalRepo();
  const applyRepo = new PrismaRoutingApplyRepo();
  const mappingRepo = new PrismaFieldMappingConfigRepo();
  const auditRepo = new PrismaAuditRepo();

  const ORG_ID = "org_1";
  const ACTOR = "manager";

  r.get("/proposals", async (req, res) => {
  const status = req.query?.status ? String(req.query.status) : undefined;
  const cursor = req.query?.cursor ? String(req.query.cursor) : undefined;
  const limit = req.query?.limit ? Number(req.query.limit) : 25;
  const boardId = req.query?.boardId ? String(req.query.boardId) : undefined;
  const itemId = req.query?.itemId ? String(req.query.itemId) : undefined;

  const result = await proposalRepo.list({
    orgId: ORG_ID,
    status: status as any,
    cursor,
    limit,
    boardId,
    itemId,
  });

  return res.json({
    ok: true,
    items: result.items.map(toManagerProposalDTO),
    nextCursor: result.nextCursor,
  });
});


  r.post("/proposals/:id/approve", async (req, res) => {
    const id = String(req.params.id);
    const proposal = await proposalRepo.getById(ORG_ID, id);
    if (!proposal) return res.status(404).json({ ok: false, error: "Proposal not found" });
    if (proposal.status !== "PROPOSED") return res.status(400).json({ ok: false, error: "Proposal is not PROPOSED" });

    const mapping = await mappingRepo.getLatest(ORG_ID);
    if (!mapping) return res.status(400).json({ ok: false, error: "Missing mapping config" });

    const client = await createMondayClientForOrg(ORG_ID);

    const action = (proposal.action as any);
    if (!action?.value) return res.status(400).json({ ok: false, error: "Proposal has no action/value" });

    let assigneeResolvedValue = String(action.value);
      if ((mapping as any).writebackTargets?.assignedAgent?.columnType === 'people') {
        assigneeResolvedValue = String(await resolveMondayPersonId(client as any, ORG_ID, assigneeResolvedValue));
      }

      const reason = (proposal.selectedRule as any)?.name ? `${(proposal.selectedRule as any).name}` : "Approved";
    const guard = await applyRepo.tryBegin(ORG_ID, id);
      if (guard === "ALREADY") {
        return res.json({ ok: true, id, status: "APPLIED", alreadyApplied: true });
      }

      const guard2 = await applyRepo.tryBegin(ORG_ID, id);
            if (guard2 === "ALREADY") {
              return res.json({ ok: true, id, status: "APPLIED", alreadyApplied: true });
            }

            await applyAssignmentToMonday(client as any, (mapping as any).writebackTargets, {
      boardId: proposal.boardId,
      itemId: proposal.itemId,
      assigneeValue: assigneeResolvedValue,
      reason,
      status: "Assigned",
    });

    await proposalRepo.setDecision({ orgId: ORG_ID, id, status: "APPROVED", decidedBy: ACTOR, decisionNotes: req.body?.notes ?? null });
    await proposalRepo.markApplied(ORG_ID, id);

    await auditRepo.log({
      orgId: ORG_ID,
      actorUserId: ACTOR,
      action: "routing.approve_and_apply",
      entityType: "RoutingProposal",
      entityId: id,
      before: null,
      after: { applied: true },
    });

    return res.json({ ok: true, id, status: "APPLIED" });
  });

  r.post("/proposals/:id/reject", async (req, res) => {
    const id = String(req.params.id);
    const proposal = await proposalRepo.getById(ORG_ID, id);
    if (!proposal) return res.status(404).json({ ok: false, error: "Proposal not found" });

    await proposalRepo.setDecision({ orgId: ORG_ID, id, status: "REJECTED", decidedBy: ACTOR, decisionNotes: req.body?.notes ?? null });

    await auditRepo.log({
      orgId: ORG_ID,
      actorUserId: ACTOR,
      action: "routing.reject",
      entityType: "RoutingProposal",
      entityId: id,
      before: null,
      after: { status: "REJECTED" },
    });

    return res.json({ ok: true, id, status: "REJECTED" });
  });

  r.post("/proposals/:id/override", async (req, res) => {
  const id = String(req.params.id);
  const proposal = await proposalRepo.getById(ORG_ID, id);
  if (!proposal) return res.status(404).json({ ok: false, error: "Proposal not found" });

  const newValue = req.body?.assigneeValue;
  if (!newValue) return res.status(400).json({ ok: false, error: "Missing body.assigneeValue" });

  const applyNow = req.body?.applyNow === true;

  const updated = await proposalRepo.setDecision({
    orgId: ORG_ID,
    id,
    status: "OVERRIDDEN",
    decidedBy: ACTOR,
    decisionNotes: req.body?.notes ?? null,
    actionOverride: { ...(proposal.action as any), value: String(newValue) },
  });

  await auditRepo.log({
    orgId: ORG_ID,
    actorUserId: ACTOR,
    action: "routing.override",
    entityType: "RoutingProposal",
    entityId: id,
    before: null,
    after: { assigneeValue: overrideResolvedValue, applyNow },
  });

  if (!applyNow) {
    // Manager overrode proposal but chose not to write back to Monday now.
    return res.json({ ok: true, id, status: "OVERRIDDEN", applied: false });
  }



  if (!applyNow) {
    return res.json({ ok: true, id, status: "OVERRIDDEN" });
  }

  const mapping = await mappingRepo.getLatest(ORG_ID);
  if (!mapping) return res.status(400).json({ ok: false, error: "Missing mapping config" });

  const client = await createMondayClientForOrg(ORG_ID);

  let overrideResolvedValue = String(newValue);
            if ((mapping as any).writebackTargets?.assignedAgent?.columnType === 'people') {
              overrideResolvedValue = String(await resolveMondayPersonId(client as any, ORG_ID, overrideResolvedValue));
            }
            const reason = "Overridden by manager";
  await applyAssignmentToMonday(client as any, (mapping as any).writebackTargets, {
    boardId: updated.boardId,
    itemId: updated.itemId,
    assigneeValue: overrideResolvedValue,
    reason,
    status: "Assigned",
  });

  await proposalRepo.markApplied(ORG_ID, id);

  await auditRepo.log({
    orgId: ORG_ID,
    actorUserId: ACTOR,
    action: "routing.override_and_apply",
    entityType: "RoutingProposal",
    entityId: id,
    before: null,
    after: { applied: true },
  });

  return res.json({ ok: true, id, status: "APPLIED" });
});


  
/**
 * Bulk approve: approves up to 50 proposal ids.
 * Body: { ids: string[] }
 */
r.post("/proposals/bulk-approve", async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  if (!ids.length) return res.status(400).json({ ok: false, error: "Missing body.ids" });
  if (ids.length > 50) return res.status(400).json({ ok: false, error: "Max 50 ids" });

  const mapping = await mappingRepo.getLatest(ORG_ID);
  if (!mapping) return res.status(400).json({ ok: false, error: "Missing mapping config" });

  const client = await createMondayClientForOrg(ORG_ID);

  const results: Array<{ id: string; ok: boolean; status?: string; error?: string; alreadyApplied?: boolean }> = [];

  for (const id of ids) {
    try {
      const proposal = await proposalRepo.getById(ORG_ID, id);
      if (!proposal) {
        results.push({ id, ok: false, error: "Proposal not found" });
        continue;
      }
      if (proposal.status !== "PROPOSED" && proposal.status !== "OVERRIDDEN") {
        results.push({ id, ok: false, error: `Invalid status ${proposal.status}` });
        continue;
      }

      const guard = await applyRepo.tryBegin(ORG_ID, id);
      if (guard === "ALREADY") {
        results.push({ id, ok: true, status: "APPLIED", alreadyApplied: true });
        continue;
      }

      const action: any = (proposal.action as any) ?? null;
      const assigneeRaw = action?.value ? String(action.value) : "";
      let assigneeResolvedValue = assigneeRaw;

      if ((mapping as any).writebackTargets?.assignedAgent?.columnType === "people") {
        assigneeResolvedValue = String(await resolveMondayPersonId(client as any, ORG_ID, assigneeRaw));
      }

      const reason = (proposal.selectedRule as any)?.name ? String((proposal.selectedRule as any).name) : "Approved by manager";
      await applyAssignmentToMonday(client as any, (mapping as any).writebackTargets, {
        boardId: proposal.boardId,
        itemId: proposal.itemId,
        assigneeValue: assigneeResolvedValue,
        reason,
        status: "Assigned",
      });

      await proposalRepo.markApplied(ORG_ID, id);

      await auditRepo.log({
        orgId: ORG_ID,
        actorUserId: ACTOR,
        action: "routing.bulk_approve.apply",
        entityType: "RoutingProposal",
        entityId: id,
        before: null,
        after: { applied: true },
      });

      results.push({ id, ok: true, status: "APPLIED" });
    } catch (e: any) {
      results.push({ id, ok: false, error: e?.message ?? String(e) });
    }
  }

  return res.json({ ok: true, results });
});

    
/**
 * Approve all proposals matching filters (server-side pagination).
 * Body supports same filters as GET /proposals.
 * Default: status=PROPOSED, maxTotal=200.
 */
r.post("/proposals/approve-all", async (req, res) => {
  const status = req.body?.status ? String(req.body.status) : "PROPOSED";
  const boardId = req.body?.boardId ? String(req.body.boardId) : undefined;
  const itemId = req.body?.itemId ? String(req.body.itemId) : undefined;

  const maxTotal = req.body?.maxTotal ? Number(req.body.maxTotal) : 200;
  const pageSize = Math.min(Math.max(req.body?.pageSize ? Number(req.body.pageSize) : 50, 1), 100);

  if (maxTotal > 1000) return res.status(400).json({ ok: false, error: "maxTotal too large (<=1000)" });

  const mapping = await mappingRepo.getLatest(ORG_ID);
  if (!mapping) return res.status(400).json({ ok: false, error: "Missing mapping config" });

  const client = await createMondayClientForOrg(ORG_ID);

  const results: Array<{ id: string; ok: boolean; status?: string; error?: string; alreadyApplied?: boolean }> = [];

  let cursor: string | undefined = undefined;
  let processed = 0;

  while (processed < maxTotal) {
    const page = await proposalRepo.list({
      orgId: ORG_ID,
      status: status as any,
      limit: Math.min(pageSize, maxTotal - processed),
      cursor,
      boardId,
      itemId,
    });

    if (!page.items.length) break;

    for (const proposal of page.items) {
      const id = proposal.id;
      try {
        if (proposal.status !== "PROPOSED" && proposal.status !== "OVERRIDDEN") {
          results.push({ id, ok: false, error: `Invalid status ${proposal.status}` });
          continue;
        }

        const guard = await applyRepo.tryBegin(ORG_ID, id);
        if (guard === "ALREADY") {
          results.push({ id, ok: true, status: "APPLIED", alreadyApplied: true });
          continue;
        }

        const action: any = (proposal.action as any) ?? null;
        const assigneeRaw = action?.value ? String(action.value) : "";
        let assigneeResolvedValue = assigneeRaw;

        if ((mapping as any).writebackTargets?.assignedAgent?.columnType === "people") {
          assigneeResolvedValue = String(await resolveMondayPersonId(client as any, ORG_ID, assigneeRaw));
        }

        const reason = (proposal.selectedRule as any)?.name ? String((proposal.selectedRule as any).name) : "Approved by manager";
        await applyAssignmentToMonday(client as any, (mapping as any).writebackTargets, {
          boardId: proposal.boardId,
          itemId: proposal.itemId,
          assigneeValue: assigneeResolvedValue,
          reason,
          status: "Assigned",
        });

        await proposalRepo.markApplied(ORG_ID, id);

        await auditRepo.log({
          orgId: ORG_ID,
          actorUserId: ACTOR,
          action: "routing.approve_all.apply",
          entityType: "RoutingProposal",
          entityId: id,
          before: null,
          after: { applied: true },
        });

        results.push({ id, ok: true, status: "APPLIED" });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.message ?? String(e) });
      }
    }

    processed += page.items.length;
    cursor = page.nextCursor ?? undefined;
    if (!cursor) break;
  }

  return res.json({ ok: true, statusFilter: status, processed: results.length, results });
});

    return r;
}
