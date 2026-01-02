import { Router } from "express";
import { toManagerProposalDTO } from "../dto/manager.dto";
import { requireEnv, optionalEnv } from "../config/env";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { applyAssignmentToMonday } from "../../../../packages/modules/monday-integration/src/application/monday.writeback";
import { resolveMondayPersonId } from "../../../../packages/modules/monday-integration/src/application/monday.people";
import { getPrisma } from "../../../../packages/core/src/db/prisma";
import { createModuleLogger } from "../infrastructure/logger";

import { PrismaRoutingProposalRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingProposal.repo";
import { PrismaRoutingApplyRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingApply.repo";
import { PrismaFieldMappingConfigRepo } from "../../../../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";
import { PrismaAuditRepo } from "../../../../packages/modules/audit-logging/src/infrastructure/audit.repo";

const logger = createModuleLogger('ManagerRoutes');

/**
 * Helper to get orgId from request (set by orgContext middleware)
 * Falls back to org_1 for backward compatibility
 */
function getOrgId(req: any): string {
  return req.orgId || req.user?.orgId || process.env.DEFAULT_ORG_ID || "org_1";
}

/**
 * Helper to get userId from request (set by auth middleware)
 * Falls back to "manager" for backward compatibility
 */
function getUserId(req: any): string {
  return req.userId || req.user?.userId || "manager";
}

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

  /**
   * GET /manager/proposals
   * List all proposals with optional filters
   */
  r.get("/proposals", async (req, res) => {
    const status = req.query?.status ? String(req.query.status) : undefined;
    const cursor = req.query?.cursor ? String(req.query.cursor) : undefined;
    const limit = req.query?.limit ? Number(req.query.limit) : 25;
    const boardId = req.query?.boardId ? String(req.query.boardId) : undefined;
    const itemId = req.query?.itemId ? String(req.query.itemId) : undefined;

    const orgId = getOrgId(req);
    const result = await proposalRepo.list({
      orgId,
      status: status as any,
      cursor,
      limit,
      boardId,
      itemId,
    });

    // Convert all proposals to DTOs with name resolution
    const items = await Promise.all(
      result.items.map(p => toManagerProposalDTO(p, orgId))
    );

    return res.json({
      ok: true,
      items,
      nextCursor: result.nextCursor,
    });
  });

  /**
   * GET /manager/proposals/:id
   * Get detailed proposal with full explanation
   */
  r.get("/proposals/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const proposal = await proposalRepo.getById(getOrgId(req), id);

      if (!proposal) {
        return res.status(404).json({
          ok: false,
          error: "Proposal not found"
        });
      }

      return res.json({
        ok: true,
        proposal: await toManagerProposalDTO(proposal, getOrgId(req)),
      });
    } catch (error: any) {
      console.error("[manager/proposals/:id] Error:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to fetch proposal",
        message: error.message,
      });
    }
  });


  r.post("/proposals/:id/approve", async (req, res) => {
    const id = String(req.params.id);
    try {
      const proposal = await proposalRepo.getById(getOrgId(req), id);
      if (!proposal) return res.status(404).json({ ok: false, error: "Proposal not found" });
      if (proposal.status !== "PROPOSED") return res.status(400).json({ ok: false, error: "Proposal is not PROPOSED" });

      const mapping = await mappingRepo.getLatest(getOrgId(req));
      if (!mapping) return res.status(400).json({ ok: false, error: "Missing mapping config" });

      const client = await createMondayClientForOrg(getOrgId(req));

      const action = (proposal.action as any);
      if (!action?.value) return res.status(400).json({ ok: false, error: "Proposal has no action/value" });

      let assigneeResolvedValue = String(action.value);
      if ((mapping as any).writebackTargets?.assignedAgent?.columnType === 'people') {
        assigneeResolvedValue = String(await resolveMondayPersonId(client as any, getOrgId(req), assigneeResolvedValue));
      }

      const reason = (proposal.selectedRule as any)?.name ? `${(proposal.selectedRule as any).name}` : "Approved";

      // Check if already applied
      const guard = await applyRepo.tryBegin(getOrgId(req), id);
      if (guard === "ALREADY") {
        return res.json({ ok: true, id, status: "APPLIED", alreadyApplied: true });
      }

      // Apply to Monday.com
      logger.info(`[APPROVE] Applying proposal ${id} to Monday.com...`);
      await applyAssignmentToMonday(client as any, (mapping as any).writebackTargets, {
        boardId: proposal.boardId,
        itemId: proposal.itemId,
        assigneeValue: assigneeResolvedValue,
        reason,
        status: "Assigned",
      });
      logger.info(`[APPROVE] Successfully applied to Monday.com`);

      // Update proposal status
      await proposalRepo.setDecision({ orgId: getOrgId(req), id, status: "APPROVED", decidedBy: getUserId(req), decisionNotes: req.body?.notes ?? null });
      await proposalRepo.markApplied(getOrgId(req), id);

      // Log audit
      await auditRepo.log({
        orgId: getOrgId(req),
        actorUserId: getUserId(req),
        action: "routing.approve_and_apply",
        entityType: "RoutingProposal",
        entityId: id,
        before: null,
        after: { applied: true },
      });

      logger.info(`[APPROVE] Proposal ${id} fully approved and applied`);
      return res.json({ ok: true, id, status: "APPLIED" });
    } catch (error: any) {
      logger.error(`[APPROVE] Failed to approve proposal ${id}:`, { error: error.message, stack: error.stack });

      // IMPORTANT: If we already created RoutingApply record but failed after,
      // we should clean it up so user can retry
      try {
        const prisma = getPrisma();
        await prisma.routingApply.delete({
          where: {
            orgId_proposalId: {
              orgId: getOrgId(req),
              proposalId: id,
            },
          },
        });
        logger.info(`[APPROVE] Cleaned up RoutingApply record for retry`);
      } catch (cleanupError) {
        // Ignore if record doesn't exist
        logger.warn(`[APPROVE] Could not clean up RoutingApply record:`, cleanupError);
      }

      return res.status(500).json({
        ok: false,
        error: `Failed to approve proposal: ${error.message}`
      });
    }
  });

  r.post("/proposals/:id/reject", async (req, res) => {
    const id = String(req.params.id);
    const proposal = await proposalRepo.getById(getOrgId(req), id);
    if (!proposal) return res.status(404).json({ ok: false, error: "Proposal not found" });

    await proposalRepo.setDecision({ orgId: getOrgId(req), id, status: "REJECTED", decidedBy: getUserId(req), decisionNotes: req.body?.notes ?? null });

    await auditRepo.log({
      orgId: getOrgId(req),
      actorUserId: getUserId(req),
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
    try {
      const proposal = await proposalRepo.getById(getOrgId(req), id);
      if (!proposal) return res.status(404).json({ ok: false, error: "Proposal not found" });

      const newValue = req.body?.assigneeValue;
      if (!newValue) return res.status(400).json({ ok: false, error: "Missing body.assigneeValue" });

      const applyNow = req.body?.applyNow === true;

      // Update proposal status to OVERRIDDEN
      const updated = await proposalRepo.setDecision({
        orgId: getOrgId(req),
        id,
        status: "OVERRIDDEN",
        decidedBy: getUserId(req),
        decisionNotes: req.body?.notes ?? null,
        actionOverride: { ...(proposal.action as any), value: String(newValue) },
      });

      await auditRepo.log({
        orgId: getOrgId(req),
        actorUserId: getUserId(req),
        action: "routing.override",
        entityType: "RoutingProposal",
        entityId: id,
        before: null,
        after: { assigneeValue: String(newValue), applyNow },
      });

      // If manager chose not to apply now, just return
      if (!applyNow) {
        logger.info(`[OVERRIDE] Proposal ${id} overridden but not applied to Monday.com`);
        return res.json({ ok: true, id, status: "OVERRIDDEN", applied: false });
      }

      // Apply to Monday.com
      logger.info(`[OVERRIDE] Applying overridden proposal ${id} to Monday.com...`);

      // Check idempotency guard
      const guard = await applyRepo.tryBegin(getOrgId(req), id);
      if (guard === "ALREADY") {
        logger.info(`[OVERRIDE] Proposal ${id} already applied`);
        return res.json({ ok: true, id, status: "APPLIED", alreadyApplied: true });
      }

      const mapping = await mappingRepo.getLatest(getOrgId(req));
      if (!mapping) return res.status(400).json({ ok: false, error: "Missing mapping config" });

      const client = await createMondayClientForOrg(getOrgId(req));

      let overrideResolvedValue = String(newValue);
      if ((mapping as any).writebackTargets?.assignedAgent?.columnType === 'people') {
        overrideResolvedValue = String(await resolveMondayPersonId(client as any, getOrgId(req), overrideResolvedValue));
      }

      const reason = "Overridden by manager";
      await applyAssignmentToMonday(client as any, (mapping as any).writebackTargets, {
        boardId: updated.boardId,
        itemId: updated.itemId,
        assigneeValue: overrideResolvedValue,
        reason,
        status: "Assigned",
      });
      logger.info(`[OVERRIDE] Successfully applied to Monday.com`);

      await proposalRepo.markApplied(getOrgId(req), id);

      await auditRepo.log({
        orgId: getOrgId(req),
        actorUserId: getUserId(req),
        action: "routing.override_and_apply",
        entityType: "RoutingProposal",
        entityId: id,
        before: null,
        after: { applied: true },
      });

      logger.info(`[OVERRIDE] Proposal ${id} fully overridden and applied`);
      return res.json({ ok: true, id, status: "APPLIED" });
    } catch (error: any) {
      logger.error(`[OVERRIDE] Failed to override/apply proposal ${id}:`, { error: error.message, stack: error.stack });

      // Clean up RoutingApply record if it was created
      try {
        const prisma = getPrisma();
        await prisma.routingApply.delete({
          where: {
            orgId_proposalId: {
              orgId: getOrgId(req),
              proposalId: id,
            },
          },
        });
        logger.info(`[OVERRIDE] Cleaned up RoutingApply record for retry`);
      } catch (cleanupError) {
        logger.warn(`[OVERRIDE] Could not clean up RoutingApply record:`, cleanupError);
      }

      return res.status(500).json({
        ok: false,
        error: `Failed to override proposal: ${error.message}`
      });
    }
  });



  /**
   * Bulk approve: approves up to 50 proposal ids.
   * Body: { ids: string[] }
   */
  r.post("/proposals/bulk-approve", async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
    if (!ids.length) return res.status(400).json({ ok: false, error: "Missing body.ids" });
    if (ids.length > 50) return res.status(400).json({ ok: false, error: "Max 50 ids" });

    const mapping = await mappingRepo.getLatest(getOrgId(req));
    if (!mapping) return res.status(400).json({ ok: false, error: "Missing mapping config" });

    const client = await createMondayClientForOrg(getOrgId(req));

    const results: Array<{ id: string; ok: boolean; status?: string; error?: string; alreadyApplied?: boolean }> = [];

    logger.info(`[BULK-APPROVE] Processing ${ids.length} proposals...`);

    for (const id of ids) {
      try {
        const proposal = await proposalRepo.getById(getOrgId(req), id);
        if (!proposal) {
          results.push({ id, ok: false, error: "Proposal not found" });
          continue;
        }
        if (proposal.status !== "PROPOSED" && proposal.status !== "OVERRIDDEN") {
          results.push({ id, ok: false, error: `Invalid status ${proposal.status}` });
          continue;
        }

        const guard = await applyRepo.tryBegin(getOrgId(req), id);
        if (guard === "ALREADY") {
          results.push({ id, ok: true, status: "APPLIED", alreadyApplied: true });
          continue;
        }

        const action: any = (proposal.action as any) ?? null;
        const assigneeRaw = action?.value ? String(action.value) : "";
        let assigneeResolvedValue = assigneeRaw;

        if ((mapping as any).writebackTargets?.assignedAgent?.columnType === "people") {
          assigneeResolvedValue = String(await resolveMondayPersonId(client as any, getOrgId(req), assigneeRaw));
        }

        const reason = (proposal.selectedRule as any)?.name ? String((proposal.selectedRule as any).name) : "Approved by manager";

        await applyAssignmentToMonday(client as any, (mapping as any).writebackTargets, {
          boardId: proposal.boardId,
          itemId: proposal.itemId,
          assigneeValue: assigneeResolvedValue,
          reason,
          status: "Assigned",
        });

        await proposalRepo.setDecision({
          orgId: getOrgId(req),
          id,
          status: "APPROVED",
          decidedBy: getUserId(req),
          decisionNotes: null
        });
        await proposalRepo.markApplied(getOrgId(req), id);

        await auditRepo.log({
          orgId: getOrgId(req),
          actorUserId: getUserId(req),
          action: "routing.bulk_approve.apply",
          entityType: "RoutingProposal",
          entityId: id,
          before: null,
          after: { applied: true },
        });

        results.push({ id, ok: true, status: "APPLIED" });
        logger.info(`[BULK-APPROVE] Successfully approved ${id}`);
      } catch (err: any) {
        logger.error(`[BULK-APPROVE] Failed to approve ${id}:`, { error: err.message });

        // Clean up RoutingApply record if it was created
        try {
          const prisma = getPrisma();
          await prisma.routingApply.delete({
            where: {
              orgId_proposalId: {
                orgId: getOrgId(req),
                proposalId: id,
              },
            },
          });
        } catch (cleanupError) {
          // Ignore cleanup errors
        }

        results.push({ id, ok: false, error: err?.message || String(err) });
      }
    }

    const successCount = results.filter((r) => r.ok).length;
    logger.info(`[BULK-APPROVE] Completed: ${successCount}/${ids.length} succeeded`);

    return res.json({ ok: true, results, total: ids.length, succeeded: successCount });
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

    const mapping = await mappingRepo.getLatest(getOrgId(req));
    if (!mapping) return res.status(400).json({ ok: false, error: "Missing mapping config" });

    const client = await createMondayClientForOrg(getOrgId(req));

    const results: Array<{ id: string; ok: boolean; status?: string; error?: string; alreadyApplied?: boolean }> = [];

    let cursor: string | undefined = undefined;
    let processed = 0;

    while (processed < maxTotal) {
      const page: { items: any[]; nextCursor: string | null } = await proposalRepo.list({
        orgId: getOrgId(req),
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

          const guard = await applyRepo.tryBegin(getOrgId(req), id);
          if (guard === "ALREADY") {
            results.push({ id, ok: true, status: "APPLIED", alreadyApplied: true });
            continue;
          }

          const action: any = (proposal.action as any) ?? null;
          const assigneeRaw = action?.value ? String(action.value) : "";
          let assigneeResolvedValue = assigneeRaw;

          if ((mapping as any).writebackTargets?.assignedAgent?.columnType === "people") {
            assigneeResolvedValue = String(await resolveMondayPersonId(client as any, getOrgId(req), assigneeRaw));
          }

          const reason = (proposal.selectedRule as any)?.name ? String((proposal.selectedRule as any).name) : "Approved by manager";
          await applyAssignmentToMonday(client as any, (mapping as any).writebackTargets, {
            boardId: proposal.boardId,
            itemId: proposal.itemId,
            assigneeValue: assigneeResolvedValue,
            reason,
            status: "Assigned",
          });

          await proposalRepo.markApplied(getOrgId(req), id);

          await auditRepo.log({
            orgId: getOrgId(req),
            actorUserId: getUserId(req),
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
