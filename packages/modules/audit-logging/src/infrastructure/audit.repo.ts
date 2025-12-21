import { getPrisma } from "../../../../core/src/db/prisma";

export interface AuditEvent {
  orgId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

export class PrismaAuditRepo {
  async log(evt: AuditEvent): Promise<void> {
    const prisma = getPrisma();
    await prisma.auditLog.create({
      data: {
        orgId: evt.orgId,
        actorUserId: evt.actorUserId ?? null,
        action: evt.action,
        entityType: evt.entityType,
        entityId: evt.entityId ?? null,
        before: (evt.before ?? null) as any,
        after: (evt.after ?? null) as any,
      },
    });
  }
}
