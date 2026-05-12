import prisma from './prisma';

export const SystemLogger = {
  async logAction(
    actorId: string,
    actorRole: string,
    action: string,
    targetId?: string,
    details?: any
  ) {
    try {
      await prisma.systemAuditLog.create({
        data: {
          actorId,
          actorRole,
          action,
          targetId,
          details,
        },
      });
      console.log(`[AUDIT] User ${actorId} (${actorRole}) performed ${action}`);
    } catch (error) {
      console.error('[AUDIT_ERROR] Failed to write audit log:', error);
    }
  },
};
