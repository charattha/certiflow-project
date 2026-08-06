"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemLogger = void 0;
const supabase_1 = require("./supabase");
exports.SystemLogger = {
    logAction(actorId, actorRole, action, targetId, details, env) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supabase = (0, supabase_1.getSupabase)(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
                yield supabase.from('SystemAuditLog').insert({
                    actor_id: actorId,
                    actor_role: actorRole,
                    action,
                    target_id: targetId,
                    details,
                });
                console.log(`[AUDIT] User ${actorId} (${actorRole}) performed ${action}`);
            }
            catch (error) {
                console.error('[AUDIT_ERROR] Failed to write audit log:', error);
            }
        });
    },
};
