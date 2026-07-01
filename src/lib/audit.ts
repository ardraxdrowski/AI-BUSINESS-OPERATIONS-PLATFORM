import { prisma } from "./db";

interface AuditLogParams {
  tenantId: string;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: any;
}

/**
 * Global audit logging utility to track state-changing actions.
 * Enforces multi-tenancy and captures actor, action, targets, and metadata.
 */
export async function writeAuditLog({
  tenantId,
  actorId = null,
  action,
  targetType,
  targetId = null,
  metadata = null,
}: AuditLogParams) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        tenantId,
        actorId,
        action,
        targetType,
        targetId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
    return log;
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}
