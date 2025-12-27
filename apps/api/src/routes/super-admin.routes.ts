/**
 * Super Admin Routes
 * System-wide management (only accessible to super_admin users)
 */

import { Router, Request, Response, NextFunction } from "express";
import { getPrisma } from "../../../../packages/core/src/db/prisma";
import { PrismaOrganizationRepo } from "../../../../packages/modules/organization/src/infrastructure/organization.repo";
import { authenticateJWT, requireSuperAdmin } from "../middleware/auth";
import { ValidationError, NotFoundError } from "../../../../packages/core/src/shared/errors";
import { log } from "../../../../packages/core/src/shared/logger";

const router = Router();
const prisma = getPrisma();
const orgRepo = new PrismaOrganizationRepo(prisma);

// All routes require super_admin role
router.use(authenticateJWT);
router.use(requireSuperAdmin);

/**
 * GET /super-admin/organizations
 * List all organizations
 */
router.get(
  "/organizations",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { isActive, tier, limit, offset } = req.query;

      const filters = {
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
        tier: tier as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const organizations = await orgRepo.list(filters);
      const total = await orgRepo.count({
        isActive: filters.isActive,
        tier: filters.tier,
      });

      log.info("Super admin listed organizations", { count: organizations.length, total });

      res.json({
        ok: true,
        data: organizations,
        pagination: {
          total,
          limit: filters.limit || 100,
          offset: filters.offset || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /super-admin/organizations/:id
 * Get organization by ID
 */
router.get(
  "/organizations/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const organization = await orgRepo.get(id);
      if (!organization) {
        throw new NotFoundError("Organization not found");
      }

      log.info("Super admin retrieved organization", { orgId: id });

      res.json({
        ok: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /super-admin/organizations/:id/stats
 * Get organization with statistics
 */
router.get(
  "/organizations/:id/stats",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await orgRepo.getWithStats(id);
      if (!result) {
        throw new NotFoundError("Organization not found");
      }

      log.info("Super admin retrieved organization with stats", { orgId: id });

      res.json({
        ok: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /super-admin/organizations
 * Create new organization
 */
router.post(
  "/organizations",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, displayName, email, phone, tier, mondayWorkspaceId, settings } = req.body;

      // Validate required fields
      if (!name) {
        throw new ValidationError("Organization name is required");
      }

      // Check if name already exists
      const nameExists = await orgRepo.nameExists(name);
      if (nameExists) {
        throw new ValidationError("Organization with this name already exists");
      }

      // Create organization
      const organization = await orgRepo.create({
        name,
        displayName,
        email,
        phone,
        tier,
        mondayWorkspaceId,
        createdBy: req.user?.id,
        settings,
      });

      log.info("Super admin created organization", {
        orgId: organization.id,
        name: organization.name,
        createdBy: req.user?.id,
      });

      res.status(201).json({
        ok: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /super-admin/organizations/:id
 * Update organization
 */
router.put(
  "/organizations/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { displayName, email, phone, isActive, tier, mondayWorkspaceId, settings } = req.body;

      // Check if organization exists
      const existing = await orgRepo.get(id);
      if (!existing) {
        throw new NotFoundError("Organization not found");
      }

      // Update organization
      const organization = await orgRepo.update(id, {
        displayName,
        email,
        phone,
        isActive,
        tier,
        mondayWorkspaceId,
        settings,
      });

      log.info("Super admin updated organization", {
        orgId: id,
        updatedBy: req.user?.id,
      });

      res.json({
        ok: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /super-admin/organizations/:id
 * Soft delete organization (set isActive = false)
 */
router.delete(
  "/organizations/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { hard } = req.query;

      // Check if organization exists
      const existing = await orgRepo.get(id);
      if (!existing) {
        throw new NotFoundError("Organization not found");
      }

      if (hard === "true") {
        // Hard delete (DANGEROUS - deletes all tenant data!)
        log.warn("Super admin hard deleting organization - ALL DATA WILL BE LOST", {
          orgId: id,
          deletedBy: req.user?.id,
        });

        await orgRepo.hardDelete(id);

        res.json({
          ok: true,
          message: "Organization permanently deleted",
        });
      } else {
        // Soft delete
        const organization = await orgRepo.softDelete(id);

        log.info("Super admin soft deleted organization", {
          orgId: id,
          deletedBy: req.user?.id,
        });

        res.json({
          ok: true,
          data: organization,
          message: "Organization deactivated",
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /super-admin/organizations/:id/activate
 * Reactivate a deactivated organization
 */
router.post(
  "/organizations/:id/activate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const organization = await orgRepo.activate(id);

      log.info("Super admin activated organization", {
        orgId: id,
        activatedBy: req.user?.id,
      });

      res.json({
        ok: true,
        data: organization,
        message: "Organization activated",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /super-admin/users
 * List all users across all organizations
 */
router.get(
  "/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId, role, isActive, limit, offset } = req.query;

      const where: any = {};
      
      if (orgId) where.orgId = orgId;
      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive === "true";

      const users = await prisma.user.findMany({
        where,
        take: limit ? parseInt(limit as string) : 100,
        skip: offset ? parseInt(offset as string) : 0,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          orgId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      });

      const total = await prisma.user.count({ where });

      log.info("Super admin listed users", { count: users.length, total });

      res.json({
        ok: true,
        data: users,
        pagination: {
          total,
          limit: limit ? parseInt(limit as string) : 100,
          offset: offset ? parseInt(offset as string) : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /super-admin/stats
 * Get system-wide statistics
 */
router.get(
  "/stats",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [
        totalOrgs,
        activeOrgs,
        totalUsers,
        activeUsers,
        totalProposals,
        totalLeads,
        totalAgents,
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.organization.count({ where: { isActive: true } }),
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.routingProposal.count(),
        prisma.leadFact.count(),
        prisma.agentProfile.count(),
      ]);

      const stats = {
        organizations: {
          total: totalOrgs,
          active: activeOrgs,
          inactive: totalOrgs - activeOrgs,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        proposals: totalProposals,
        leads: totalLeads,
        agents: totalAgents,
      };

      log.info("Super admin retrieved system stats");

      res.json({
        ok: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

