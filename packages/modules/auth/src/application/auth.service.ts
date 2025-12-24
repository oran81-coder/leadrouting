/**
 * Authentication Service
 * 
 * Handles login, registration, JWT generation, and token verification
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../../../../apps/api/src/config/env";
import { UserRepository } from "../infrastructure/user.repo";
import { SessionRepository } from "../infrastructure/session.repo";
import { UnauthorizedError, ValidationError } from "../../../../core/src/shared/errors";
import { log } from "../../../../core/src/shared/logger";
import type {
  User,
  AuthTokens,
  JWTPayload,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshTokenRequest,
} from "../contracts/auth.types";

export class AuthService {
  private userRepo: UserRepository;
  private sessionRepo: SessionRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.sessionRepo = new SessionRepository();
  }

  /**
   * Login user with email and password
   */
  async login(request: LoginRequest, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const { email, password } = request;

    // Find user by email
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      log.warn("Login failed: user not found", { email });
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check if user is active
    if (!user.isActive) {
      log.warn("Login failed: user is inactive", { email, userId: user.id });
      throw new UnauthorizedError("Account is disabled");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      log.warn("Login failed: invalid password", { email, userId: user.id });
      throw new UnauthorizedError("Invalid email or password");
    }

    // Generate tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    // Update last login timestamp
    await this.userRepo.updateLastLogin(user.id);

    // Remove passwordHash from response
    const { passwordHash, ...userWithoutPassword } = user;

    log.info("User logged in successfully", { userId: user.id, email: user.email });

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Register new user (Admin only in production)
   */
  async register(request: RegisterRequest): Promise<User> {
    const { username, email, password, role, firstName, lastName, orgId } = request;

    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new ValidationError("User with this email already exists");
    }

    // Validate password strength
    this.validatePassword(password);

    // Hash password
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    // Create user
    const user = await this.userRepo.create({
      username,
      email,
      passwordHash,
      role,
      firstName,
      lastName,
    });

    log.info("User registered successfully", { userId: user.id, email: user.email, role: user.role });

    return user;
  }

  /**
   * Logout user (revoke session)
   */
  async logout(accessToken: string): Promise<void> {
    try {
      // Revoke session
      await this.sessionRepo.revokeByToken(accessToken);
      log.info("User logged out successfully", { token: accessToken.substring(0, 10) + "..." });
    } catch (error) {
      // Don't throw error if session doesn't exist (already logged out)
      log.warn("Logout: session not found or already revoked");
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(request: RefreshTokenRequest, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const { refreshToken } = request;

    // Verify refresh token
    const payload = this.verifyToken(refreshToken, "refresh");

    // Check if refresh token is revoked
    const session = await this.sessionRepo.findByRefreshToken(refreshToken);
    if (!session || session.isRevoked || new Date() > session.refreshExpiresAt!) {
      throw new UnauthorizedError("Refresh token is invalid or expired");
    }

    // Get user
    const user = await this.userRepo.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("User not found or inactive");
    }

    // Revoke old session
    await this.sessionRepo.revokeByRefreshToken(refreshToken);

    // Generate new tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    log.info("Token refreshed successfully", { userId: user.id });

    return tokens;
  }

  /**
   * Get user from access token
   */
  async getUserFromToken(accessToken: string): Promise<User> {
    const payload = this.verifyToken(accessToken, "access");

    // Check if session is still valid
    const session = await this.sessionRepo.findByToken(accessToken);
    if (!session || session.isRevoked || new Date() > session.expiresAt) {
      throw new UnauthorizedError("Session is invalid or expired");
    }

    const user = await this.userRepo.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("User not found or inactive");
    }

    return user;
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: User, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    };

    // Calculate expiration times
    const expiresIn = this.parseExpiration(env.JWT_EXPIRATION);
    const refreshExpiresIn = this.parseExpiration(env.JWT_REFRESH_EXPIRATION);

    // Generate access token (short-lived)
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn, // in seconds
    });

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: refreshExpiresIn, // in seconds
    });

    // Store session in database
    await this.sessionRepo.create({
      userId: user.id,
      token: accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      refreshExpiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      refreshExpiresIn,
    };
  }

  /**
   * Verify JWT token
   */
  private verifyToken(token: string, type: "access" | "refresh"): JWTPayload {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new UnauthorizedError(`${type === "access" ? "Access" : "Refresh"} token has expired`);
      }
      throw new UnauthorizedError(`Invalid ${type} token`);
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      throw new ValidationError("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      throw new ValidationError("Password must contain at least one lowercase letter");
    }

    if (!/[0-9]/.test(password)) {
      throw new ValidationError("Password must contain at least one number");
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new ValidationError("Password must contain at least one special character");
    }
  }

  /**
   * Parse expiration string to seconds
   */
  private parseExpiration(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      case "d":
        return value * 86400;
      default:
        return 3600;
    }
  }
}

