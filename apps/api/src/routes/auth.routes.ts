import { Router, Request, Response } from "express";
import { createAuthService } from "../../../../packages/core/src/auth/auth.service";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.middleware";
import { getPrisma } from "../../../../packages/core/src/db/prisma";
import { env } from "../config/env";
import { z } from "zod";

const router = Router();

// Create auth service instance
const authService = createAuthService({
  prisma: getPrisma(),
  bcryptRounds: env.BCRYPT_ROUNDS,
});

/**
 * Validation schemas
 */
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  orgId: z.string().min(1, "Organization ID is required"),
  role: z.enum(["admin", "manager", "agent"]).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * POST /auth/register
 * Register a new user
 */
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);
    const tokens = await authService.register(data);
    
    res.status(201).json({
      success: true,
      data: tokens,
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

    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to register user",
    });
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const credentials = loginSchema.parse(req.body);
    const tokens = await authService.login(credentials);
    
    res.json({
      success: true,
      data: tokens,
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

    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refreshAccessToken(refreshToken);
    
    res.json({
      success: true,
      data: tokens,
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

    res.status(401).json({
      success: false,
      error: "Invalid or expired refresh token",
    });
  }
});

/**
 * POST /auth/logout
 * Logout current session
 */
router.post("/logout", authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.sessionId) {
      res.status(401).json({
        success: false,
        error: "No active session",
      });
      return;
    }

    await authService.logout(req.user.sessionId);
    
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Logout failed",
    });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user info
 */
router.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
      return;
    }

    // Fetch full user data from database
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        orgId: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          orgId: user.orgId,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt?.toISOString(),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get user info",
    });
  }
});

/**
 * POST /auth/revoke-all
 * Revoke all sessions for current user (useful for security)
 */
router.post("/revoke-all", authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
      return;
    }

    await authService.revokeAllSessions(req.user.userId);
    
    res.json({
      success: true,
      message: "All sessions revoked successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to revoke sessions",
    });
  }
});

export default router;
