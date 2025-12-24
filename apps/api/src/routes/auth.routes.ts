/**
 * Authentication Routes
 * 
 * Phase 5.1: Login, logout, registration, token refresh, and user info endpoints
 */

import { Router, type Request, type Response } from "express";
import { AuthService } from "../../../../packages/modules/auth/src/application/auth.service";
import { rateLimiters } from "../middleware/rateLimit";
import { authenticateJWT, requireAdmin } from "../middleware/auth";
import { UnauthorizedError } from "../../../../packages/core/src/shared/errors";
import { z } from "zod";
import { validate } from "../middleware/validate";

const authService = new AuthService();

// DTO Schemas
const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const RegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "manager", "agent"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export function authRoutes() {
  const router = Router();

  /**
   * POST /auth/login
   * 
   * Login with email and password
   * Returns user info and JWT tokens
   */
  router.post(
    "/login",
    rateLimiters.sensitive, // Strict rate limit for login attempts
    validate(LoginSchema),
    async (req: Request, res: Response, next) => {
      try {
        const { email, password } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.headers["user-agent"];

        const result = await authService.login(
          { email, password },
          ipAddress,
          userAgent
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /auth/register
   * 
   * Register new user (admin only)
   * Creates new user account
   */
  router.post(
    "/register",
    authenticateJWT,
    requireAdmin, // Only admins can create users
    validate(RegisterSchema),
    async (req: Request, res: Response, next) => {
      try {
        const { username, email, password, role, firstName, lastName } = req.body;

        const user = await authService.register({
          orgId: "org_1", // Phase 1: single org
          username,
          email,
          password,
          role,
          firstName,
          lastName,
        });

        res.status(201).json({
          success: true,
          data: user,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /auth/logout
   * 
   * Logout current user
   * Revokes the access token
   */
  router.post("/logout", authenticateJWT, async (req: Request, res: Response, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedError("No token provided");
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix
      await authService.logout(token);

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /auth/refresh
   * 
   * Refresh access token using refresh token
   * Returns new access and refresh tokens
   */
  router.post(
    "/refresh",
    rateLimiters.standard,
    validate(RefreshTokenSchema),
    async (req: Request, res: Response, next) => {
      try {
        const { refreshToken } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.headers["user-agent"];

        const tokens = await authService.refreshToken(
          { refreshToken },
          ipAddress,
          userAgent
        );

        res.json({
          success: true,
          data: tokens,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /auth/me
   * 
   * Get current user info
   * Returns authenticated user details
   */
  router.get("/me", authenticateJWT, async (req: Request, res: Response, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Not authenticated");
      }

      res.json({
        success: true,
        data: req.user,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /auth/status
   * 
   * Check authentication status (no auth required)
   * Returns whether auth is enabled and if user is logged in
   */
  router.get("/status", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    let isAuthenticated = false;
    let user = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        user = await authService.getUserFromToken(token);
        isAuthenticated = true;
      } catch (error) {
        // Token invalid, isAuthenticated remains false
      }
    }

    res.json({
      success: true,
      data: {
        authEnabled: process.env.AUTH_ENABLED === "true",
        isAuthenticated,
        user: isAuthenticated ? user : null,
      },
    });
  });

  return router;
}

