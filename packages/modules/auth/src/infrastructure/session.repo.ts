/**
 * Session Repository
 * 
 * Handles database operations for Session entity
 */

import { getPrisma } from "../../../../core/src/db/prisma";
import type { SessionInfo } from "../contracts/auth.types";

export class SessionRepository {
  /**
   * Create new session
   */
  async create(data: {
    userId: string;
    token: string;
    refreshToken: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SessionInfo> {
    const prisma = getPrisma();
    const session = await prisma.session.create({
      data: {
        userId: data.userId,
        token: data.token,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        refreshExpiresAt: data.refreshExpiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    return {
      id: session.id,
      userId: session.userId,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  /**
   * Find session by access token
   */
  async findByToken(token: string): Promise<SessionInfo & { isRevoked: boolean } | null> {
    const prisma = getPrisma();
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session) return null;

    return {
      id: session.id,
      userId: session.userId,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      isRevoked: session.isRevoked,
    };
  }

  /**
   * Find session by refresh token
   */
  async findByRefreshToken(refreshToken: string): Promise<(SessionInfo & { isRevoked: boolean; refreshExpiresAt?: Date }) | null> {
    const prisma = getPrisma();
    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session) return null;

    return {
      id: session.id,
      userId: session.userId,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
      expiresAt: session.expiresAt,
      refreshExpiresAt: session.refreshExpiresAt ?? undefined,
      createdAt: session.createdAt,
      isRevoked: session.isRevoked,
    };
  }

  /**
   * Revoke session by access token
   */
  async revokeByToken(token: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.session.update({
      where: { token },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke session by refresh token
   */
  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.session.update({
      where: { refreshToken },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke all sessions for user
   */
  async revokeAllForUser(userId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.session.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  /**
   * Delete expired sessions (cleanup)
   */
  async deleteExpired(): Promise<number> {
    const prisma = getPrisma();
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  /**
   * List active sessions for user
   */
  async listForUser(userId: string): Promise<SessionInfo[]> {
    const prisma = getPrisma();
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    }));
  }
}

