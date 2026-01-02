/**
 * Monday OAuth Login Routes
 * Handles user login via Monday.com OAuth (for existing organizations)
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { getPrisma } from "../../../../packages/core/src/db/prisma";
import { createMondayOAuthService } from "../../../../packages/modules/auth/src/application/mondayOAuth.service";
import { env } from "../config/env";
import { log } from "../../../../packages/core/src/shared/logger";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = Router();
const prisma = getPrisma();

/**
 * Validation schemas
 */
const mondayCallbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().optional(),
});

/**
 * GET /auth/monday/oauth/url
 * Get Monday.com OAuth URL for user login
 */
router.get("/oauth/url", async (_req: Request, res: Response): Promise<void> => {
  try {
    log.info("Generating Monday OAuth URL for login");

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

    // Generate state for CSRF protection with "login_" prefix
    const state = "login_" + Math.random().toString(36).substring(2, 15);
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
 * POST /auth/monday/oauth/callback
 * Handle Monday.com OAuth callback for login
 */
router.post("/oauth/callback", async (req: Request, res: Response): Promise<void> => {
  try {
    log.info("Processing Monday OAuth callback for login");

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

    // Step 2: Fetch user info from Monday
    const mondayUser = await mondayOAuth.getMondayUserInfo(accessToken);

    if (!mondayUser.email) {
      log.error("No email in Monday user info", { mondayUser });
      res.status(400).json({
        success: false,
        error: "Could not retrieve email from Monday.com account",
      });
      return;
    }

    // Step 3: Find or create organization based on Monday workspace
    const mondayWorkspaceId = mondayUser.account?.id;
    
    if (!mondayWorkspaceId) {
      log.error("No workspace ID in Monday user info", { mondayUser });
      res.status(400).json({
        success: false,
        error: "Could not retrieve workspace information from Monday.com",
      });
      return;
    }

    // Find organization by Monday workspace ID
    let organization = await prisma.organization.findFirst({
      where: { mondayWorkspaceId },
    });

    // If organization doesn't exist, create it
    if (!organization) {
      log.info("Organization not found for workspace, creating new organization", { 
        mondayWorkspaceId,
        workspaceName: mondayUser.account?.name 
      });

      const orgName = mondayUser.account?.slug || `org_${Date.now()}`;
      const displayName = mondayUser.account?.name || "New Organization";

      organization = await prisma.organization.create({
        data: {
          name: orgName,
          displayName,
          email: mondayUser.email,
          mondayWorkspaceId,
          tier: "standard",
          isActive: true,
          subscriptionStatus: "trial",
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        },
      });

      // Store Monday credentials for this new organization
      const { PrismaMondayCredentialRepo } = require("../../../../packages/modules/monday-integration/src/infrastructure/mondayCredential.repo");
      const mondayCredRepo = new PrismaMondayCredentialRepo();
      await mondayCredRepo.upsert(organization.id, {
        token: accessToken,
        endpoint: "https://api.monday.com/v2",
      });

      log.info("Created new organization with Monday credentials", {
        orgId: organization.id,
        mondayWorkspaceId,
      });
    }

    // Step 4: Find or create user
    let user = await prisma.user.findUnique({
      where: { email: mondayUser.email },
      include: { organization: true },
    });

    if (!user) {
      log.info("User not found, creating new user", { 
        email: mondayUser.email,
        orgId: organization.id 
      });
      
      // Create the user with a random password (they'll use Monday OAuth anyway)
      const username = mondayUser.email.split("@")[0];
      const randomPassword = Math.random().toString(36).substring(2, 15);
      const bcrypt = require("bcryptjs");
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      // First user in organization becomes admin, others become managers
      const existingUsers = await prisma.user.count({
        where: { orgId: organization.id },
      });
      const role = existingUsers === 0 ? "admin" : "manager";

      user = await prisma.user.create({
        data: {
          email: mondayUser.email,
          username,
          passwordHash,
          role,
          orgId: organization.id,
          firstName: mondayUser.name || username,
          isActive: true,
        },
        include: { organization: true },
      });

      log.info("Created new user via Monday OAuth", {
        userId: user.id,
        email: user.email,
        role,
        orgId: user.orgId,
      });
    } else if (user.orgId !== organization.id) {
      // User exists but belongs to different organization
      log.warn("User exists but belongs to different organization", {
        email: user.email,
        userOrgId: user.orgId,
        workspaceOrgId: organization.id,
      });
      res.status(400).json({
        success: false,
        error: "This email is already associated with a different organization",
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      log.warn("Login failed: user is inactive", { email: mondayUser.email, userId: user.id });
      res.status(401).json({
        success: false,
        error: "Account is disabled. Please contact your administrator.",
      });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: "", // Will be filled after JWT creation
        refreshToken: "", // Will be filled after JWT creation
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    // Generate JWT tokens with sessionId
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      username: user.username,
      sessionId: session.id, // Add sessionId to payload
    };

    const jwtAccessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN || "1h",
      issuer: "lead-routing-api",
      audience: "lead-routing-app",
    });

    const refreshToken = jwt.sign(
      { userId: user.id, sessionId: session.id, type: "refresh" }, // Add sessionId to refresh token
      env.JWT_SECRET,
      { 
        expiresIn: "7d",
        issuer: "lead-routing-api",
        audience: "lead-routing-app",
      }
    );

    // Update session with actual tokens
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: jwtAccessToken,
        refreshToken: refreshToken,
      },
    });

    log.info("User logged in via Monday OAuth", {
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
    });

    // Return tokens and user info
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          orgId: user.orgId,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
        },
        tokens: {
          accessToken: jwtAccessToken,
          refreshToken,
        },
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

    log.error("Error in Monday OAuth login callback", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to login with Monday.com",
    });
  }
});

export default router;

