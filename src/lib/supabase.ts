import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  typeof url === "string" &&
  url.startsWith("http") &&
  typeof anonKey === "string" &&
  anonKey.length > 40;

/**
 * `null` when credentials are absent, so the app runs fully offline on
 * localStorage instead of throwing at import time. Every call site must
 * null-check — see `useAuth` and OrchestrationPage's persistence layer.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    "[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — running in local-only mode. See .env.example.",
  );
}
