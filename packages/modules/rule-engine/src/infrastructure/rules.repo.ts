import type { RuleSet } from "../contracts/rules.types";
import { getPrisma } from "../../../../core/src/db/prisma";

export interface RuleSetRepo {
  getLatest(orgId: string): Promise<RuleSet | null>;
  getByVersion(orgId: string, version: number): Promise<RuleSet | null>;
  saveNewVersion(orgId: string, ruleSet: RuleSet, createdBy?: string): Promise<{ version: number }>;
}

export class PrismaRuleSetRepo implements RuleSetRepo {
  async getLatest(orgId: string): Promise<RuleSet | null> {
    const prisma = getPrisma();
    const row = await prisma.ruleSetVersion.findFirst({
      where: { orgId },
      orderBy: { version: "desc" },
    });
    if (!row) return null;
    return row.payload as any as RuleSet;
  }

  async getByVersion(orgId: string, version: number): Promise<RuleSet | null> {
    const prisma = getPrisma();
    const row = await prisma.ruleSetVersion.findUnique({
      where: { orgId_version: { orgId, version } },
    });
    if (!row) return null;
    return row.payload as any as RuleSet;
  }

  async saveNewVersion(orgId: string, ruleSet: RuleSet, createdBy?: string): Promise<{ version: number }> {
    const prisma = getPrisma();
    const latest = await prisma.ruleSetVersion.findFirst({
      where: { orgId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const payload: RuleSet = {
      ...ruleSet,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };

    await prisma.ruleSetVersion.create({
      data: {
        orgId,
        version: nextVersion,
        payload: payload as any,
        createdBy: createdBy ?? null,
      },
    });

    return { version: nextVersion };
  }
}
