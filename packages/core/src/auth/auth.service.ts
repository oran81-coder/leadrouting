import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken, verifyToken } from "./jwt.utils";

export interface AuthServiceDeps {
  prisma: any; // PrismaClient
  bcryptRounds: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  orgId: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
  orgId: string;
  role?: string; // admin, manager, agent
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    role: string;
    orgId: string;
  };
}

/**
 * Authentication Service Factory
 */
export function createAuthService(deps: AuthServiceDeps) {
  const { prisma, bcryptRounds } = deps;

  /**
   * Register a new user
   */
  async function register(data: RegisterData): Promise<AuthTokens> {
    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        orgId: data.orgId,
        OR: [
          { email: data.email },
          { username: data.username },
        ],
      },
    });

    if (existing) {
      throw new Error("User with this email or username already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, bcryptRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        orgId: data.orgId,
        role: data.role || "agent", // Default role
        isActive: true,
      },
    });

    // Create session and tokens
    return createSession(user);
  }

  /**
   * Login user with credentials
   */
  async function login(credentials: LoginCredentials): Promise<AuthTokens> {
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        orgId: credentials.orgId,
        email: credentials.email,
      },
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("User account is disabled");
    }

    // Verify password
    const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session and tokens
    return createSession(user);
  }

  /**
   * Refresh access token using refresh token
   */
  async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = verifyToken<{ userId: string; sessionId: string }>(refreshToken);

      // Find session
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
      });

      if (!session || session.refreshToken !== refreshToken) {
        throw new Error("Invalid refresh token");
      }

      if (session.isRevoked) {
        throw new Error("Session has been revoked");
      }

      if (session.refreshExpiresAt && new Date() > session.refreshExpiresAt) {
        throw new Error("Refresh token expired");
      }

      if (!session.user.isActive) {
        throw new Error("User account is disabled");
      }

      // Generate new tokens
      const accessToken = generateAccessToken({
        userId: session.user.id,
        orgId: session.user.orgId,
        email: session.user.email,
        role: session.user.role,
        sessionId: session.id,
      });

      const newRefreshToken = generateRefreshToken({
        userId: session.user.id,
        sessionId: session.id,
      });

      // Update session with new refresh token
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days

      await prisma.session.update({
        where: { id: session.id },
        data: {
          refreshToken: newRefreshToken,
          expiresAt,
          refreshExpiresAt,
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600, // 1 hour in seconds
        user: {
          id: session.user.id,
          email: session.user.email,
          username: session.user.username,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          role: session.user.role,
          orgId: session.user.orgId,
        },
      };
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * Logout user - revoke session
   */
  async function logout(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke all sessions for a user
   */
  async function revokeAllSessions(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  /**
   * Create session and generate tokens
   */
  async function createSession(user: {
    id: string;
    email: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    orgId: string;
  }): Promise<AuthTokens> {
    // Calculate expiration times
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: "", // Will be updated below
        expiresAt,
        refreshExpiresAt,
        isRevoked: false,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      orgId: user.orgId,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      sessionId: session.id,
    });

    // Update session with tokens
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: accessToken,
        refreshToken,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        orgId: user.orgId,
      },
    };
  }

  return {
    register,
    login,
    refreshAccessToken,
    logout,
    revokeAllSessions,
  };
}

