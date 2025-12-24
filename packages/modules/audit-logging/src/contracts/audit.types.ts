/**
 * Audit Event Types
 * Defines the structure for audit logging events
 */

export interface AuditEvent {
  orgId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown | null;
  after?: unknown | null;
}

