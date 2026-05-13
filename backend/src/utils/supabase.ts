import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (supabaseUrl: string, serviceRoleKey: string) => {
  if (supabaseInstance) return supabaseInstance;
  const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
  supabaseInstance = createClient(cleanUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseInstance;
};
