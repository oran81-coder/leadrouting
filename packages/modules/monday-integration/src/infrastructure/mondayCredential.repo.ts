import { getPrisma } from "../../../../core/src/db/prisma";
import { openSealed, seal } from "../../../../core/src/crypto/seal";

export type MondayCredentialDTO = {
  orgId: string;
  endpoint: string;
  token: string;
  updatedAt: string;
};

export class PrismaMondayCredentialRepo {
  async upsert(orgId: string, args: { token: string; endpoint?: string }): Promise<void> {
    const prisma = getPrisma();
    const endpoint = args.endpoint && args.endpoint.trim() ? args.endpoint.trim() : "https://api.monday.com/v2";
    const tokenEnc = seal(String(args.token ?? "").trim());

    await prisma.mondayCredential.upsert({
      where: { orgId },
      update: { tokenEnc, endpoint },
      create: { orgId, tokenEnc, endpoint },
    });
  }

  async get(orgId: string): Promise<MondayCredentialDTO | null> {
    const prisma = getPrisma();
    const row = await prisma.mondayCredential.findUnique({ where: { orgId } });
    if (!row) return null;

    return {
      orgId,
      endpoint: row.endpoint,
      token: openSealed(row.tokenEnc),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async status(orgId: string): Promise<{ connected: boolean; endpoint?: string; updatedAt?: string }> {
    const prisma = getPrisma();
    const row = await prisma.mondayCredential.findUnique({ where: { orgId } });
    if (!row) return { connected: false };
    return { connected: true, endpoint: row.endpoint, updatedAt: row.updatedAt.toISOString() };
  }
}
