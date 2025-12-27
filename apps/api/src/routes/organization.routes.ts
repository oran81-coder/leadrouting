/**
 * Organization Management Routes
 * Phase 7.3: Multi-Tenant Support
 * 
 * Admin-only endpoints for managing organizations
 */

import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaOrganizationRepo } from "../../../packages/modules/organization/src";
import { requireOrgContext } from "../middleware/orgContext";
import { ValidationError, NotFoundError } from "../../../packages/core/src/shared/errors";
import { log } from "../../../packages/core/src/shared/logger";

const router = Router();
const prisma = new PrismaClient();
const orgRepo = new PrismaOrganizationRepo(prisma);

/**
 * GET /organizations
 * List all organizations (Super Admin only)
 */
router.get(
  "/",
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

      log.info("Listed organizations", { count: organizations.length, total });

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
 * GET /organizations/:id
 * Get organization by ID
 */
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const organization = await orgRepo.get(id);
      if (!organization) {
        throw new NotFoundError("Organization not found");
      }

      log.info("Retrieved organization", { orgId: id });

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
 * GET /organizations/:id/stats
 * Get organization with statistics
 */
router.get(
  "/:id/stats",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await orgRepo.getWithStats(id);
      if (!result) {
        throw new NotFoundError("Organization not found");
      }

      log.info("Retrieved organization with stats", { orgId: id });

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
 * POST /organizations
 * Create new organization (Super Admin only)
 */
router.post(
  "/",
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
        createdBy: req.userId, // from JWT
        settings,
      });

      log.info("Created organization", { 
        orgId: organization.id, 
        name: organization.name,
        createdBy: req.userId 
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
 * PUT /organizations/:id
 * Update organization
 */
router.put(
  "/:id",
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

      log.info("Updated organization", { 
        orgId: id, 
        updatedBy: req.userId 
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
 * DELETE /organizations/:id
 * Soft delete organization (set isActive = false)
 */
router.delete(
  "/:id",
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
        log.warn("Hard deleting organization - ALL DATA WILL BE LOST", { 
          orgId: id, 
          deletedBy: req.userId 
        });
        
        await orgRepo.hardDelete(id);
        
        res.json({
          ok: true,
          message: "Organization permanently deleted",
        });
      } else {
        // Soft delete
        const organization = await orgRepo.softDelete(id);
        
        log.info("Soft deleted organization", { 
          orgId: id, 
          deletedBy: req.userId 
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
 * POST /organizations/:id/activate
 * Reactivate a deactivated organization
 */
router.post(
  "/:id/activate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const organization = await orgRepo.update(id, { isActive: true });

      log.info("Activated organization", { 
        orgId: id, 
        activatedBy: req.userId 
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

export default router;

