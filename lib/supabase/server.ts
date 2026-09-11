import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let cached: SupabaseClient | null = null;

/** Anon client for server components (reads through RLS). */
export function supabaseServer(): SupabaseClient {
  if (!cached) {
    cached = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
