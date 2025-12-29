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
    const token = String(args.token ?? "").trim();
    
    // If token is empty, delete the credential instead of storing empty token
    if (!token || token.length === 0) {
      await prisma.mondayCredential.deleteMany({ where: { orgId } });
      return;
    }
    
    const tokenEnc = seal(token);

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
    
    // Check if token is actually present and not empty
    try {
      const token = openSealed(row.tokenEnc);
      if (!token || token.trim().length === 0) {
        return { connected: false };
      }
    } catch (err) {
      // If decryption fails, token is invalid
      return { connected: false };
    }
    
    return { connected: true, endpoint: row.endpoint, updatedAt: row.updatedAt.toISOString() };
  }

  async delete(orgId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.mondayCredential.deleteMany({ where: { orgId } });
  }
}
