import jwt from "jsonwebtoken";
import { env } from "../../../../apps/api/src/config/env";

/**
 * JWT Payload structure
 */
export interface JWTPayload {
  userId: string;
  orgId: string;
  email: string;
  role: string;
  sessionId: string;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, "sessionId"> & { sessionId: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRATION,
    issuer: "lead-routing-api",
    audience: "lead-routing-app",
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: { userId: string; sessionId: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRATION,
    issuer: "lead-routing-api",
    audience: "lead-routing-app",
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken<T = JWTPayload>(token: string): T {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      issuer: "lead-routing-api",
      audience: "lead-routing-app",
    }) as T;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

