/**
 * User Repository
 * 
 * Handles database operations for User entity
 */

import { getPrisma } from "../../../../core/src/db/prisma";
import type { User, UserWithPassword, UserRole } from "../contracts/auth.types";

const ORG_ID = "org_1"; // Phase 1: single org

export class UserRepository {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: {
        orgId_email: {
          orgId: ORG_ID,
          email,
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      orgId: user.orgId,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as UserRole,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<UserWithPassword | null> {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: {
        orgId_username: {
          orgId: ORG_ID,
          username,
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      orgId: user.orgId,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as UserRole,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      orgId: user.orgId,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Create new user
   */
  async create(data: {
    username: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    const prisma = getPrisma();
    const user = await prisma.user.create({
      data: {
        orgId: ORG_ID,
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: true,
      },
    });

    return {
      id: user.id,
      orgId: user.orgId,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Update user
   */
  async update(
    userId: string,
    data: Partial<{
      username: string;
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
    }>
  ): Promise<User> {
    const prisma = getPrisma();
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return {
      id: user.id,
      orgId: user.orgId,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Delete user (soft delete by setting isActive = false)
   */
  async delete(userId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  /**
   * List all users (for admin)
   */
  async list(): Promise<User[]> {
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where: { orgId: ORG_ID },
      orderBy: { createdAt: "desc" },
    });

    return users.map((user) => ({
      id: user.id,
      orgId: user.orgId,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }
}

