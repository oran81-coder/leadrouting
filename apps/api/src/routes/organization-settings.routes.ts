/**
 * Organization Settings Routes
 * 
 * Allows organization admins to manage their organization settings,
 * including contact info, integrations, and account status.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { getPrisma } from "../../../../packages/core/src/db/prisma";
import { PrismaOrganizationRepo } from "../../../../packages/modules/organization/src/infrastructure/organization.repo";
import { PrismaMondayCredentialRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayCredential.repo";
import { requireAuth } from "../middleware/auth.middleware";
import { NotFoundError, ValidationError, UnauthorizedError } from "../../../../packages/core/src/shared/errors";
import { log } from "../../../../packages/core/src/shared/logger";

const router = Router();
const prisma = getPrisma();
const orgRepo = new PrismaOrganizationRepo(prisma);
const mondayCredRepo = new PrismaMondayCredentialRepo();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * Validation schemas
 */
const updateSettingsSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
});

/**
 * Middleware to ensure user is admin of their organization
 */
async function requireOrgAdmin(req: any, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (user.role !== "admin") {
      throw new UnauthorizedError("Only organization admins can access these settings");
    }

    next();
  } catch (error) {
    next(error);
  }
}

router.use(requireOrgAdmin);

/**
 * GET /api/org-settings
 * Get current organization settings
 */
router.get("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user.orgId;

    const organization = await orgRepo.get(orgId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    // Check if Monday is connected
    const mondayCredential = await mondayCredRepo.get(orgId);
    const mondayConnected = !!mondayCredential?.token;

    // Parse settings JSON
    let parsedSettings = {};
    try {
      parsedSettings = typeof organization.settings === "string" 
        ? JSON.parse(organization.settings) 
        : organization.settings;
    } catch (e) {
      log.warn("Failed to parse organization settings", { orgId });
    }

    // Get user count
    const userCount = await prisma.user.count({
      where: { orgId, isActive: true },
    });

    log.info("Retrieved organization settings", { orgId });

    res.json({
      ok: true,
      data: {
        id: organization.id,
        name: organization.name,
        displayName: organization.displayName,
        email: organization.email,
        phone: organization.phone,
        tier: organization.tier,
        isActive: organization.isActive,
        mondayConnected,
        mondayWorkspaceId: organization.mondayWorkspaceId,
        subscriptionStatus: organization.subscriptionStatus,
        trialEndsAt: organization.trialEndsAt,
        createdAt: organization.createdAt,
        settings: parsedSettings,
        stats: {
          userCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/org-settings
 * Update organization settings
 */
router.put("/", async (req: any, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user.orgId;
    const userId = req.user.userId;

    const validated = updateSettingsSchema.parse(req.body);

    // Check if organization exists
    const existing = await orgRepo.get(orgId);
    if (!existing) {
      throw new NotFoundError("Organization not found");
    }

    // Update organization
    const organization = await orgRepo.update(orgId, {
      displayName: validated.displayName,
      email: validated.email,
      phone: validated.phone,
    });

    log.info("Updated organization settings", { 
      orgId, 
      updatedBy: userId,
      changes: validated,
    });

    res.json({
      ok: true,
      data: {
        id: organization.id,
        displayName: organization.displayName,
        email: organization.email,
        phone: organization.phone,
      },
      message: "Settings updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError("Invalid input", error.errors));
    }
    next(error);
  }
});

/**
 * POST /api/org-settings/disconnect-monday
 * Disconnect Monday.com integration
 */
router.post("/disconnect-monday", async (req: any, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user.orgId;
    const userId = req.user.userId;

    // Check if Monday is connected
    const credential = await mondayCredRepo.get(orgId);
    if (!credential) {
      res.json({
        ok: true,
        message: "Monday.com is not connected",
      });
      return;
    }

    // Delete Monday credential
    await mondayCredRepo.delete(orgId);

    // Optionally: Delete Monday webhooks
    await prisma.mondayWebhook.deleteMany({
      where: { orgId },
    });

    log.info("Disconnected Monday.com integration", { 
      orgId, 
      disconnectedBy: userId,
    });

    res.json({
      ok: true,
      message: "Monday.com disconnected successfully. You can reconnect anytime from Admin settings.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/org-settings/suspend
 * Suspend organization (temporarily disable access)
 */
router.post("/suspend", async (req: any, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user.orgId;
    const userId = req.user.userId;

    const organization = await orgRepo.update(orgId, {
      isActive: false,
    });

    log.warn("Organization suspended", { 
      orgId, 
      suspendedBy: userId,
    });

    res.json({
      ok: true,
      data: organization,
      message: "Organization suspended. Contact support to reactivate.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/org-settings/close
 * Close organization account (soft delete)
 */
router.post("/close", async (req: any, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user.orgId;
    const userId = req.user.userId;

    // Soft delete organization
    const organization = await orgRepo.softDelete(orgId);

    log.warn("Organization closed", { 
      orgId, 
      closedBy: userId,
    });

    res.json({
      ok: true,
      data: organization,
      message: "Organization account closed. Contact support within 30 days to restore your data.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/org-settings/reactivate
 * Reactivate a suspended organization
 */
router.post("/reactivate", async (req: any, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user.orgId;
    const userId = req.user.userId;

    const organization = await orgRepo.update(orgId, {
      isActive: true,
    });

    log.info("Organization reactivated", { 
      orgId, 
      reactivatedBy: userId,
    });

    res.json({
      ok: true,
      data: organization,
      message: "Organization reactivated successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;

