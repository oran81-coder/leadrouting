/**
 * Organization Registration Routes (Public)
 * Handles new organization signup via Monday.com OAuth
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { getPrisma } from "../../../../packages/core/src/db/prisma";
import { createAuthService } from "../../../../packages/core/src/auth/auth.service";
import { createMondayOAuthService } from "../../../../packages/modules/auth/src/application/mondayOAuth.service";
import { PrismaMondayCredentialRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayCredential.repo";
import { PrismaOrganizationRepo } from "../../../../packages/modules/organization/src/infrastructure/organization.repo";
import { env } from "../config/env";
import { log } from "../../../../packages/core/src/shared/logger";

const router = Router();
const prisma = getPrisma();
const authService = createAuthService({ prisma, bcryptRounds: env.BCRYPT_ROUNDS });
const orgRepo = new PrismaOrganizationRepo();
const mondayCredRepo = new PrismaMondayCredentialRepo();

/**
 * Validation schemas
 */
const mondayCallbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().optional(),
});

/**
 * GET /auth/register-org/monday
 * Get Monday.com OAuth URL for organization registration
 */
router.get("/monday", async (_req: Request, res: Response): Promise<void> => {
  try {
    log.info("Generating Monday OAuth URL for organization registration");

    if (!env.MONDAY_OAUTH_CLIENT_ID || !env.MONDAY_OAUTH_CLIENT_SECRET || !env.MONDAY_OAUTH_REDIRECT_URI) {
      res.status(500).json({
        success: false,
        error: "Monday OAuth is not configured. Please set MONDAY_OAUTH_* environment variables.",
      });
      return;
    }

    const mondayOAuth = createMondayOAuthService({
      clientId: env.MONDAY_OAUTH_CLIENT_ID,
      clientSecret: env.MONDAY_OAUTH_CLIENT_SECRET,
      redirectUri: env.MONDAY_OAUTH_REDIRECT_URI,
    });

    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    const authUrl = mondayOAuth.getMondayAuthUrl(state);

    res.json({
      success: true,
      data: {
        authUrl,
        state,
      },
    });
  } catch (error) {
    log.error("Error generating Monday OAuth URL", { error });
    res.status(500).json({
      success: false,
      error: "Failed to generate OAuth URL",
    });
  }
});

/**
 * POST /auth/register-org/monday/callback
 * Handle Monday.com OAuth callback and create organization
 */
router.post("/monday/callback", async (req: Request, res: Response): Promise<void> => {
  try {
    log.info("Processing Monday OAuth callback for organization registration");

    const { code, state } = mondayCallbackSchema.parse(req.body);

    if (!env.MONDAY_OAUTH_CLIENT_ID || !env.MONDAY_OAUTH_CLIENT_SECRET || !env.MONDAY_OAUTH_REDIRECT_URI) {
      res.status(500).json({
        success: false,
        error: "Monday OAuth is not configured",
      });
      return;
    }

    const mondayOAuth = createMondayOAuthService({
      clientId: env.MONDAY_OAUTH_CLIENT_ID,
      clientSecret: env.MONDAY_OAUTH_CLIENT_SECRET,
      redirectUri: env.MONDAY_OAUTH_REDIRECT_URI,
    });

    // Step 1: Exchange code for access token
    const accessToken = await mondayOAuth.handleMondayCallback(code);

    // Step 2: Fetch user and workspace info from Monday
    const mondayUser = await mondayOAuth.getMondayUserInfo(accessToken);

    if (!mondayUser.email) {
      log.error("No email in Monday user info", { mondayUser });
      res.status(400).json({
        success: false,
        error: "Could not retrieve email from Monday.com account",
      });
      return;
    }

    // Step 3: Check if organization with this Monday workspace already exists
    const accountId = mondayUser.account?.id;
    if (accountId) {
      const existingOrg = await prisma.organization.findFirst({
        where: { mondayWorkspaceId: accountId },
      });

      if (existingOrg) {
        log.warn("Organization with this Monday workspace already exists", {
          orgId: existingOrg.id,
          mondayWorkspaceId: accountId,
        });
        res.status(400).json({
          success: false,
          error: "An organization with this Monday.com workspace already exists",
        });
        return;
      }
    }

    // Step 4: Create organization
    const orgName = mondayUser.account?.slug || `org_${Date.now()}`;
    const displayName = mondayUser.account?.name || mondayUser.name || "New Organization";

    const organization = await orgRepo.create({
      name: orgName,
      displayName,
      email: mondayUser.email,
      mondayWorkspaceId: accountId,
      tier: "standard",
      isActive: true,
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
    });

    log.info("Created new organization", {
      orgId: organization.id,
      name: orgName,
      mondayWorkspaceId: accountId,
    });

    // Step 5: Store Monday credentials for this organization
    await mondayCredRepo.upsert(organization.id, {
      token: accessToken,
      endpoint: "https://api.monday.com/v2",
    });

    log.info("Stored Monday credentials for organization", { orgId: organization.id });

    // Step 6: Create first user as organization admin
    const username = mondayUser.email.split("@")[0]; // Extract username from email
    const temporaryPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const tokens = await authService.register({
      email: mondayUser.email,
      username,
      password: temporaryPassword,
      firstName: mondayUser.name,
      orgId: organization.id,
      role: "admin", // First user is always admin
    });

    log.info("Created organization admin user", {
      orgId: organization.id,
      userId: tokens.user.id,
      email: mondayUser.email,
    });

    // Return tokens and organization info
    res.status(201).json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          displayName: organization.displayName,
          email: organization.email,
        },
        user: tokens.user,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
        message: "Organization created successfully! You are now logged in as admin.",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    log.error("Error in Monday OAuth callback", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create organization",
    });
  }
});

/**
 * GET /auth/register-org/status
 * Check if Monday OAuth is configured
 */
router.get("/status", async (_req: Request, res: Response): Promise<void> => {
  const isConfigured = !!(
    env.MONDAY_OAUTH_CLIENT_ID &&
    env.MONDAY_OAUTH_CLIENT_SECRET &&
    env.MONDAY_OAUTH_REDIRECT_URI
  );

  res.json({
    success: true,
    data: {
      mondayOAuthConfigured: isConfigured,
      redirectUri: isConfigured ? env.MONDAY_OAUTH_REDIRECT_URI : null,
    },
  });
});

export default router;

