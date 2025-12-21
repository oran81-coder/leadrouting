import { PrismaClient } from "@prisma/client";

// Singleton Prisma client for API process
let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}
