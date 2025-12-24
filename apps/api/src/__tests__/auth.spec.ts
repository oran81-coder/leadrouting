import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "../../../../packages/modules/auth/src/application/auth.service";
import { UserRepository } from "../../../../packages/modules/auth/src/infrastructure/user.repo";
import { SessionRepository } from "../../../../packages/modules/auth/src/infrastructure/session.repo";

// ============================================================================
// Test Setup
// ============================================================================

const prisma = new PrismaClient();
const userRepo = new UserRepository(prisma);
const sessionRepo = new SessionRepository(prisma);
const authService = new AuthService(userRepo, sessionRepo);

const TEST_ORG_ID = "test-org-auth";
const JWT_SECRET = "test-jwt-secret-min-32-chars-for-security-test";
const JWT_EXPIRATION = "1h";
const JWT_REFRESH_EXPIRATION = "7d";

beforeAll(async () => {
  // Clean up test data
  await prisma.session.deleteMany({ where: { userId: { startsWith: "test-user-" } } });
  await prisma.user.deleteMany({ where: { orgId: TEST_ORG_ID } });
});

afterAll(async () => {
  // Clean up test data
  await prisma.session.deleteMany({ where: { userId: { startsWith: "test-user-" } } });
  await prisma.user.deleteMany({ where: { orgId: TEST_ORG_ID } });
  await prisma.$disconnect();
});

// ============================================================================
// Auth Service Tests
// ============================================================================

