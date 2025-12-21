import { getPrisma } from "../../../../core/src/db/prisma";
import type { AuditEvent } from "../contracts/audit.types";

function toJsonStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;

  // for objects/arrays/numbers/booleans – store as JSON string
  try {
    return JSON.stringify(value);
  } catch {
    // fallback – never crash audit logging
    return String(value);
  }
}

export class PrismaAuditRepo {
  async log(evt: AuditEvent): Promise<void> {
    const prisma = getPrisma();

    await prisma.auditLog.create({
      data: {
        orgId: evt.orgId,
        actorUserId: evt.actorUserId,
        action: evt.action,
        entityType: evt.entityType,
        entityId: evt.entityId,
        before: toJsonStringOrNull((evt as any).before),
        after: toJsonStringOrNull((evt as any).after),
      },
    });
  }
}
