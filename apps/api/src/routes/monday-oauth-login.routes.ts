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

    // Step 3: Find user by email
    const user = await prisma.user.findUnique({
      where: { email: mondayUser.email },
      include: { organization: true },
    });

    if (!user) {
      log.warn("User not found for Monday login", { email: mondayUser.email });
      res.status(404).json({
        success: false,
        error: "No account found with this email. Please register your organization first.",
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

    // Generate JWT tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      username: user.username,
    };

    const jwtAccessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN || "1h",
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: "refresh" },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

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

