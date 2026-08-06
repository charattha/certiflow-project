"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
let supabaseInstance = null;
const getSupabase = (supabaseUrl, serviceRoleKey) => {
    if (supabaseInstance)
        return supabaseInstance;
    const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    supabaseInstance = (0, supabase_js_1.createClient)(cleanUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    return supabaseInstance;
};
exports.getSupabase = getSupabase;