describe("AuthService", () => {
  describe("User Registration", () => {
    it("should create a new user with valid data", async () => {
      const userData = {
        orgId: TEST_ORG_ID,
        username: "testuser1",
        email: "testuser1@example.com",
        password: "Password123!",
        role: "agent" as const,
        firstName: "Test",
        lastName: "User",
      };

      const user = await authService.register(userData);

      expect(user).toBeDefined();
      expect(user.username).toBe("testuser1");
      expect(user.email).toBe("testuser1@example.com");
      expect(user.role).toBe("agent");
      expect(user.isActive).toBe(true);
      // Password should not be returned
      expect((user as any).passwordHash).toBeUndefined();
    });

    it("should reject weak passwords", async () => {
      const userData = {
        orgId: TEST_ORG_ID,
        username: "testuser2",
        email: "testuser2@example.com",
        password: "weak", // Too weak
        role: "agent" as const,
      };

      await expect(authService.register(userData)).rejects.toThrow();
    });

    it("should reject duplicate usernames", async () => {
      const userData1 = {
        orgId: TEST_ORG_ID,
        username: "duplicate",
        email: "duplicate1@example.com",
        password: "Password123!",
        role: "agent" as const,
      };

      const userData2 = {
        orgId: TEST_ORG_ID,
        username: "duplicate", // Same username
        email: "duplicate2@example.com",
        password: "Password123!",
        role: "agent" as const,
      };

      await authService.register(userData1);
      await expect(authService.register(userData2)).rejects.toThrow();
    });
  });

  describe("User Login", () => {
    const loginTestUser = {
      orgId: TEST_ORG_ID,
      username: "logintest",
      email: "logintest@example.com",
      password: "LoginPass123!",
      role: "manager" as const,
    };

    beforeAll(async () => {
      await authService.register(loginTestUser);
    });

    it("should login with correct credentials", async () => {
      const result = await authService.login({
        orgId: TEST_ORG_ID,
        email: "logintest@example.com",
        password: "LoginPass123!",
        ipAddress: "127.0.0.1",
        userAgent: "Jest Test",
        jwtSecret: JWT_SECRET,
        jwtExpiration: JWT_EXPIRATION,
        jwtRefreshExpiration: JWT_REFRESH_EXPIRATION,
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("logintest@example.com");
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");
    });

    it("should reject incorrect password", async () => {
      await expect(
        authService.login({
          orgId: TEST_ORG_ID,
          email: "logintest@example.com",
          password: "WrongPassword123!",
          ipAddress: "127.0.0.1",
          userAgent: "Jest Test",
          jwtSecret: JWT_SECRET,
          jwtExpiration: JWT_EXPIRATION,
          jwtRefreshExpiration: JWT_REFRESH_EXPIRATION,
        })
      ).rejects.toThrow();
    });

    it("should reject non-existent user", async () => {
      await expect(
        authService.login({
          orgId: TEST_ORG_ID,
          email: "nonexistent@example.com",
          password: "Password123!",
          ipAddress: "127.0.0.1",
          userAgent: "Jest Test",
          jwtSecret: JWT_SECRET,
          jwtExpiration: JWT_EXPIRATION,
          jwtRefreshExpiration: JWT_REFRESH_EXPIRATION,
        })
      ).rejects.toThrow();
    });

    it("should reject inactive user", async () => {
      // Create an inactive user
      const inactiveUser = await authService.register({
        orgId: TEST_ORG_ID,
        username: "inactive",
        email: "inactive@example.com",
        password: "Password123!",
        role: "agent" as const,
      });

      // Deactivate user manually
      await prisma.user.update({
        where: { id: inactiveUser.id },
        data: { isActive: false },
      });

      await expect(
        authService.login({
          orgId: TEST_ORG_ID,
          email: "inactive@example.com",
          password: "Password123!",
          ipAddress: "127.0.0.1",
          userAgent: "Jest Test",
          jwtSecret: JWT_SECRET,
          jwtExpiration: JWT_EXPIRATION,
          jwtRefreshExpiration: JWT_REFRESH_EXPIRATION,
        })
      ).rejects.toThrow();
    });
  });

  describe("Token Verification", () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      // Create a test user and login
      await authService.register({
        orgId: TEST_ORG_ID,
        username: "tokentest",
        email: "tokentest@example.com",
        password: "TokenTest123!",
        role: "admin" as const,
      });

      const result = await authService.login({
        orgId: TEST_ORG_ID,
        email: "tokentest@example.com",
        password: "TokenTest123!",
        ipAddress: "127.0.0.1",
        userAgent: "Jest Test",
        jwtSecret: JWT_SECRET,
        jwtExpiration: JWT_EXPIRATION,
        jwtRefreshExpiration: JWT_REFRESH_EXPIRATION,
      });

      accessToken = result.accessToken;
      refreshToken = result.refreshToken;
    });

    it("should verify valid access token", async () => {
      const payload = await authService.verifyToken(accessToken, JWT_SECRET);

      expect(payload).toBeDefined();
      expect(payload.userId).toBeDefined();
      expect(payload.email).toBe("tokentest@example.com");
      expect(payload.role).toBe("admin");
    });

    it("should reject invalid token", async () => {
      await expect(
        authService.verifyToken("invalid.token.here", JWT_SECRET)
      ).rejects.toThrow();
    });

    it("should reject token with wrong secret", async () => {
      await expect(
        authService.verifyToken(accessToken, "wrong-secret")
      ).rejects.toThrow();
    });
  });

  describe("Token Refresh", () => {
    let userId: string;
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      // Create a test user and login
      const user = await authService.register({
        orgId: TEST_ORG_ID,
        username: "refreshtest",
        email: "refreshtest@example.com",
        password: "RefreshTest123!",
        role: "manager" as const,
      });

      userId = user.id;

      const result = await authService.login({
        orgId: TEST_ORG_ID,
        email: "refreshtest@example.com",
        password: "RefreshTest123!",
        ipAddress: "127.0.0.1",
        userAgent: "Jest Test",
        jwtSecret: JWT_SECRET,
        jwtExpiration: JWT_EXPIRATION,
        jwtRefreshExpiration: JWT_REFRESH_EXPIRATION,
      });

      accessToken = result.accessToken;
      refreshToken = result.refreshToken;
    });

    it("should refresh tokens with valid refresh token", async () => {
      const result = await authService.refreshTokens({
        refreshToken,
        jwtSecret: JWT_SECRET,
        jwtExpiration: JWT_EXPIRATION,
        jwtRefreshExpiration: JWT_REFRESH_EXPIRATION,
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("refreshtest@example.com");
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // New tokens should be different
      expect(result.accessToken).not.toBe(accessToken);
      expect(result.refreshToken).not.toBe(refreshToken);
    });

    it("should reject invalid refresh token", async () => {
      await expect(
        authService.refreshTokens({
          refreshToken: "invalid.refresh.token",
          jwtSecret: JWT_SECRET,
          jwtExpiration: JWT_EXPIRATION,
          jwtRefreshExpiration: JWT_REFRESH_EXPIRATION,
        })
      ).rejects.toThrow();
    });
  });

  describe("Logout", () => {
    let accessToken: string;

    beforeAll(async () => {
      // Create a test user and login
      await authService.register({
        orgId: TEST_ORG_ID,
        username: "logouttest",
        email: "logouttest@example.com",
        password: "LogoutTest123!",
        role: "agent" as const,
      });

      const result = await authService.login({
        orgId: TEST_ORG_ID,
        email: "logouttest@example.com",
        password: "LogoutTest123!",
        ipAddress: "127.0.0.1",
        userAgent: "Jest Test",
        jwtSecret: JWT_SECRET,
        jwtExpiration: JWT_EXPIRATION,
        jwtRefreshExpiration: JWT_REFRESH_EXPIRATION,
      });

      accessToken = result.accessToken;
    });

    it("should revoke session on logout", async () => {
      await authService.logout(accessToken, JWT_SECRET);

      // Verify session is revoked
      const payload = await authService.verifyToken(accessToken, JWT_SECRET);
      const session = await sessionRepo.findByToken(payload.sessionId);

      expect(session).toBeDefined();
      expect(session!.isRevoked).toBe(true);
    });
  });
});

