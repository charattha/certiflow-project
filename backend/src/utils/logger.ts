import { getSupabase } from './supabase';

export const SystemLogger = {
  async logAction(
    actorId: string,
    actorRole: string,
    action: string,
    targetId: string | undefined,
    details: any | undefined,
    env: any
  ) {
    try {
      const supabase = getSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('SystemAuditLog').insert({
        actor_id: actorId,
        actor_role: actorRole,
        action,
        target_id: targetId,
        details,
      });
      console.log(`[AUDIT] User ${actorId} (${actorRole}) performed ${action}`);
    } catch (error) {
      console.error('[AUDIT_ERROR] Failed to write audit log:', error);
    }
  },
};
